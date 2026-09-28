// Loads the pure math section of www/index.html (helpers through
// makeChoices) into a sandbox so it can be tested without a browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");

/* Loads the code between two marker strings in www/index.html and returns
   the named top-level bindings. */
export function loadSection(startMarker, endMarker, names) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`markers not found: ${startMarker} .. ${endMarker}`);
  const ctx = vm.createContext({ Math });
  return vm.runInContext(`${html.slice(start, end)}\n;({ ${names.join(", ")} })`, ctx);
}

export function loadMath() {
  const start = html.indexOf("/* ---------- helpers ---------- */");
  const end = html.indexOf("/* ================= MASTERY");
  if (start < 0 || end < 0) throw new Error("math section markers not found in www/index.html");
  const code = html.slice(start, end);
  const ctx = vm.createContext({ S: { mathBand: 1, mastery: {} }, Math });
  return vm.runInContext(`${code}\n;({ MATH_BANDS, MAX_BAND, getBand, generateProblem, makeChoices, applyForm, factOf })`, ctx);
}
