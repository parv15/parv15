// Builds every image in assets/ — a modular-synth rack, drawn as SVG.
// Fonts (Archivo, OFL) are embedded so the images render the same everywhere.
//
//   node scripts/build.mjs            static panels + live stats (needs GITHUB_TOKEN)
//   MOCK=1 node scripts/build.mjs     sample stats, for previewing locally
//   EMPTY=1 node scripts/build.mjs    zeroed stats placeholder

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const USER = process.env.GH_USER || "parv15";

// ---------- tokens ----------
const C = {
  alu: "#C9C9C2", aluHi: "#E4E4DD", aluLo: "#8E8E87",
  ink: "#000000", inkSoft: "#4A4A46",
  rail: "#34342F",
  red: "#C8372D", mustard: "#E3AE2A", blue: "#2B54A6", green: "#3C8D5A", white: "#EDEDE6",
  window: "#16140F",
  led: ["#3A2520", "#6E2619", "#A8321F", "#E2452D", "#FF7A5C"],
};

const font = n => readFileSync(join(ROOT, "scripts/fonts", `archivo-${n}.woff2`)).toString("base64");
const FONT_CSS = [["AD", "display"], ["AC", "cond"], ["ACB", "condbold"], ["AT", "text"]]
  .map(([fam, f]) => `@font-face{font-family:${fam};src:url(data:font/woff2;base64,${font(f)}) format('woff2')}`).join("");
const STYLE = `<style>${FONT_CSS}
.d{font-family:AD,Arial Black,sans-serif}.c{font-family:AC,Arial Narrow,sans-serif}.cb{font-family:ACB,Arial Narrow,sans-serif}.t{font-family:AT,Arial,sans-serif}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;

// ---------- helpers ----------
let seed = 15;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const shade = (hex, k) => "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");

function svg(w, h, label, body, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<defs>${STYLE}
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
<radialGradient id="screw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#E6E6E0"/><stop offset="1" stop-color="#76766F"/></radialGradient>
<pattern id="brush" width="400" height="9" patternUnits="userSpaceOnUse">${brushLines()}</pattern>
${extraDefs}</defs>
${body}
</svg>`;
}

function brushLines() {
  let s = "";
  for (let y = 0; y < 9; y += 1.5) {
    const x = Math.floor(rand() * 300), w = 80 + Math.floor(rand() * 300);
    s += `<rect x="${x}" y="${y}" width="${w}" height=".6" fill="${rand() > .5 ? "#fff" : "#000"}" opacity="${(.04 + rand() * .06).toFixed(3)}"/>`;
  }
  return s;
}

function screw(x, y) {
  const a = Math.floor(rand() * 180);
  return `<circle cx="${x}" cy="${y}" r="6.5" fill="url(#screw)" stroke="#5E5E58" stroke-width=".8"/>
<line x1="${x - 4}" y1="${y}" x2="${x + 4}" y2="${y}" stroke="#4A4A45" stroke-width="1.6" transform="rotate(${a} ${x} ${y})"/>`;
}

function panel(x, y, w, h, { screws = true } = {}) {
  return `<g>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${C.alu}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#brush)"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#sheen)"/>
<rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="2.5" fill="none" stroke="${C.aluHi}"/>
<path d="M${x + 3} ${y + h - .5} H${x + w - 3} M${x + w - .5} ${y + 3} V${y + h - 3}" stroke="${C.aluLo}"/>
${screws ? screw(x + 14, y + 14) + screw(x + w - 14, y + 14) + screw(x + 14, y + h - 14) + screw(x + w - 14, y + h - 14) : ""}
</g>`;
}

function rail(x, y, w, h = 20) {
  let holes = "";
  for (let i = x + 20; i < x + w - 10; i += 40) holes += `<rect x="${i}" y="${y + h / 2 - 3}" width="14" height="6" rx="3" fill="#1F1F1B"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.rail}"/><rect x="${x}" y="${y}" width="${w}" height="1" fill="#55554F"/>${holes}`;
}

function jack(x, y, label, { labelPos = "below", size = 1 } = {}) {
  const r = 12 * size, pts = [...Array(6)].map((_, i) => {
    const a = Math.PI / 6 + i * Math.PI / 3;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const lbl = !label ? "" : labelPos === "below"
    ? `<text x="${x}" y="${y + 30 * size}" text-anchor="middle" class="c" font-size="14" fill="${C.ink}">${esc(label)}</text>`
    : `<text x="${x}" y="${y - 20 * size}" text-anchor="middle" class="c" font-size="14" fill="${C.ink}">${esc(label)}</text>`;
  return `<g><polygon points="${pts}" fill="#B6B6AF" stroke="#6A6A64" stroke-width=".9"/>
<circle cx="${x}" cy="${y}" r="${8 * size}" fill="#2A2A27"/><circle cx="${x}" cy="${y}" r="${5 * size}" fill="#000"/>${lbl}</g>`;
}

function plug(x, y, color) {
  return `<circle cx="${x}" cy="${y}" r="10.5" fill="${shade(color, .62)}"/><circle cx="${x}" cy="${y}" r="8" fill="${color}"/>
<circle cx="${x - 2.5}" cy="${y - 2.5}" r="2.5" fill="#fff" opacity=".35"/>`;
}

const cablePath = (x1, y1, x2, y2, sag) => `M${x1} ${y1} C${x1} ${y1 + sag}, ${x2} ${y2 + sag}, ${x2} ${y2}`;

function cable(x1, y1, x2, y2, color, sag = 60, anim = "") {
  const d = cablePath(x1, y1, x2, y2, sag);
  return `<g fill="none" stroke-linecap="round">
<path d="${d}" stroke="#000" stroke-opacity=".18" stroke-width="9" transform="translate(2 5)" pathLength="1"${anim ? ` stroke-dasharray="1 1" stroke-dashoffset="1"` : ""}>${anim}</path>
<path d="${d}" stroke="${shade(color, .6)}" stroke-width="8.5" pathLength="1"${anim ? ` stroke-dasharray="1 1" stroke-dashoffset="1"` : ""}>${anim}</path>
<path d="${d}" stroke="${color}" stroke-width="6" pathLength="1"${anim ? ` stroke-dasharray="1 1" stroke-dashoffset="1"` : ""}>${anim}</path>
<path d="${d}" stroke="#fff" stroke-opacity=".28" stroke-width="1.4" transform="translate(-1 -1.5)" pathLength="1"${anim ? ` stroke-dasharray="1 1" stroke-dashoffset="1"` : ""}>${anim}</path>
</g>`;
}

function led(x, y, color = C.led[3], extra = "") {
  return `<circle cx="${x}" cy="${y}" r="5.5" fill="#6A6A64"/><circle cx="${x}" cy="${y}" r="4.2" fill="${C.led[0]}"/>
<circle cx="${x}" cy="${y}" r="4.2" fill="${color}" opacity="0">${extra}</circle>`;
}

const write = (name, s) => { writeFileSync(join(OUT, name), s); console.log("wrote", name, (s.length / 1024).toFixed(1) + "kb"); };

// ---------- header ----------
function header() {
  const W = 1200, H = 440;
  const draw = (begin) => `<animate attributeName="stroke-dashoffset" from="1" to="0" begin="${begin}s" dur="0.9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".35 0 .2 1"/>`;
  const fadeIn = (begin) => `opacity="0"><animate attributeName="opacity" to="1" begin="${begin}s" dur=".15s" fill="freeze"/`;
  const J = { idea: [858, 150], spec: [958, 150], code: [1058, 150], test: [858, 280], ship: [958, 280], users: [1058, 280] };
  const patches = [
    ["idea", "code", C.red, 70, .3],
    ["spec", "test", C.mustard, 50, .6],
    ["code", "ship", C.blue, 60, .9],
  ];
  let cables = "", plugs = "";
  for (const [a, b, col, sag, t] of patches) {
    cables += cable(...J[a], ...J[b], col, sag, draw(t));
    plugs += `<g ${fadeIn(t)}>${plug(...J[a], col)}</g><g ${fadeIn(t + .85)}>${plug(...J[b], col)}</g>`;
  }
  // a loose green cable running off the bottom edge from "users"
  const loose = `M1058 280 C1058 360, 1130 380, 1150 460`;
  const looseCable = `<g fill="none" stroke-linecap="round">
<path d="${loose}" stroke="${shade(C.green, .6)}" stroke-width="8.5" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">${draw(1.2)}</path>
<path d="${loose}" stroke="${C.green}" stroke-width="6" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">${draw(1.2)}</path></g>`;

  const body = `
${panel(0, 0, W, H)}
<text x="56" y="62" class="cb" font-size="17" fill="${C.ink}">parv15</text>
<text x="56" y="82" class="c" font-size="14" fill="${C.inkSoft}">software, products and AI agents</text>
<text x="1144" y="62" text-anchor="end" class="c" font-size="14" fill="${C.inkSoft}">rev. 2026</text>

<text x="52" y="236" class="d" font-size="104" fill="${C.ink}" letter-spacing="-3">Parv</text>
<text x="52" y="330" class="d" font-size="104" fill="${C.ink}" letter-spacing="-3">Mittal</text>
<text x="56" y="384" class="t" font-size="21" fill="${C.ink}">Software engineer, product developer and AI agent engineer.</text>

<line x1="780" y1="56" x2="780" y2="384" stroke="${C.aluLo}" stroke-opacity=".6"/>
<line x1="781" y1="56" x2="781" y2="384" stroke="${C.aluHi}" stroke-opacity=".8"/>
<text x="808" y="100" class="cb" font-size="15" fill="${C.ink}">how I work</text>
${Object.entries(J).map(([k, [x, y]]) => jack(x, y, k, { labelPos: "above" })).join("")}
${cables}${looseCable}${plugs}
${led(1120, 96, C.led[3], `<animate attributeName="opacity" to="1" begin="2.1s" dur=".05s" fill="freeze"/>`)}
<text x="1106" y="101" text-anchor="end" class="c" font-size="14" fill="${C.ink}">shipping</text>`;
  write("header.svg", svg(W, H, "Parv Mittal — software engineer, product developer and AI agent engineer", body));
}

// ---------- agent rack ----------
function agentRack() {
  const W = 1200, H = 470, top = 20, bot = H - 20, mh = bot - top;
  const mods = [[8, 200, "request"], [212, 340, "agent"], [556, 262, "MCP server"], [822, 370, "tools"]];
  let body = rail(0, 0, W) + rail(0, bot, W) + `<rect x="0" y="${top}" width="${W}" height="${mh}" fill="#22221E"/>`;
  for (const [x, w, name] of mods) {
    body += panel(x, top, w, mh);
    body += `<text x="${x + 26}" y="${top + 54}" class="cb" font-size="22" fill="${C.ink}">${esc(name)}</text>`;
  }
  // module copy
  body += `<text x="34" y="${top + 78}" class="t" font-size="14" fill="${C.inkSoft}">“Sync my week”</text>
<text x="238" y="${top + 78}" class="t" font-size="14" fill="${C.inkSoft}">Plans, calls tools, reads results</text>
<text x="582" y="${top + 78}" class="t" font-size="14" fill="${C.inkSoft}">Lists and runs tools, OAuth scoped</text>
<text x="848" y="${top + 78}" class="t" font-size="14" fill="${C.inkSoft}">External services</text>`;

  const Y1 = 190, Y2 = 330;
  const J = {
    in: [108, Y1], reply: [108, Y2],
    prompt: [290, Y1], call: [474, Y1], result: [474, Y2], answer: [290, Y2],
    mcpIn: [620, Y1], dispatch: [756, Y1], ret: [756, Y2], mcpOut: [620, Y2],
    busIn: [890, Y1], busOut: [890, Y2],
  };
  const labels = { in: "in", reply: "reply", prompt: "prompt", call: "tool call", result: "result", answer: "answer", mcpIn: "call", dispatch: "run", ret: "return", mcpOut: "result", busIn: "in", busOut: "out" };
  for (const [k, [x, y]] of Object.entries(J)) body += jack(x, y, labels[k], { labelPos: "above" });

  // agent knob
  body += `<circle cx="382" cy="262" r="34" fill="#2A2A27"/><circle cx="382" cy="262" r="28" fill="#3A3A36"/>
<circle cx="382" cy="262" r="28" fill="url(#sheen)"/><line x1="382" y1="262" x2="382" y2="240" stroke="${C.white}" stroke-width="3" stroke-linecap="round">
<animateTransform attributeName="transform" type="rotate" values="-120 382 262;-120 382 262;0 382 262;0 382 262;120 382 262;120 382 262;-120 382 262" keyTimes="0;.12;.18;.48;.54;.86;1" dur="6s" repeatCount="indefinite"/></line>
${[-120, 0, 120].map((a, i) => {
    const r = 54, rad = (a - 90) * Math.PI / 180;
    return `<text x="${(382 + r * Math.cos(rad)).toFixed(1)}" y="${(262 + r * Math.sin(rad) + 5).toFixed(1)}" text-anchor="middle" class="c" font-size="13" fill="${C.ink}">${["plan", "act", "observe"][i]}</text>`;
  }).join("")}`;

  // tool rows with LEDs
  const tools = [["search", "query the web and docs"], ["calendar", "read and create events"], ["docs", "open and edit files"], ["chat", "post to a channel"]];
  tools.forEach(([n, d], i) => {
    const y = 150 + i * 58, s = (.38 + i * .03).toFixed(3), e = (.62).toFixed(3);
    body += led(960, y, C.led[3], `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${(+s + .005).toFixed(3)};${e};${(+e + .01).toFixed(3)};1" dur="6s" repeatCount="indefinite"/>`);
    body += `<text x="978" y="${y + 1}" class="cb" font-size="17" fill="${C.ink}">${n}</text><text x="978" y="${y + 20}" class="t" font-size="13" fill="${C.inkSoft}">${d}</text>`;
  });
  // agent LED
  body += led(520, top + 50, C.led[3], `<animate attributeName="opacity" values="0;1;0;1;0;1;0" keyTimes="0;.1;.3;.5;.7;.85;1" dur="6s" repeatCount="indefinite"/>`);
  body += `<text x="508" y="${top + 55}" text-anchor="end" class="c" font-size="13" fill="${C.ink}">busy</text>`;

  // cables + signal
  const runs = [
    ["in", "prompt", C.red, 70, 0, .12],
    ["call", "mcpIn", C.mustard, 60, .14, .24],
    ["dispatch", "busIn", C.blue, 55, .26, .36],
    ["busOut", "ret", C.green, 55, .64, .74],
    ["mcpOut", "result", C.blue, 60, .76, .84],
    ["answer", "reply", C.red, 70, .86, .96],
  ];
  let plugs = "";
  for (const [a, b, col, sag, s, e] of runs) {
    body += cable(...J[a], ...J[b], col, sag);
    const d = cablePath(...J[a], ...J[b], sag);
    body += `<path d="${d}" fill="none" stroke="#FFF7D6" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray=".1 1.3" stroke-dashoffset=".1">
<animate attributeName="stroke-dashoffset" values=".1;.1;-1;-1" keyTimes="0;${s};${e};1" dur="6s" repeatCount="indefinite"/></path>`;
    plugs += plug(...J[a], col) + plug(...J[b], col);
  }
  body += plugs;
  write("agent-rack.svg", svg(W, H, "How an agent run is wired: a request goes into the agent, the agent calls tools through an MCP server, results come back, and the agent replies", body));
}

// ---------- stack ----------
function stack() {
  const W = 1200, H = 400;
  const cols = [
    [["languages", ["TypeScript", "JavaScript", "Python", "C++", "HTML", "CSS"]],
     ["frontend", ["React", "Next.js", "Redux", "Tailwind", "Bootstrap"]],
     ["backend", ["Node.js", "Express", "FastAPI", "REST"]]],
    [["data", ["MongoDB", "MySQL", "Redis"]],
     ["shipping", ["Docker", "Git", "GitHub", "Vercel", "Netlify"]],
     ["agents", ["MCP", "OAuth", "tools", "APIs"]]],
  ];
  let body = panel(0, 0, W, H);
  body += `<text x="44" y="58" class="cb" font-size="22" fill="${C.ink}">Stack</text>
<text x="44" y="80" class="t" font-size="14" fill="${C.inkSoft}">Patched together most days.</text>`;
  const pos = {};
  cols.forEach((rows, ci) => {
    const x0 = 44 + ci * 580;
    rows.forEach(([name, items], ri) => {
      const y = 156 + ri * 92;
      body += `<text x="${x0}" y="${y + 5}" class="cb" font-size="16" fill="${C.ink}">${name}</text>`;
      items.forEach((it, i) => {
        const x = x0 + 128 + i * 76;
        pos[it] = [x, y];
        body += jack(x, y, it.length > 11 ? it.split(" ")[0] : it, { labelPos: "above" });
      });
    });
  });
  const wires = [["TypeScript", "Python", C.mustard, 42], ["React", "Next.js", C.red, 34], ["MCP", "OAuth", C.blue, 34], ["Docker", "Vercel", C.green, 42]];
  for (const [a, b, col, sag] of wires) body += cable(...pos[a], ...pos[b], col, sag);
  for (const [a, b, col] of wires) body += plug(...pos[a], col) + plug(...pos[b], col);
  write("stack.svg", svg(W, H, "Stack: TypeScript, JavaScript, Python, C++, HTML, CSS, React, Next.js, Redux, Tailwind, Bootstrap, Node.js, Express, FastAPI, REST, MongoDB, MySQL, Redis, Docker, Git, GitHub, Vercel, Netlify, MCP, OAuth, tool calling, API integrations", body));
}

// ---------- social links ----------
function links() {
  const items = [["github", "GitHub", "@parv15", C.red], ["linkedin", "LinkedIn", "parv-mittal", C.blue], ["twitter", "Twitter", "@ParvMittal19", C.mustard], ["instagram", "Instagram", "@parvmittal_15", C.green]];
  for (const [id, name, handle, col] of items) {
    const W = 282, H = 84;
    const body = `${panel(0, 0, W, H, { screws: false })}${screw(W - 16, 16)}${screw(W - 16, H - 16)}
${jack(42, 42, "")}${cable(42, 42, 6, 120, col, 10)}${plug(42, 42, col)}
<text x="76" y="40" class="cb" font-size="20" fill="${C.ink}">${name}</text>
<text x="76" y="60" class="t" font-size="14" fill="${C.inkSoft}">${esc(handle)}</text>`;
    write(`link-${id}.svg`, svg(W, H, `${name} ${handle}`, body));
  }
}

// ---------- footer ----------
function footer() {
  const W = 1200, H = 92;
  const body = `${rail(0, 0, W)}${panel(0, 20, W, 52, { screws: false })}${screw(18, 46)}${screw(W - 18, 46)}
<text x="44" y="52" class="t" font-size="16" fill="${C.ink}">Building, learning and shipping, one project at a time.</text>
${led(W - 60, 46, C.led[3], `<set attributeName="opacity" to="1" begin="0s"/>`)}
${rail(0, 72, W)}`;
  write("footer.svg", svg(W, H, "Building, learning and shipping, one project at a time", body));
}

// ---------- stats ----------
const QUERY = `query($login:String!){user(login:$login){followers{totalCount}
repositories(ownerAffiliations:OWNER,isFork:false,first:100,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}
contributionsCollection{totalCommitContributions totalPullRequestContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

async function loadStats() {
  if (process.env.MOCK || process.env.EMPTY) {
    const empty = !!process.env.EMPTY, weeks = [], start = Date.now() - 52 * 7 * 864e5;
    for (let w = 0; w < 53; w++) weeks.push({ contributionDays: [...Array(7)].map((_, d) => {
      const r = empty ? 0 : rand();
      return { date: new Date(start + (w * 7 + d) * 864e5).toISOString().slice(0, 10), contributionCount: r < .35 ? 0 : Math.floor(r * r * 14) };
    }) });
    const L = (name, size) => ({ size: empty ? 0 : size, node: { name } });
    return { followers: { totalCount: empty ? 0 : 42 }, repositories: { totalCount: empty ? 0 : 31, nodes: [
      { stargazerCount: empty ? 0 : 12, languages: { edges: [L("TypeScript", 900), L("JavaScript", 500), L("Python", 600)] } },
      { stargazerCount: 0, languages: { edges: [L("C++", 300), L("HTML", 200), L("CSS", 120)] } }] },
      contributionsCollection: { totalCommitContributions: empty ? 0 : 640, totalPullRequestContributions: empty ? 0 : 58,
        contributionCalendar: { totalContributions: weeks.flatMap(w => w.contributionDays).reduce((a, d) => a + d.contributionCount, 0), weeks } } };
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set. Use MOCK=1 for a local preview.");
  const r = await fetch("https://api.github.com/graphql", { method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-build" },
    body: JSON.stringify({ query: QUERY, variables: { login: USER } }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data.user;
}

function stats(u) {
  const W = 1200, H = 430;
  const cal = u.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap(w => w.contributionDays);
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0, i = days.length - 1;
  if (i >= 0 && !days[i].contributionCount) i--;
  for (; i >= 0 && days[i].contributionCount; i--) current++;

  const lang = new Map();
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) lang.set(e.node.name, (lang.get(e.node.name) || 0) + e.size);
  const langs = [...lang].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const lt = langs.reduce((a, [, v]) => a + v, 0) || 1;

  let body = panel(0, 0, W, H);
  body += `<text x="44" y="58" class="cb" font-size="22" fill="${C.ink}">Activity</text>
<text x="44" y="80" class="t" font-size="14" fill="${C.inkSoft}">Pulled from GitHub, last refreshed ${new Date().toISOString().slice(0, 10)}.</text>`;

  const readouts = [[cal.totalContributions, "contributions this year"], [current, "day streak right now"], [longest, "longest streak"], [u.contributionsCollection.totalCommitContributions, "commits this year"]];
  readouts.forEach(([v, label], k) => {
    const x = 44 + k * 186;
    body += `<rect x="${x}" y="108" width="168" height="70" rx="4" fill="${C.window}" stroke="#000"/>
<rect x="${x + 1}" y="109" width="166" height="8" rx="3" fill="#fff" opacity=".04"/>
<text x="${x + 154}" y="161" text-anchor="end" class="d" font-size="38" fill="${C.led[4]}" letter-spacing="1">${v}</text>
<text x="${x}" y="200" class="c" font-size="14" fill="${C.ink}">${label}</text>`;
  });

  // LED matrix
  const mx = 44, my = 232, step = 13.2;
  const weeks = cal.weeks.slice(-53), max = Math.max(1, ...days.map(d => d.contributionCount));
  body += `<rect x="${mx}" y="${my}" width="${53 * step + 18}" height="${7 * step + 18}" rx="4" fill="${C.window}" stroke="#000"/>`;
  weeks.forEach((w, wi) => w.contributionDays.forEach(d => {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay(), c = d.contributionCount;
    const lvl = !c ? 0 : c / max < .25 ? 1 : c / max < .5 ? 2 : c / max < .8 ? 3 : 4;
    body += `<circle cx="${(mx + 15 + wi * step).toFixed(1)}" cy="${(my + 15 + dow * step).toFixed(1)}" r="4.3" fill="${C.led[lvl]}"/>`;
  }));
  body += `<text x="${mx}" y="${my + 7 * step + 46}" class="c" font-size="14" fill="${C.ink}">the last 12 months, one light per day</text>`;

  // language meters
  const lx = 840;
  body += `<line x1="${lx - 26}" y1="108" x2="${lx - 26}" y2="${H - 44}" stroke="${C.aluLo}" stroke-opacity=".6"/><line x1="${lx - 25}" y1="108" x2="${lx - 25}" y2="${H - 44}" stroke="${C.aluHi}" stroke-opacity=".8"/>`;
  body += `<text x="${lx}" y="122" class="cb" font-size="16" fill="${C.ink}">languages by code</text>`;
  langs.forEach(([n, v], k) => {
    const y = 150 + k * 40, pct = v / lt, lit = Math.max(1, Math.round(v / langs[0][1] * 10));
    body += `<text x="${lx}" y="${y + 4}" class="c" font-size="14" fill="${C.ink}">${esc(n)}</text>`;
    for (let s = 0; s < 10; s++) body += `<rect x="${lx + 96 + s * 18}" y="${y - 8}" width="14" height="14" rx="2" fill="${s < lit ? (s > 7 ? C.mustard : C.led[3]) : C.window}" stroke="#000" stroke-width=".6"/>`;
    body += `<text x="${W - 44}" y="${y + 4}" text-anchor="end" class="c" font-size="14" fill="${C.inkSoft}">${Math.round(pct * 100)}%</text>`;
  });
  if (!langs.length) body += `<text x="${lx}" y="160" class="t" font-size="14" fill="${C.inkSoft}">Updates after the first refresh.</text>`;

  mkdirSync(join(OUT, "generated"), { recursive: true });
  write("generated/stats.svg", svg(W, H, `GitHub activity: ${cal.totalContributions} contributions this year, ${current} day current streak, ${longest} day longest streak`, body));
}

mkdirSync(OUT, { recursive: true });
header(); agentRack(); stack(); links(); footer();
stats(await loadStats());
