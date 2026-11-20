// The "year in code" receipt: a small thermal printer prints Chris's last 12 months on GitHub.
// Ported from chrislrts/signature (panels.mjs, receiptPrinter); keep the two in step.
// Input: data/contrib.json (GitHub's contribution calendar: counts only, no code, no repo names).
// Usage: node scripts/receipt.mjs → assets/receipt-{dark,light}.svg

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TEAL = "#04a6a8";
const THEMES = {
  dark:  { bg: "#0d1117", ink: "#e8e3d6", line: "#3d444d", body: "#2b3038", paper: "#f1ede4", rim: "#0b0d10" },
  light: { bg: "#ffffff", ink: "#303030", line: "#d1d9e0", body: "#3a3f47", paper: "#ffffff", rim: "#1d1e21" },
};
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
const DAYN = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const r1 = v => Math.round(v * 10) / 10;
const fmt = n => n.toLocaleString("en-US");
// Drawn at w×h; displayed at `dw` px wide (the README sets no width, so phones can swap in a 1px blank).
const svg = (w, h, body, style = "", dw = w) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${dw}" height="${Math.round((h * dw) / w)}"><style>${style}@media (prefers-reduced-motion:reduce){*{animation:none!important}.m,.bk,.cal{opacity:1!important}.w{transform:none!important}.tick{stroke-dashoffset:0!important}}</style>${body}</svg>`;

// A new total below half the stored one almost always means the token cannot see private work.
export const plausible = (prevTotal, nextTotal) => prevTotal === 0 || nextTotal >= prevTotal / 2;

export function stats(viewer) {
  const cc = viewer.contributionsCollection;
  const days = cc.contributionCalendar.weeks.flatMap(w => w.contributionDays);
  const counts = days.map(d => d.contributionCount);
  let best = 0, run = 0;
  counts.forEach(c => { run = c > 0 ? run + 1 : 0; best = Math.max(best, run); });
  let cur = 0, i = counts.length - 1;
  if (counts[i] === 0) i--; // nothing yet today: count back from yesterday
  while (i >= 0 && counts[i] > 0) { cur++; i--; }
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(d => { byDay[d.weekday] += d.contributionCount; });
  return {
    total: cc.contributionCalendar.totalContributions, active: counts.filter(c => c > 0).length, best, cur,
    busiest: DAYN[byDay.indexOf(Math.max(...byDay))], since: viewer.createdAt.slice(0, 4),
    from: days[0].date, to: days[days.length - 1].date, counts,
  };
}

export function printer(theme, S) {
  const th = THEMES[theme];
  const W = 520, PW = 440, px = (W - PW) / 2, slot = 92, PH = 300, H = slot + PH + 20;
  const ink = "#2b2b2b", mute = "#77736b";
  const body = `<g class="pr">
<rect x="${px - 22}" y="14" width="${PW + 44}" height="${slot - 6}" rx="22" fill="${th.body}" stroke="${th.rim}" stroke-width="3"/>
<rect x="${px - 8}" y="24" width="${PW + 16}" height="26" rx="12" fill="#ffffff" opacity=".07"/>
<circle class="led" cx="${px + PW - 6}" cy="37" r="5.5" fill="${TEAL}"/>
<path d="M${px - 4} 37h70" stroke="#ffffff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/>
<rect x="${px - 6}" y="${slot - 10}" width="${PW + 12}" height="8" rx="4" fill="#0b0d10"/>
</g>`;
  const zig = Array.from({ length: 23 }, (_, i) => `${r1(px + PW - (i * PW) / 22)} ${i % 2 ? PH + 8 : PH}`).join("L");
  const rows = [["Contributions, 12 months", fmt(S.total)], ["Days with something shipped", S.active], ["Longest streak", `${S.best} days`], ["Current streak", `${S.cur} days`], ["Busiest day", S.busiest.slice(0, -1)], ["On GitHub since", S.since]];
  let pp = `<path d="M${px} 0H${px + PW}V${PH}L${zig}Z" fill="${th.paper}" stroke="${th.line}" stroke-width="1"/>`;
  pp += `<text x="${px + PW / 2}" y="34" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="4" fill="${ink}">CHRIS LO · YEAR IN CODE</text>`;
  pp += `<text x="${px + PW / 2}" y="54" text-anchor="middle" font-family="${MONO}" font-size="10.5" fill="${mute}">${S.from} → ${S.to}</text>`;
  pp += `<path d="M${px + 22} 68H${px + PW - 22}" stroke="${mute}" stroke-dasharray="3 4"/>`;
  rows.forEach(([k, v], j) => {
    const y = 92 + j * 23, val = String(v);
    pp += `<text x="${px + 22}" y="${y}" font-family="${MONO}" font-size="12.5" fill="${ink}">${k}</text><path d="M${px + 22 + k.length * 7.6 + 8} ${y - 4}H${px + PW - 22 - val.length * 7.6 - 8}" stroke="${mute}" stroke-dasharray="1 4" stroke-linecap="round"/><text x="${px + PW - 22}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="12.5" font-weight="700" fill="${ink}">${val}</text>`;
  });
  pp += `<path d="M${px + 22} 238H${px + PW - 22}" stroke="${mute}" stroke-dasharray="3 4"/>`;
  // barcode: one bar per day, wider on busier days; an empty year prints no bars
  const bx = px + 22, bw = PW - 44, n = S.counts.length, max = Math.max(0, ...S.counts);
  if (max > 0) S.counts.forEach((c, k) => { if (c > 0) pp += `<rect x="${r1(bx + (k * bw) / n)}" y="252" width="${r1(Math.max(0.6, (bw / n) * (0.5 + 1.6 * (c / max))))}" height="30" fill="${ink}"/>`; });
  const feed = 3.4;
  return svg(W, H, `<rect width="${W}" height="${H}" fill="${th.bg}"/>
<defs><clipPath id="out"><rect x="0" y="${slot - 6}" width="${W}" height="${H}"/></clipPath></defs>
<g clip-path="url(#out)"><g transform="translate(0 ${slot - 6})"><g class="feed">${pp}</g></g></g>
${body}`,
  `.feed{transform:translateY(-${PH + 12}px);animation:feed ${feed}s steps(42,end) .5s forwards}
@keyframes feed{to{transform:translateY(0)}}
.pr{animation:buzz .09s linear .5s ${Math.round(feed / 0.09)}}
@keyframes buzz{50%{transform:translate(.6px,-.4px)}}
.led{animation:blink .28s steps(2,start) .5s ${Math.round(feed / 0.28)}}
@keyframes blink{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.feed{transform:none!important}}`, 340);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("../", import.meta.url);
  const viewer = JSON.parse(readFileSync(new URL("data/contrib.json", root))).data.viewer;
  const s = stats(viewer);
  for (const t of ["dark", "light"]) writeFileSync(new URL(`assets/receipt-${t}.svg`, root), printer(t, s));
  console.log(`receipt: ${s.total} contributions, ${s.from} → ${s.to}`);
}
