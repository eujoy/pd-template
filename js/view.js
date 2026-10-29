// Builds the page with DOM calls only (createElement/textContent): payload text never becomes markup.

import { tokenize } from "./markdown.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name, extra) {
  return el("i", "fa-solid " + name + (extra ? " " + extra : ""));
}

function inline(parent, text) {
  for (const t of tokenize(text)) {
    if (t.type === "text") {
      parent.append(document.createTextNode(t.text));
    } else if (t.type === "link") {
      const a = el("a");
      a.href = t.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (t.icon) a.append(icon(t.icon));
      a.append(document.createTextNode(t.text));
      parent.append(a);
    } else if (t.type === "reference") {
      parent.append(icon(t.icon, "ref__icon"), document.createTextNode(t.text));
    } else {
      parent.append(el({ code: "code", strong: "strong", em: "em" }[t.type], "", t.text));
    }
  }
}

function list(items) {
  const ul = el("ul");
  for (const item of items) {
    const li = el("li");
    inline(li, item.text);
    if (item.children.length > 0) li.append(list(item.children));
    ul.append(li);
  }
  return ul;
}

function card(section) {
  const wrap = el("section", "card");
  wrap.style.setProperty("--c", section.color);
  const hasBody = section.body.length > 0;
  const head = el(hasBody ? "button" : "div", "card-h");
  if (hasBody) {
    head.type = "button";
    head.setAttribute("aria-expanded", "true");
  }
  head.append(icon(section.icon, "t"));
  const title = el("strong");
  inline(title, section.heading);
  head.append(title);
  wrap.append(head);
  if (hasBody) {
    head.append(icon("fa-chevron-down", "chev"));
    const body = list(section.body);
    wrap.append(body);
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      body.hidden = open;
      wrap.classList.toggle("closed", open);
    });
  }
  return wrap;
}

function formatSnapshot(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function header(model) {
  const bar = el("header", "head");
  bar.append(el("h1", "", model.dateText));
  const meta = el("span", "ro");
  meta.setAttribute("aria-label", "Read-only snapshot");
  meta.append(icon("fa-lock"));
  if (model.snapshotAt) meta.append(el("span", "", formatSnapshot(model.snapshotAt)));
  const ok = icon("fa-circle-check", "ok");
  ok.title = "Works offline";
  meta.append(ok);
  bar.append(meta);
  return bar;
}

export function renderDay(root, model) {
  const view = el("div", "view");
  view.append(header(model));
  if (model.dropped > 0) {
    const n = model.dropped;
    const notice = el("p", "notice");
    notice.setAttribute("role", "note");
    notice.append(
      icon("fa-scissors"),
      el(
        "span",
        "",
        `Shortened to fit the QR code: ${n} ${n === 1 ? "item" : "items"} on the deepest levels ${n === 1 ? "is" : "are"} not shown. The Mac has the full day.`,
      ),
    );
    view.append(notice);
  }
  if (model.statusLabel) {
    const off = el("div", "card off");
    const head = el("div", "card-h");
    head.append(icon("fa-umbrella-beach", "t"), el("strong", "", model.statusLabel));
    off.append(head);
    view.append(off);
  }
  for (const section of model.sections) view.append(card(section));
  if (!model.statusLabel && model.sections.length === 0) {
    view.append(el("p", "empty", "Nothing was logged on this day."));
  }
  root.replaceChildren(view);
  document.title = model.dateText;
}

export function renderMessage(root, { iconName, color, title, lines, action }) {
  const box = el("div", "center");
  const i = icon(iconName, "big");
  i.style.setProperty("color", color);
  box.append(i);
  const h = el("h1");
  title.forEach((part, idx) => {
    if (idx > 0) h.append(el("br"));
    h.append(document.createTextNode(part));
  });
  box.append(h);
  for (const line of lines) box.append(el("p", line.ok ? "good" : "", line.text));
  if (action) {
    const btn = el("button", "btn", action.label);
    btn.type = "button";
    const help = el("p", "help", action.help);
    help.hidden = true;
    btn.addEventListener("click", () => {
      help.hidden = !help.hidden;
    });
    box.append(btn, help);
  }
  root.replaceChildren(box);
  document.title = "Daily Activity";
}
