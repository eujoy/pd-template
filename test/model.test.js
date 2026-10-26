import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseDate } from "../js/model.js";
import { fixture } from "./helpers.js";

test("parseDate accepts real dates and rejects impossible ones", () => {
  assert.deepEqual(parseDate("22-10-2026"), { day: 22, month: 10, year: 2026, weekday: "Thu" });
  assert.equal(parseDate("29-02-2024").weekday, "Thu");
  assert.equal(parseDate("29-02-2026"), null);
  assert.equal(parseDate("2026-10-22"), null);
  assert.equal(parseDate("31-04-2026"), null);
});

test("normalizes the normal day", () => {
  const m = normalize(fixture("day-normal"));
  assert.equal(m.dateText, "Thu · 22-10-2026");
  assert.equal(m.dropped, 0);
  assert.equal(m.statusLabel, null);
  assert.equal(m.sections.length, 4);
  const first = m.sections[0];
  assert.equal(first.heading, "Code review on several pull requests.");
  assert.equal(first.icon, "fa-code-branch");
  assert.equal(first.color, "#3b82f6");
  assert.equal(first.body.length, 1);
  assert.equal(first.body[0].text, "List of pull requests:");
  assert.equal(first.body[0].children.length, 3);
});

test("extra top-level items follow the heading's children in the body", () => {
  const m = normalize({
    v: 1,
    d: "01-01-2026",
    sec: [{ i: [{ t: "head", c: [{ t: "child" }] }, { t: "second top level" }] }],
  });
  assert.deepEqual(
    m.sections[0].body.map((i) => i.text),
    ["child", "second top level"],
  );
});

test("reports dropped items and day status", () => {
  assert.equal(normalize(fixture("day-truncated")).dropped, 7);
  const off = normalize(fixture("day-off"));
  assert.equal(off.statusLabel, "Day off");
  assert.equal(off.sections.length, 0);
  assert.equal(normalize({ v: 1, d: "01-01-2026", s: 2 }).statusLabel, "Out sick");
  assert.equal(normalize({ v: 1, d: "01-01-2026", s: 3 }).statusLabel, "Public holiday");
});

test("skips empty sections and falls back for a bad icon or color", () => {
  const m = normalize({
    v: 1,
    d: "01-01-2026",
    sec: [{ i: [] }, { ic: "javascript:alert(1)", c: "red", i: [{ t: "x" }] }],
  });
  assert.equal(m.sections.length, 1);
  assert.equal(m.sections[0].icon, "fa-list");
  assert.equal(m.sections[0].color, "#999999");
});

test("a newer version is reported as newer", () => {
  assert.throws(() => normalize({ v: 2, d: "01-01-2026" }), { code: "newer" });
});

test("rejects damaged payloads", () => {
  const bad = [
    null,
    [],
    "x",
    {},
    { v: 0, d: "01-01-2026" },
    { v: "1", d: "01-01-2026" },
    { v: 1 },
    { v: 1, d: "32-01-2026" },
    { v: 1, d: "01-01-2026", s: 9 },
    { v: 1, d: "01-01-2026", x: -1 },
    { v: 1, d: "01-01-2026", t: "yesterday" },
    { v: 1, d: "01-01-2026", sec: "nope" },
    { v: 1, d: "01-01-2026", sec: [{ i: [{ t: 5 }] }] },
    { v: 1, d: "01-01-2026", sec: [{ i: [{ t: "a".repeat(2001) }] }] },
  ];
  for (const raw of bad) assert.throws(() => normalize(raw), { code: "invalid" }, JSON.stringify(raw));
});

test("rejects items nested too deeply", () => {
  let item = { t: "leaf" };
  for (let i = 0; i < 10; i++) item = { t: "n", c: [item] };
  assert.throws(() => normalize({ v: 1, d: "01-01-2026", sec: [{ i: [item] }] }), { code: "invalid" });
});

test("rejects more items than the limit", () => {
  const items = Array.from({ length: 5001 }, () => ({ t: "x" }));
  assert.throws(() => normalize({ v: 1, d: "01-01-2026", sec: [{ i: items }] }), { code: "invalid" });
});
