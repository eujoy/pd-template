// Validates the decoded payload and turns it into what the view renders.
// The payload format is documented in docs/PAYLOAD.md.

export const SUPPORTED_VERSION = 1;

const MAX_SECTIONS = 200;
const MAX_ITEMS = 5000;
const MAX_DEPTH = 6;
const MAX_TEXT = 2000;
const DEFAULT_ICON = "fa-list";
const DEFAULT_COLOR = "#999999";

export const STATUS_LABELS = { 1: "Day off", 2: "Out sick", 3: "Public holiday" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class PayloadError extends Error {
  // code: "invalid" (damaged or unreadable), "newer" (made by a newer app), "unsupported" (browser)
  constructor(code, message) {
    super(message);
    this.name = "PayloadError";
    this.code = code;
  }
}

function invalid(message) {
  return new PayloadError("invalid", message);
}

export function parseDate(text) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { day, month, year, weekday: WEEKDAYS[d.getUTCDay()] };
}

function normalizeItems(list, depth, budget) {
  if (!Array.isArray(list)) throw invalid("items must be a list");
  if (depth > MAX_DEPTH) throw invalid("items nest too deeply");
  return list.map((item) => {
    if (!item || typeof item !== "object" || typeof item.t !== "string") throw invalid("bad item");
    if (item.t.length > MAX_TEXT) throw invalid("item text too long");
    if (--budget.left < 0) throw invalid("too many items");
    const children = item.c === undefined ? [] : normalizeItems(item.c, depth + 1, budget);
    return { text: item.t, children };
  });
}

function normalizeSection(raw, budget) {
  if (!raw || typeof raw !== "object") throw invalid("bad section");
  const items = normalizeItems(raw.i ?? [], 0, budget);
  if (items.length === 0) return null;
  const icon = typeof raw.ic === "string" && /^fa-[a-z0-9-]+$/.test(raw.ic) ? raw.ic : DEFAULT_ICON;
  const color = typeof raw.c === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.c) ? raw.c : DEFAULT_COLOR;
  // The first item is the card heading. Its children come first in the body,
  // followed by any further top-level items.
  const [head, ...rest] = items;
  return { icon, color, heading: head.text, body: [...head.children, ...rest] };
}

export function normalize(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("payload is not an object");
  if (!Number.isInteger(raw.v) || raw.v < 1) throw invalid("missing version");
  if (raw.v > SUPPORTED_VERSION) throw new PayloadError("newer", "payload version " + raw.v);

  const date = typeof raw.d === "string" ? parseDate(raw.d) : null;
  if (!date) throw invalid("bad date");

  const status = raw.s === undefined ? 0 : raw.s;
  if (!Number.isInteger(status) || status < 0 || status > 3) throw invalid("bad status");
  const dropped = raw.x === undefined ? 0 : raw.x;
  if (!Number.isInteger(dropped) || dropped < 0) throw invalid("bad dropped count");

  let snapshotAt = null;
  if (raw.t !== undefined) {
    const t = typeof raw.t === "string" ? new Date(raw.t) : null;
    if (!t || Number.isNaN(t.getTime())) throw invalid("bad snapshot time");
    snapshotAt = t;
  }

  const rawSections = raw.sec === undefined ? [] : raw.sec;
  if (!Array.isArray(rawSections) || rawSections.length > MAX_SECTIONS) throw invalid("bad sections");
  const budget = { left: MAX_ITEMS };
  const sections = rawSections.map((s) => normalizeSection(s, budget)).filter(Boolean);

  return {
    dateText: `${date.weekday} · ${String(date.day).padStart(2, "0")}-${String(date.month).padStart(2, "0")}-${date.year}`,
    status,
    statusLabel: STATUS_LABELS[status] ?? null,
    dropped,
    snapshotAt,
    sections,
  };
}
