// A tiny inline markdown reader for item text: links, `code`, **bold**, *italic*.
// It returns tokens, never HTML, so payload text cannot inject markup.
// Only http(s) links and the backend's safe reference span are recognised; other markup stays text.

const INLINE =
  /<span title="ref:(?<spanIcon>fa-[a-z0-9-]+)">(?<spanText>[^<>]*)<\/span>|\[(?<linkText>[^\]]*)\]\((?<linkHref>https?:\/\/[^\s)]+)(?:\s+"(?<linkTitle>[^"]*)")?\)|`(?<code>[^`]+)`|\*\*(?<strong>[^*]+)\*\*|\*(?<em>[^*]+)\*/g;

const HTML_ENTITIES = Object.freeze({ amp: "&", lt: "<", gt: ">", "#34": '"', "#39": "'" });

function decodeReferenceText(text) {
  return text.replace(/&(amp|lt|gt|#34|#39);/g, (entity) => HTML_ENTITIES[entity.slice(1, -1)]);
}

export function tokenize(text) {
  const tokens = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) tokens.push({ type: "text", text: text.slice(last, m.index) });
    const groups = m.groups;
    if (groups.spanIcon !== undefined) {
      tokens.push({ type: "reference", text: decodeReferenceText(groups.spanText), icon: groups.spanIcon });
    } else if (groups.linkHref !== undefined) {
      const ref = /^ref:(fa-[a-z0-9-]+)$/.exec(groups.linkTitle ?? "");
      tokens.push({ type: "link", text: groups.linkText || groups.linkHref, href: groups.linkHref, icon: ref ? ref[1] : null });
    } else if (groups.code !== undefined) {
      tokens.push({ type: "code", text: groups.code });
    } else if (groups.strong !== undefined) {
      tokens.push({ type: "strong", text: groups.strong });
    } else {
      tokens.push({ type: "em", text: groups.em });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last) });
  return tokens;
}
