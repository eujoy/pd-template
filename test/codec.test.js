import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFragment } from "../js/codec.js";
import { encodeFragment, fixture, goldenFragment } from "./helpers.js";

const NAMES = ["day-normal", "day-truncated", "day-off"];

for (const name of NAMES) {
  test(`golden fragment from another deflate encoder decodes: ${name}`, async () => {
    assert.deepEqual(await decodeFragment("#" + goldenFragment(name)), fixture(name));
  });

  test(`round trip: ${name}`, async () => {
    assert.deepEqual(await decodeFragment("#" + (await encodeFragment(fixture(name)))), fixture(name));
  });
}

test("no fragment means first launch", async () => {
  assert.equal(await decodeFragment(""), null);
  assert.equal(await decodeFragment("#"), null);
  assert.equal(await decodeFragment(undefined), null);
});

test("rejects a missing or malformed version tag", async () => {
  for (const hash of ["#abc", "#x1.abc", "#v.abc", "#v1abc", "#v0.abc"]) {
    await assert.rejects(decodeFragment(hash), { code: "invalid" }, hash);
  }
});

test("a newer version is reported as newer, not invalid", async () => {
  await assert.rejects(decodeFragment("#v2.whatever"), { code: "newer" });
});

test("rejects data that is not base64url", async () => {
  await assert.rejects(decodeFragment("#v1.not base64!"), { code: "invalid" });
  await assert.rejects(decodeFragment("#v1."), { code: "invalid" });
});

test("rejects bytes that are not deflate", async () => {
  await assert.rejects(decodeFragment("#v1.AAAAAAAAAAAA"), { code: "invalid" });
});

test("rejects deflated data that is not JSON", async () => {
  await assert.rejects(decodeFragment("#" + (await encodeFragment("not json"))), { code: "invalid" });
});

test("rejects a payload that inflates beyond the size limit", async () => {
  const huge = JSON.stringify({ v: 1, pad: "a".repeat(1024 * 1024) });
  await assert.rejects(decodeFragment("#" + (await encodeFragment(huge))), { code: "invalid" });
});
