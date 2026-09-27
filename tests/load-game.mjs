// Loads the pure math section of www/index.html (helpers through
// makeChoices) into a sandbox so it can be tested without a browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");

export function loadMath() {
  const start = html.indexOf("/* ---------- helpers ---------- */");
  const end = html.indexOf("/* ================= MASTERY");
  if (start < 0 || end < 0) throw new Error("math section markers not found in www/index.html");
  const code = html.slice(start, end);
  const ctx = vm.createContext({ S: { mathBand: 1, mastery: {} }, Math });
  return vm.runInContext(`${code}\n;({ MATH_BANDS, MAX_BAND, getBand, generateProblem, makeChoices })`, ctx);
}
