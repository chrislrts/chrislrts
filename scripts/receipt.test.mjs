import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stats, printer } from "./receipt.mjs";

const viewer = JSON.parse(readFileSync(new URL("./fixtures/contrib.json", import.meta.url))).data.viewer;
const fixture = t => readFileSync(new URL(`./fixtures/receipt-${t}.svg`, import.meta.url), "utf8");

// a calendar of `n` days with the given counts, newest last
function calendar(counts) {
  const start = Date.UTC(2025, 10, 16);
  const days = counts.map((c, i) => ({ date: new Date(start + i * 864e5).toISOString().slice(0, 10), contributionCount: c, weekday: i % 7 }));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  return { login: "x", createdAt: "2017-03-01T00:00:00Z", contributionsCollection: { contributionYears: [2026], contributionCalendar: { totalContributions: counts.reduce((a, b) => a + b, 0), weeks } } };
}

test("stats match the real calendar", () => {
  const s = stats(viewer);
  assert.equal(s.total, 3725);
  assert.equal(s.active, 252);
  assert.equal(s.best, 31);
  assert.equal(s.cur, 21);
  assert.equal(s.busiest, "Mondays");
  assert.equal(s.since, "2017");
});

test("receipt is identical to the approved design", () => {
  const s = stats(viewer);
  assert.equal(printer("dark", s), fixture("dark"));
  assert.equal(printer("light", s), fixture("light"));
});

test("a year with no contributions still draws a valid receipt", () => {
  const out = printer("dark", stats(calendar(Array(371).fill(0))));
  assert.ok(!out.includes("NaN"));
  assert.ok(!out.includes("Infinity"));
  assert.equal(out.match(/<svg/g).length, 1);
  assert.ok(out.trimEnd().endsWith("</svg>"));
});

test("nothing yet today: current streak counts back from yesterday", () => {
  const counts = Array(371).fill(0);
  counts[367] = 2; counts[368] = 1; counts[369] = 4; // today (370) is 0
  assert.equal(stats(calendar(counts)).cur, 3);
});

test("same data, same bytes", () => {
  const s = stats(viewer);
  assert.equal(printer("light", s), printer("light", s));
});

test("a sudden collapse in the total is refused (token can't see private work)", async () => {
  const { plausible } = await import("./receipt.mjs");
  assert.equal(plausible(3725, 12), false);
  assert.equal(plausible(3725, 3500), true);
  assert.equal(plausible(3725, 1900), true);  // a quieter year is fine
  assert.equal(plausible(0, 0), true);        // nothing stored yet
});
