// A tiny inline markdown reader for item text: links, `code`, **bold**, *italic*.
// It returns tokens, never HTML, so payload text cannot inject markup.
// Only http(s) links are recognised; anything else stays plain text.

const INLINE =
  /\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function tokenize(text) {
  const tokens = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) tokens.push({ type: "text", text: text.slice(last, m.index) });
    if (m[2] !== undefined) {
      const ref = /^ref:(fa-[a-z0-9-]+)$/.exec(m[3] ?? "");
      tokens.push({ type: "link", text: m[1] || m[2], href: m[2], icon: ref ? ref[1] : null });
    } else if (m[4] !== undefined) {
      tokens.push({ type: "code", text: m[4] });
    } else if (m[5] !== undefined) {
      tokens.push({ type: "strong", text: m[5] });
    } else {
      tokens.push({ type: "em", text: m[6] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last) });
  return tokens;
}
