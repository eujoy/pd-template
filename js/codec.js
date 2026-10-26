// Turns the URL fragment ("#v1.<base64url of deflate-raw JSON>") into the payload object.
// Everything stays in the browser: nothing here touches the network.

import { PayloadError, SUPPORTED_VERSION } from "./model.js";

const MAX_INFLATED_BYTES = 256 * 1024;

function invalid(message) {
  return new PayloadError("invalid", message);
}

function base64urlToBytes(text) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw invalid("not base64url");
  const std = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw invalid("not base64url");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new PayloadError("unsupported", "DecompressionStream is not available");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_INFLATED_BYTES) {
        await reader.cancel();
        throw invalid("payload too large");
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof PayloadError) throw err;
    throw invalid("cannot inflate");
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// Returns null when there is no payload at all (first launch), the parsed
// object otherwise, and throws PayloadError for anything unreadable.
export async function decodeFragment(hash) {
  const text = (hash ?? "").replace(/^#/, "");
  if (text === "") return null;
  const m = /^v(\d+)\.(.*)$/.exec(text);
  if (!m) throw invalid("missing version tag");
  if (Number(m[1]) > SUPPORTED_VERSION) throw new PayloadError("newer", "payload version " + m[1]);
  if (Number(m[1]) < 1) throw invalid("bad version tag");
  const bytes = await inflateRaw(base64urlToBytes(m[2]));
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw invalid("not JSON");
  }
}
