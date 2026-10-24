// Builds every image in assets/ for the profile README.
// Fonts (Archivo, OFL) are embedded so the images look the same everywhere.
//
//   node scripts/build.mjs            all images + live stats (needs GITHUB_TOKEN)
//   MOCK=1 node scripts/build.mjs     sample stats, for previewing locally
//   EMPTY=1 node scripts/build.mjs    stats placeholder shown before the first refresh

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const USER = process.env.GH_USER || "parv15";

// ---------- tokens ----------
const C = {
  bg: "#0F1720",        // deep blue-graphite surface
  line: "#22303D",      // hairlines
  lineSoft: "#1A2530",
  text: "#EAF0F4",
  muted: "#8B9AA7",
  faint: "#5C6B78",
  accent: "#9FE3D0",    // sea glass
  heat: ["#17222C", "#1F4440", "#2F6B60", "#5BA894", "#9FE3D0"],
};
const M = 64;           // left margin shared by every image
const W = 1200;

const font = n => readFileSync(join(ROOT, "scripts/fonts", `archivo-${n}.woff2`)).toString("base64");
const STYLE = `<style>${[["AL", "light"], ["AM", "medium"], ["AT", "text"]]
  .map(([f, n]) => `@font-face{font-family:${f};src:url(data:font/woff2;base64,${font(n)}) format('woff2')}`).join("")}
.l{font-family:AL,Helvetica,Arial,sans-serif}.m{font-family:AM,Helvetica,Arial,sans-serif}.t{font-family:AT,Helvetica,Arial,sans-serif}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svg = (w, h, label, body, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<defs>${STYLE}${defs}</defs>
<rect width="${w}" height="${h}" rx="18" fill="${C.bg}"/>
${body}
</svg>`;
const text = (x, y, s, { cls = "t", size = 16, fill = C.text, anchor = "start", ls = 0, extra = "" } = {}) =>
  `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${ls ? ` letter-spacing="${ls}"` : ""}${extra}>${esc(s)}</text>`;
const heading = (title, sub) => text(M, 72, title, { cls: "l", size: 34, ls: -.5 }) + (sub ? text(M, 102, sub, { size: 15, fill: C.muted }) : "");
const rule = (x1, y, x2, color = C.line) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}"/>`;
const write = (name, s) => { writeFileSync(join(OUT, name), s); console.log("wrote", name, (s.length / 1024).toFixed(1) + "kb"); };

// ---------- hero ----------
function hero() {
  const H = 520, cx = 905, cy = 250, R = 168;
  const tools = ["search", "calendar", "docs", "chat", "CRM", "code"];
  const cycle = 9, slot = 1 / tools.length;
  let graph = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.lineSoft}"/>
<circle cx="${cx}" cy="${cy}" r="${R * .55}" fill="none" stroke="${C.lineSoft}" stroke-dasharray="2 6"/>`;
  tools.forEach((name, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    const x = +(cx + R * Math.cos(a)).toFixed(1), y = +(cy + R * Math.sin(a)).toFixed(1);
    const s = +(i * slot).toFixed(4), mid = +(s + slot * .45).toFixed(4), e = +(s + slot * .9).toFixed(4);
    const lx = +(cx + (R + 26) * Math.cos(a)).toFixed(1), ly = +(cy + (R + 26) * Math.sin(a) + 5).toFixed(1);
    const anchor = Math.abs(Math.cos(a)) < .2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
    graph += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${C.line}"/>
<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${C.accent}" stroke-opacity="0" stroke-width="1.2">
<animate attributeName="stroke-opacity" values="0;0;.55;.55;0;0" keyTimes="0;${s};${(s + .01).toFixed(4)};${e};${Math.min(1, e + .02).toFixed(4)};1" dur="${cycle}s" repeatCount="indefinite"/></line>
<circle cx="${x}" cy="${y}" r="6" fill="${C.bg}" stroke="${C.faint}" stroke-width="1.3"/>
<circle cx="${x}" cy="${y}" r="6" fill="${C.accent}" opacity="0">
<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${mid};${(mid + .005).toFixed(4)};${e};${Math.min(1, e + .02).toFixed(4)};1" dur="${cycle}s" repeatCount="indefinite"/></circle>
${text(lx, ly, name, { size: 14, fill: C.muted, anchor })}
<circle r="3" fill="${C.accent}" opacity="0">
<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${(s + .005).toFixed(4)};${e};${Math.min(1, e + .005).toFixed(4)};1" dur="${cycle}s" repeatCount="indefinite"/>
<animateMotion path="M${cx} ${cy} L${x} ${y} L${cx} ${cy}" dur="${cycle}s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;${s};${e};1" calcMode="linear"/></circle>`;
  });
  graph += `<circle cx="${cx}" cy="${cy}" r="40" fill="${C.accent}" fill-opacity=".08"/>
<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${C.accent}" stroke-opacity=".6">
<animate attributeName="r" values="40;46;40" dur="${cycle / tools.length}s" repeatCount="indefinite"/></circle>
${text(cx, cy + 6, "agent", { cls: "m", size: 16, fill: C.text, anchor: "middle" })}`;

  const reveal = (d) => ` opacity="0"><animate attributeName="opacity" to="1" begin="${d}s" dur=".9s" fill="freeze"/><animateTransform attributeName="transform" type="translate" from="0 12" to="0 0" begin="${d}s" dur=".9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".2 .7 .2 1"/`;
  const facts = [["Focus", "AI agents and MCP"], ["Works in", "TypeScript, Python, React"], ["Status", "Open to collaborate"]];
  const body = `
${text(M, 74, "parv15", { cls: "m", size: 15, fill: C.muted })}
<g${reveal(.1)}>${text(M - 6, 236, "Parv", { cls: "l", size: 128, ls: -3 })}</g>
<g${reveal(.25)}>${text(M - 6, 360, "Mittal", { cls: "l", size: 128, ls: -3 })}</g>
<g${reveal(.45)}>${text(M, 406, "Software engineer, product developer and AI agent engineer.", { size: 19, fill: C.muted })}</g>
${rule(M, 444, 660)}
${facts.map(([k, v], i) => text(M + i * 200, 474, k, { size: 13.5, fill: C.faint }) + text(M + i * 200, 496, v, { size: 15.5 })).join("")}
${graph}`;
  write("hero.svg", svg(W, H, "Parv Mittal — software engineer, product developer and AI agent engineer", body));
}

// ---------- what I do ----------
function work() {
  const H = 380;
  const items = [
    ["Full-stack apps", "Production web apps in React, Next.js, Node.js", "and Python, from the interface to the database."],
    ["AI agents and MCP", "Agents that discover, authorize and call real", "tools through MCP servers and custom providers."],
    ["Integrations", "Search, calendar, email, chat and CRM services", "wired into pipelines that keep working."],
    ["Product engineering", "Requirements and designs turned into software", "that ships and holds up in production."],
  ];
  let body = heading("What I do");
  items.forEach(([t, a, b], i) => {
    const x = M + (i % 2) * 556, y = 150 + Math.floor(i / 2) * 116;
    body += rule(x, y, x + 500) + `<line x1="${x}" y1="${y}" x2="${x + 36}" y2="${y}" stroke="${C.accent}" stroke-width="2"/>`
      + text(x, y + 38, t, { cls: "m", size: 20 }) + text(x, y + 66, a, { size: 15.5, fill: C.muted }) + text(x, y + 88, b, { size: 15.5, fill: C.muted });
  });
  write("work.svg", svg(W, H, "What I do: full-stack apps, AI agents and MCP, integrations, product engineering", body));
}

// ---------- stack ----------
function stack() {
  const rows = [
    ["Languages", ["TypeScript", "JavaScript", "Python", "C++", "HTML", "CSS"]],
    ["Frontend", ["React", "Next.js", "Redux", "Tailwind", "Bootstrap"]],
    ["Backend", ["Node.js", "Express", "FastAPI", "REST APIs"]],
    ["Data", ["MongoDB", "MySQL", "Redis"]],
    ["Shipping", ["Docker", "Git", "GitHub", "Vercel", "Netlify"]],
    ["Agents", ["MCP", "OAuth", "Tool calling", "API integrations"]],
  ];
  const daily = new Set(["TypeScript", "Python", "React", "Next.js", "Node.js", "MCP"]);
  const H = 150 + rows.length * 46 + 36;
  let body = heading("Stack", "Highlighted: what I reach for every day");
  rows.forEach(([cat, items], r) => {
    const y = 160 + r * 46;
    body += rule(M, y - 26, W - M, C.lineSoft) + text(M, y, cat, { size: 15, fill: C.faint });
    items.forEach((it, i) => {
      const x = M + 196 + i * 152, on = daily.has(it);
      body += (on ? `<circle cx="${x - 12}" cy="${y - 5}" r="3" fill="${C.accent}"/>` : "") + text(x, y, it, { size: 16.5, fill: on ? C.text : C.muted });
    });
  });
  write("stack.svg", svg(W, H, `Stack: ${rows.flatMap(r => r[1]).join(", ")}`, body));
}

// ---------- links ----------
function links() {
  const items = [["github", "GitHub", "@parv15"], ["linkedin", "LinkedIn", "parv-mittal"], ["twitter", "Twitter", "@ParvMittal19"], ["instagram", "Instagram", "@parvmittal_15"]];
  for (const [id, name, handle] of items) {
    const w = 282, h = 76;
    const body = text(26, 34, name, { cls: "m", size: 17 }) + text(26, 56, handle, { size: 14, fill: C.muted })
      + `<circle cx="${w - 30}" cy="38" r="13" fill="none" stroke="${C.line}"/><path d="M${w - 34} 42 L${w - 26} 34 M${w - 32} 34 H${w - 26} V40" stroke="${C.accent}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    write(`link-${id}.svg`, svg(w, h, `${name} ${handle}`, body));
  }
}

// ---------- footer ----------
function footer() {
  const H = 84;
  const body = text(M, 50, "Building, learning and shipping, one project at a time.", { size: 16, fill: C.muted })
    + text(W - M, 50, "parv15", { cls: "m", size: 15, fill: C.faint, anchor: "end" });
  write("footer.svg", svg(W, H, "Building, learning and shipping, one project at a time", body));
}

// ---------- stats ----------
const QUERY = `query($login:String!){user(login:$login){followers{totalCount}
repositories(ownerAffiliations:OWNER,isFork:false,first:100,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}
contributionsCollection{totalCommitContributions totalPullRequestContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

let seed = 15;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function sample(empty) {
  const weeks = [], start = Date.now() - 52 * 7 * 864e5;
  for (let w = 0; w < 53; w++) weeks.push({ contributionDays: [...Array(7)].map((_, d) => {
    const r = empty ? 0 : rand();
    return { date: new Date(start + (w * 7 + d) * 864e5).toISOString().slice(0, 10), contributionCount: r < .35 ? 0 : Math.floor(r * r * 14) };
  }) });
  const L = (name, size) => ({ size, node: { name } });
  return { empty, followers: { totalCount: 0 }, repositories: { totalCount: 0, nodes: empty ? [] : [
    { stargazerCount: 0, languages: { edges: [L("TypeScript", 900), L("JavaScript", 500), L("Python", 600)] } },
    { stargazerCount: 0, languages: { edges: [L("C++", 300), L("HTML", 200), L("CSS", 120)] } }] },
    contributionsCollection: { totalCommitContributions: empty ? 0 : 640, totalPullRequestContributions: 0,
      contributionCalendar: { totalContributions: weeks.flatMap(w => w.contributionDays).reduce((a, d) => a + d.contributionCount, 0), weeks } } };
}

async function loadStats() {
  if (process.env.EMPTY) return sample(true);
  if (process.env.MOCK) return sample(false);
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set. Use MOCK=1 for a local preview.");
  const r = await fetch("https://api.github.com/graphql", { method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-build" },
    body: JSON.stringify({ query: QUERY, variables: { login: USER } }) });
  const j = await r.json();
  if (!r.ok || j.errors || !j.data?.user) throw new Error(`GitHub API ${r.status}: ${JSON.stringify(j.errors || j.message || j)}`);
  console.log(`fetched stats for ${USER}: ${j.data.user.contributionsCollection.contributionCalendar.totalContributions} contributions`);
  return j.data.user;
}

function stats(u) {
  const H = 430;
  const cal = u.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap(w => w.contributionDays);
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0, i = days.length - 1;
  if (i >= 0 && !days[i].contributionCount) i--;
  for (; i >= 0 && days[i].contributionCount; i--) current++;
  const lang = new Map();
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) lang.set(e.node.name, (lang.get(e.node.name) || 0) + e.size);
  const langs = [...lang].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lt = langs.reduce((a, [, v]) => a + v, 0) || 1;
  const show = v => u.empty ? "—" : v.toLocaleString("en-US");

  let body = heading("Activity", u.empty ? "Waiting for the first refresh from GitHub" : `From GitHub, updated ${new Date().toISOString().slice(0, 10)}`);
  [[cal.totalContributions, "contributions this year"], [current, "day streak right now"], [longest, "day longest streak"], [u.contributionsCollection.totalCommitContributions, "commits this year"]]
    .forEach(([v, label], k) => {
      const x = M + k * 270;
      body += text(x, 196, show(v), { cls: "l", size: 58, ls: -1.5 }) + text(x, 226, label, { size: 14.5, fill: C.muted });
    });
  body += rule(M, 262, W - M);

  const gx = M, gy = 298, step = 12.4, cell = 9.4;
  const max = Math.max(1, ...days.map(d => d.contributionCount));
  cal.weeks.slice(-53).forEach((w, wi) => w.contributionDays.forEach(d => {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay(), c = d.contributionCount;
    const lvl = !c ? 0 : c / max < .25 ? 1 : c / max < .5 ? 2 : c / max < .8 ? 3 : 4;
    body += `<rect x="${(gx + wi * step).toFixed(1)}" y="${(gy + dow * step).toFixed(1)}" width="${cell}" height="${cell}" rx="2.4" fill="${C.heat[lvl]}"/>`;
  }));
  body += text(gx, gy + 7 * step + 28, "The last 12 months", { size: 13.5, fill: C.faint });

  const lx = 790, lw = W - M - lx;
  body += text(lx, gy + 8, "Languages by code", { size: 13.5, fill: C.faint });
  if (!langs.length) body += text(lx, gy + 40, "Appears after the first refresh", { size: 15, fill: C.muted });
  langs.forEach(([n, v], k) => {
    const y = gy + 32 + k * 21, pct = v / lt;
    body += text(lx, y + 4, n, { size: 14, fill: C.text }) + text(W - M, y + 4, `${Math.round(pct * 100)}%`, { size: 14, fill: C.muted, anchor: "end" })
      + `<rect x="${lx + 110}" y="${y - 2}" width="${lw - 160}" height="3" rx="1.5" fill="${C.heat[0]}"/><rect x="${lx + 110}" y="${y - 2}" width="${((lw - 160) * v / langs[0][1]).toFixed(1)}" height="3" rx="1.5" fill="${k ? C.heat[3] : C.accent}"/>`;
  });

  mkdirSync(join(OUT, "generated"), { recursive: true });
  write("generated/stats.svg", svg(W, H, `GitHub activity: ${cal.totalContributions} contributions this year, ${current} day current streak, ${longest} day longest streak`, body));
}

mkdirSync(OUT, { recursive: true });
hero(); work(); stack(); links(); footer();
stats(await loadStats());
