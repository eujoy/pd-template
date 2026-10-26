import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "../js/markdown.js";

test("plain text is one token", () => {
  assert.deepEqual(tokenize("hello"), [{ type: "text", text: "hello" }]);
});

test("links keep their reference icon", () => {
  assert.deepEqual(tokenize('See [PR #1](https://example.com/1 "ref:fa-code-pull-request") now'), [
    { type: "text", text: "See " },
    { type: "link", text: "PR #1", href: "https://example.com/1", icon: "fa-code-pull-request" },
    { type: "text", text: " now" },
  ]);
});

test("a link without a title has no icon", () => {
  assert.deepEqual(tokenize("[a](http://x.test)"), [{ type: "link", text: "a", href: "http://x.test", icon: null }]);
});

test("code, bold and italic", () => {
  assert.deepEqual(tokenize("`a` **b** *c*"), [
    { type: "code", text: "a" },
    { type: "text", text: " " },
    { type: "strong", text: "b" },
    { type: "text", text: " " },
    { type: "em", text: "c" },
  ]);
});

test("only http(s) links are links", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd"]) {
    const tokens = tokenize(`[x](${url})`);
    assert.ok(
      tokens.every((t) => t.type === "text"),
      url,
    );
  }
});

test("markup in text stays text", () => {
  assert.deepEqual(tokenize("<img src=x onerror=alert(1)>"), [{ type: "text", text: "<img src=x onerror=alert(1)>" }]);
});

test("an unsafe icon name in the title is ignored", () => {
  const [t] = tokenize('[a](https://x.test "ref:fa-x onclick=1")');
  assert.equal(t.icon, null);
});
