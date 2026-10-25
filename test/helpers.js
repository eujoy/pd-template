import { readFileSync } from "node:fs";

export function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

export function goldenFragment(name) {
  return readFileSync(new URL(`./fixtures/${name}.fragment.txt`, import.meta.url), "utf8").trim();
}

// Mirrors what the Go encoder must produce: deflate-raw, base64url without padding, "v1." tag.
export async function encodeFragment(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  return "v1." + Buffer.from(out).toString("base64url");
}
