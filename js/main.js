import { decodeFragment } from "./codec.js";
import { normalize, PayloadError } from "./model.js";
import { renderDay, renderMessage } from "./view.js";

const root = document.getElementById("app");

const MESSAGES = {
  first: {
    iconName: "fa-calendar-check",
    color: "#10b981",
    title: ["Scan a day", "from your Mac."],
    lines: [
      { text: "Open a day on the Mac, tap the phone button, and point your camera at the code." },
    ],
    action: {
      label: "How to add to Home Screen",
      help: "In Safari, tap the Share button, then Add to Home Screen. Scanning a code still opens this page in the browser.",
    },
  },
  invalid: {
    iconName: "fa-triangle-exclamation",
    color: "#f59e0b",
    title: ["This code", "can't be read."],
    lines: [
      {
        text: "It looks damaged. Make a new code on the Mac and scan it again.",
      },
    ],
  },
  newer: {
    iconName: "fa-triangle-exclamation",
    color: "#f59e0b",
    title: ["This code needs", "a newer viewer."],
    lines: [
      {
        text: "It was made by a newer version of the app. Reload this page while online to update the viewer, then scan again.",
      },
    ],
  },
  unsupported: {
    iconName: "fa-triangle-exclamation",
    color: "#f59e0b",
    title: ["This browser", "is too old."],
    lines: [{ text: "Update the browser (iOS 16.4 or later, or a recent Chrome) and scan again." }],
  },
};

async function show() {
  try {
    const raw = await decodeFragment(location.hash);
    if (raw === null) {
      const message = structuredClone(MESSAGES.first);
      if (document.body.classList.contains("offline-ready")) {
        message.lines.push({ text: "Ready to work offline.", ok: true });
      }
      renderMessage(root, message);
      return;
    }
    renderDay(root, normalize(raw));
  } catch (err) {
    const code = err instanceof PayloadError ? err.code : "invalid";
    renderMessage(root, MESSAGES[code] ?? MESSAGES.invalid);
  }
}

window.addEventListener("hashchange", show);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      document.body.classList.add("offline-ready");
      if (!location.hash.replace("#", "")) show();
    })
    .catch(() => {});
}

show();
