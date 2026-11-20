// Fetches the last 12 months of GitHub's contribution calendar (counts only) into data/contrib.json.
// Needs CONTRIB_TOKEN: a token with read:user only. Writes nothing unless the answer is complete.

import { writeFileSync } from "node:fs";

const QUERY = `{ viewer { login createdAt contributionsCollection {
  totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions
  restrictedContributionsCount contributionYears
  contributionCalendar { totalContributions weeks { contributionDays { date contributionCount weekday } } } } } }`;

function fail(msg) { console.error(`fetch-contrib: ${msg}`); process.exit(1); }

const token = process.env.CONTRIB_TOKEN;
if (!token) fail("CONTRIB_TOKEN is not set");

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-receipt" },
  body: JSON.stringify({ query: QUERY }),
});
if (!res.ok) fail(`GitHub answered ${res.status}`);
const json = await res.json();
if (json.errors) fail(json.errors.map(e => e.message).join("; "));
const weeks = json.data?.viewer?.contributionsCollection?.contributionCalendar?.weeks;
if (!Array.isArray(weeks) || weeks.length === 0) fail("no contribution weeks in the answer");

writeFileSync(new URL("../data/contrib.json", import.meta.url), JSON.stringify(json));
console.log(`fetch-contrib: ${weeks.length} weeks`);
