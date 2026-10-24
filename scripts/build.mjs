// Builds every image in assets/: black-anodized studio gear, drawn as SVG.
// Fonts (Archivo, OFL) are embedded so the images look the same everywhere.
//
//   node scripts/build.mjs            panels + live stats (needs GITHUB_TOKEN)
//   MOCK=1 node scripts/build.mjs     sample stats, for previewing locally
//   EMPTY=1 node scripts/build.mjs    blank stats placeholder

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const USER = process.env.GH_USER || "parv15";

// ---------- tokens ----------
const C = {
  panel: "#1D1D1F", panelHi: "#2E2E31", edge: "#09090A",
  silk: "#ECE9E2", silk2: "#9A9892", silk3: "#85837D",
  rail: "#141415",
  amber: "#F2A93B",
  amberLv: ["#211C14", "#4A3515", "#8A5E1C", "#D48E2C", "#FFC56E"],
  cable: "#36363A", cableHi: "#5C5C62", cableEdge: "#0B0B0C",
  window: "#0A0907",
};

const font = n => readFileSync(join(ROOT, "scripts/fonts", `archivo-${n}.woff2`)).toString("base64");
const FONT_CSS = [["AL", "light"], ["AC", "cond"], ["AM", "medium"], ["AT", "text"]]
  .map(([fam, f]) => `@font-face{font-family:${fam};src:url(data:font/woff2;base64,${font(f)}) format('woff2')}`).join("");
const STYLE = `<style>${FONT_CSS}
.l{font-family:AL,Helvetica,Arial,sans-serif}.c{font-family:AC,Arial Narrow,sans-serif}.md{font-family:AM,Helvetica,Arial,sans-serif}.t{font-family:AT,Helvetica,Arial,sans-serif}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;

// ---------- helpers ----------
let seed = 15;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(w, h, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<defs>${STYLE}
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
<radialGradient id="screw" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#6A6A6E"/><stop offset="1" stop-color="#1A1A1C"/></radialGradient>
<radialGradient id="nickel" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#C9C9CC"/><stop offset=".6" stop-color="#7A7A7F"/><stop offset="1" stop-color="#3A3A3E"/></radialGradient>
<radialGradient id="knob" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#3C3C40"/><stop offset="1" stop-color="#151517"/></radialGradient>
<radialGradient id="glass" cx=".5" cy="0" r="1.2"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
<pattern id="brush" width="400" height="7" patternUnits="userSpaceOnUse">${brushLines()}</pattern>
</defs>
${body}
</svg>`;
}

function brushLines() {
  let s = "";
  for (let y = 0; y < 7; y += 1.2) {
    const x = Math.floor(rand() * 300), w = 60 + Math.floor(rand() * 320);
    s += `<rect x="${x}" y="${y}" width="${w}" height=".5" fill="#fff" opacity="${(.012 + rand() * .025).toFixed(3)}"/>`;
  }
  return s;
}

function screw(x, y) {
  const a = Math.floor(rand() * 180);
  return `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#screw)" stroke="#000" stroke-width=".8"/>
<path d="M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}" stroke="#09090A" stroke-width="1.3" transform="rotate(${a} ${x} ${y})"/>`;
}

function panel(x, y, w, h, { screws = true } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.panel}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#brush)"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#sheen)"/>
<rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="3.5" fill="none" stroke="${C.edge}"/>
<path d="M${x + 4} ${y + 1.5}H${x + w - 4}" stroke="${C.panelHi}"/>
${screws ? screw(x + 14, y + 14) + screw(x + w - 14, y + 14) + screw(x + 14, y + h - 14) + screw(x + w - 14, y + h - 14) : ""}`;
}

function rail(x, y, w, h = 18) {
  let holes = "";
  for (let i = x + 22; i < x + w - 10; i += 40) holes += `<rect x="${i}" y="${y + h / 2 - 2.5}" width="12" height="5" rx="2.5" fill="#000"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.rail}"/><rect x="${x}" y="${y}" width="${w}" height="1" fill="#2A2A2C"/>${holes}`;
}

function jack(x, y, label, pos = "above") {
  const ly = pos === "above" ? y - 19 : y + 27;
  return `<circle cx="${x}" cy="${y}" r="9.5" fill="url(#nickel)" stroke="#000" stroke-width=".6"/>
<circle cx="${x}" cy="${y}" r="6" fill="#141415"/><circle cx="${x}" cy="${y}" r="4" fill="#000"/>
${label ? `<text x="${x}" y="${ly}" text-anchor="middle" class="c" font-size="13.5" fill="${C.silk2}">${esc(label)}</text>` : ""}`;
}

function plug(x, y, lit = false) {
  return `<circle cx="${x}" cy="${y}" r="8.5" fill="${C.cableEdge}"/><circle cx="${x}" cy="${y}" r="7" fill="${C.cable}"/>
<circle cx="${x}" cy="${y}" r="2.6" fill="${lit ? C.amber : "#4A4A4F"}"/>`;
}

const cablePath = (x1, y1, x2, y2, sag) => `M${x1} ${y1} C${x1} ${y1 + sag}, ${x2} ${y2 + sag}, ${x2} ${y2}`;

function cable(d, anim = "") {
  const a = anim ? ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"` : "";
  return `<g fill="none" stroke-linecap="round">
<path d="${d}" stroke="#000" stroke-opacity=".45" stroke-width="6" transform="translate(1.5 4)"${a}>${anim}</path>
<path d="${d}" stroke="${C.cableEdge}" stroke-width="5.5"${a}>${anim}</path>
<path d="${d}" stroke="${C.cable}" stroke-width="4"${a}>${anim}</path>
<path d="${d}" stroke="${C.cableHi}" stroke-width="1" transform="translate(-.6 -1)"${a}>${anim}</path></g>`;
}

const pulse = (d, s, e, dur = 6) => `<path d="${d}" fill="none" stroke="${C.amber}" stroke-width="2.4" stroke-linecap="round" pathLength="1" stroke-dasharray=".08 1.3" stroke-dashoffset=".08">
<animate attributeName="stroke-dashoffset" values=".08;.08;-1;-1" keyTimes="0;${s};${e};1" dur="${dur}s" repeatCount="indefinite"/></path>`;

function led(x, y, anim = "", on = false) {
  return `<circle cx="${x}" cy="${y}" r="4.6" fill="#000"/><circle cx="${x}" cy="${y}" r="3.4" fill="${C.amberLv[0]}"/>
<circle cx="${x}" cy="${y}" r="3.4" fill="${C.amber}" opacity="${on ? 1 : 0}">${anim}</circle>`;
}

function knob(x, y, r, angle, label) {
  const rad = (angle - 90) * Math.PI / 180;
  let ticks = "";
  for (let a = -135; a <= 135; a += 27) {
    const t = (a - 90) * Math.PI / 180;
    ticks += `<line x1="${(x + (r + 5) * Math.cos(t)).toFixed(1)}" y1="${(y + (r + 5) * Math.sin(t)).toFixed(1)}" x2="${(x + (r + 9) * Math.cos(t)).toFixed(1)}" y2="${(y + (r + 9) * Math.sin(t)).toFixed(1)}" stroke="${C.silk3}" stroke-width="1"/>`;
  }
  return `${ticks}<circle cx="${x}" cy="${y + 2}" r="${r}" fill="#000" opacity=".5"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#knob)" stroke="#000"/>
<circle cx="${x}" cy="${y}" r="${r - 3}" fill="none" stroke="#fff" stroke-opacity=".06"/>
<line x1="${x}" y1="${y}" x2="${(x + (r - 4) * Math.cos(rad)).toFixed(1)}" y2="${(y + (r - 4) * Math.sin(rad)).toFixed(1)}" stroke="${C.silk}" stroke-width="2" stroke-linecap="round"/>
${label ? `<text x="${x}" y="${y + r + 26}" text-anchor="middle" class="c" font-size="13.5" fill="${C.silk2}">${esc(label)}</text>` : ""}`;
}

function windowBox(x, y, w, h) {
  return `<rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${h + 2}" rx="5" fill="#000"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.window}"/>`;
}
const glass = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#glass)"/>`;

const write = (name, s) => { writeFileSync(join(OUT, name), s); console.log("wrote", name, (s.length / 1024).toFixed(1) + "kb"); };

// ---------- header ----------
function header() {
  const W = 1200, H = 420;
  // oscilloscope
  const ox = 790, oy = 60, ow = 366, oh = 206;
  let grid = "";
  for (let i = 1; i < 8; i++) grid += `<line x1="${ox + i * ow / 8}" y1="${oy}" x2="${ox + i * ow / 8}" y2="${oy + oh}" stroke="${C.amber}" stroke-opacity="${i === 4 ? .14 : .06}"/>`;
  for (let i = 1; i < 4; i++) grid += `<line x1="${ox}" y1="${oy + i * oh / 4}" x2="${ox + ow}" y2="${oy + i * oh / 4}" stroke="${C.amber}" stroke-opacity="${i === 2 ? .14 : .06}"/>`;
  let wave = "";
  for (let i = 0; i <= 240; i++) {
    const t = i / 240, x = ox + 14 + t * (ow - 28);
    const env = Math.sin(Math.PI * t) ** 1.4;
    const y = oy + oh / 2 - env * (52 * Math.sin(t * 2 * Math.PI * 4.2) + 18 * Math.sin(t * 2 * Math.PI * 11.3 + 1));
    wave += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  const body = `
${panel(0, 0, W, H)}
<text x="48" y="58" class="md" font-size="15" fill="${C.silk}">parv15</text>
<text x="112" y="58" class="t" font-size="15" fill="${C.silk3}">software, products and AI agents</text>

<text x="44" y="198" class="l" font-size="94" fill="${C.silk}" letter-spacing="-1.5">Parv Mittal</text>
<text x="48" y="246" class="t" font-size="21" fill="${C.silk2}">Software engineer, product developer and AI agent engineer.</text>

<line x1="48" y1="300" x2="720" y2="300" stroke="#000"/><line x1="48" y1="301" x2="720" y2="301" stroke="${C.panelHi}"/>
${led(54, 344, `<animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/>`, true)}
<text x="70" y="349" class="t" font-size="16" fill="${C.silk}">Open to collaborating on web and AI agent projects</text>
<text x="70" y="374" class="t" font-size="15" fill="${C.silk3}">Building full-stack products and MCP tool integrations right now</text>

${windowBox(ox, oy, ow, oh)}
${grid}
<path d="${wave}" fill="none" stroke="${C.amber}" stroke-opacity=".25" stroke-width="5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">
<animate attributeName="stroke-dashoffset" from="1" to="0" begin=".3s" dur="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/></path>
<path d="${wave}" fill="none" stroke="${C.amberLv[4]}" stroke-width="1.6" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">
<animate attributeName="stroke-dashoffset" from="1" to="0" begin=".3s" dur="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/></path>
<circle r="3.2" fill="#FFF3DC" opacity="0"><animate attributeName="opacity" to="1" begin="2.1s" dur=".2s" fill="freeze"/>
<animateMotion path="${wave}" dur="4s" begin="2.1s" repeatCount="indefinite"/></circle>
${glass(ox, oy, ow, oh)}
<text x="${ox + 12}" y="${oy + 22}" class="c" font-size="13" fill="${C.amber}" opacity=".7">signal</text>
<text x="${ox + ow - 12}" y="${oy + 22}" text-anchor="end" class="c" font-size="13" fill="${C.amber}" opacity=".7">idea to production</text>

${knob(856, 324, 20, -60, "plan")}
${knob(973, 324, 20, 20, "act")}
${knob(1090, 324, 20, 95, "observe")}`;
  write("header.svg", svg(W, H, "Parv Mittal — software engineer, product developer and AI agent engineer", body));
}

// ---------- agent rack ----------
function agentRack() {
  const W = 1200, H = 470, top = 18, bot = H - 18, mh = bot - top;
  const mods = [[6, 202, "request", "“Sync my week”"], [212, 342, "agent", "Plans, calls tools, reads results"], [558, 262, "MCP server", "Lists and runs tools, OAuth scoped"], [824, 370, "tools", "External services"]];
  let body = rail(0, 0, W) + rail(0, bot, W) + `<rect x="0" y="${top}" width="${W}" height="${mh}" fill="#050505"/>`;
  for (const [x, w, name, sub] of mods) {
    body += panel(x, top, w, mh);
    body += `<text x="${x + 26}" y="${top + 52}" class="md" font-size="20" fill="${C.silk}">${esc(name)}</text>
<text x="${x + 26}" y="${top + 76}" class="t" font-size="14" fill="${C.silk3}">${esc(sub)}</text>`;
  }
  const Y1 = 196, Y2 = 336;
  const J = {
    in: [108, Y1], reply: [108, Y2],
    prompt: [290, Y1], call: [476, Y1], result: [476, Y2], answer: [290, Y2],
    mcpIn: [622, Y1], run: [758, Y1], ret: [758, Y2], mcpOut: [622, Y2],
    busIn: [892, Y1], busOut: [892, Y2],
  };
  const L = { in: "in", reply: "reply", prompt: "prompt", call: "tool call", result: "result", answer: "answer", mcpIn: "call", run: "run", ret: "return", mcpOut: "result", busIn: "in", busOut: "out" };
  for (const [k, [x, y]] of Object.entries(J)) body += jack(x, y, L[k]);

  // agent knob turns plan → act → observe
  const kx = 383, ky = 266, r = 26;
  let ticks = "";
  [["plan", -120], ["act", 0], ["observe", 120]].forEach(([t, a]) => {
    const rad = (a - 90) * Math.PI / 180;
    ticks += `<text x="${(kx + 50 * Math.cos(rad)).toFixed(1)}" y="${(ky + 50 * Math.sin(rad) + 5).toFixed(1)}" text-anchor="middle" class="c" font-size="13" fill="${C.silk2}">${t}</text>`;
  });
  body += `${ticks}<circle cx="${kx}" cy="${ky + 2}" r="${r}" fill="#000" opacity=".5"/><circle cx="${kx}" cy="${ky}" r="${r}" fill="url(#knob)" stroke="#000"/>
<line x1="${kx}" y1="${ky}" x2="${kx}" y2="${ky - r + 5}" stroke="${C.amber}" stroke-width="2.4" stroke-linecap="round">
<animateTransform attributeName="transform" type="rotate" values="-120 ${kx} ${ky};-120 ${kx} ${ky};0 ${kx} ${ky};0 ${kx} ${ky};120 ${kx} ${ky};120 ${kx} ${ky};-120 ${kx} ${ky}" keyTimes="0;.12;.18;.48;.54;.86;1" dur="6s" repeatCount="indefinite"/></line>`;
  body += led(522, top + 46, `<animate attributeName="opacity" values="0;1;0;1;0;1;0" keyTimes="0;.1;.3;.5;.7;.85;1" dur="6s" repeatCount="indefinite"/>`);
  body += `<text x="510" y="${top + 51}" text-anchor="end" class="c" font-size="13" fill="${C.silk3}">busy</text>`;

  const tools = [["search", "Query the web and docs"], ["calendar", "Read and create events"], ["docs", "Open and edit files"], ["chat", "Post to a channel"]];
  tools.forEach(([n, d], i) => {
    const y = 158 + i * 58, s = (.38 + i * .03).toFixed(3), e = ".62";
    body += led(964, y - 5, `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${(+s + .005).toFixed(3)};${e};.63;1" dur="6s" repeatCount="indefinite"/>`);
    body += `<text x="982" y="${y}" class="md" font-size="16" fill="${C.silk}">${n}</text><text x="982" y="${y + 20}" class="t" font-size="13" fill="${C.silk3}">${d}</text>`;
  });

  const runs = [["in", "prompt", 70, 0, .12], ["call", "mcpIn", 60, .14, .24], ["run", "busIn", 55, .26, .36], ["busOut", "ret", 55, .64, .74], ["mcpOut", "result", 60, .76, .84], ["answer", "reply", 70, .86, .96]];
  let plugs = "";
  for (const [a, b, sag, s, e] of runs) {
    const d = cablePath(...J[a], ...J[b], sag);
    body += cable(d) + pulse(d, s, e);
    plugs += plug(...J[a], true) + plug(...J[b], true);
  }
  body += plugs;
  write("agent-rack.svg", svg(W, H, "How an agent run is wired: a request goes into the agent, the agent calls tools through an MCP server, results come back, and the agent replies", body));
}

// ---------- stack ----------
function stack() {
  const W = 1200, H = 396;
  const cols = [
    [["languages", ["TypeScript", "JavaScript", "Python", "C++", "HTML", "CSS"]],
     ["frontend", ["React", "Next.js", "Redux", "Tailwind", "Bootstrap"]],
     ["backend", ["Node.js", "Express", "FastAPI", "REST"]]],
    [["data", ["MongoDB", "MySQL", "Redis"]],
     ["shipping", ["Docker", "Git", "GitHub", "Vercel", "Netlify"]],
     ["agents", ["MCP", "OAuth", "tools", "APIs"]]],
  ];
  let body = panel(0, 0, W, H);
  body += `<text x="44" y="58" class="md" font-size="20" fill="${C.silk}">Stack</text>
<text x="44" y="82" class="t" font-size="14" fill="${C.silk3}">What I patch together most days</text>
<line x1="604" y1="112" x2="604" y2="${H - 36}" stroke="#000"/><line x1="605" y1="112" x2="605" y2="${H - 36}" stroke="${C.panelHi}"/>`;
  const pos = {};
  cols.forEach((rows, ci) => {
    const x0 = 44 + ci * 584;
    rows.forEach(([name, items], ri) => {
      const y = 158 + ri * 92;
      body += `<text x="${x0}" y="${y + 5}" class="md" font-size="15" fill="${C.silk}">${name}</text>`;
      items.forEach((it, i) => { const x = x0 + 128 + i * 76; pos[it] = [x, y]; body += jack(x, y, it); });
    });
  });
  const wires = [["TypeScript", "Python", 42], ["React", "Next.js", 34], ["MCP", "OAuth", 34], ["Docker", "Vercel", 42]];
  for (const [a, b, sag] of wires) body += cable(cablePath(...pos[a], ...pos[b], sag));
  for (const [a, b] of wires) body += plug(...pos[a], true) + plug(...pos[b], true);
  write("stack.svg", svg(W, H, "Stack: TypeScript, JavaScript, Python, C++, HTML, CSS, React, Next.js, Redux, Tailwind, Bootstrap, Node.js, Express, FastAPI, REST, MongoDB, MySQL, Redis, Docker, Git, GitHub, Vercel, Netlify, MCP, OAuth, tool calling, APIs", body));
}

// ---------- links ----------
function links() {
  const items = [["github", "GitHub", "@parv15"], ["linkedin", "LinkedIn", "parv-mittal"], ["twitter", "Twitter", "@ParvMittal19"], ["instagram", "Instagram", "@parvmittal_15"]];
  for (const [id, name, handle] of items) {
    const W = 282, H = 80;
    const body = `${panel(0, 0, W, H, { screws: false })}${screw(W - 15, 15)}${screw(W - 15, H - 15)}
${jack(40, 40, "")}${cable(`M40 40 C40 70, 14 80, 4 120`)}${plug(40, 40, true)}
<text x="72" y="37" class="md" font-size="17" fill="${C.silk}">${name}</text>
<text x="72" y="57" class="t" font-size="14" fill="${C.silk3}">${esc(handle)}</text>`;
    write(`link-${id}.svg`, svg(W, H, `${name} ${handle}`, body));
  }
}

// ---------- footer ----------
function footer() {
  const W = 1200, H = 86;
  const body = `${rail(0, 0, W)}${panel(0, 18, W, 50, { screws: false })}${screw(18, 43)}${screw(W - 18, 43)}
<text x="44" y="48" class="t" font-size="15" fill="${C.silk2}">Building, learning and shipping, one project at a time.</text>
${led(W - 56, 43, "", true)}${rail(0, 68, W)}`;
  write("footer.svg", svg(W, H, "Building, learning and shipping, one project at a time", body));
}

// ---------- stats ----------
const QUERY = `query($login:String!){user(login:$login){followers{totalCount}
repositories(ownerAffiliations:OWNER,isFork:false,first:100,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}
contributionsCollection{totalCommitContributions totalPullRequestContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

function sample(empty) {
  const weeks = [], start = Date.now() - 52 * 7 * 864e5;
  for (let w = 0; w < 53; w++) weeks.push({ contributionDays: [...Array(7)].map((_, d) => {
    const r = empty ? 0 : rand();
    return { date: new Date(start + (w * 7 + d) * 864e5).toISOString().slice(0, 10), contributionCount: r < .35 ? 0 : Math.floor(r * r * 14) };
  }) });
  const L = (name, size) => ({ size: empty ? 0 : size, node: { name } });
  return { empty, followers: { totalCount: empty ? 0 : 42 }, repositories: { totalCount: empty ? 0 : 31, nodes: empty ? [] : [
    { stargazerCount: 12, languages: { edges: [L("TypeScript", 900), L("JavaScript", 500), L("Python", 600)] } },
    { stargazerCount: 0, languages: { edges: [L("C++", 300), L("HTML", 200), L("CSS", 120)] } }] },
    contributionsCollection: { totalCommitContributions: empty ? 0 : 640, totalPullRequestContributions: empty ? 0 : 58,
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
  const W = 1200, H = 420;
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
  body += `<text x="44" y="58" class="md" font-size="20" fill="${C.silk}">Activity</text>
<text x="44" y="82" class="t" font-size="14" fill="${C.silk3}">${u.empty ? "Waiting for the first refresh from GitHub" : `From GitHub, refreshed ${new Date().toISOString().slice(0, 10)}`}</text>`;

  const show = v => u.empty ? "--" : String(v);
  [[cal.totalContributions, "contributions this year"], [current, "day streak right now"], [longest, "longest streak"], [u.contributionsCollection.totalCommitContributions, "commits this year"]]
    .forEach(([v, label], k) => {
      const x = 44 + k * 184;
      body += `${windowBox(x, 108, 166, 66)}
<text x="${x + 152}" y="156" text-anchor="end" class="l" font-size="36" fill="${C.amber}">${show(v)}</text>${glass(x, 108, 166, 66)}
<text x="${x}" y="198" class="c" font-size="14" fill="${C.silk2}">${label}</text>`;
    });

  const mx = 44, my = 226, step = 13.1;
  const max = Math.max(1, ...days.map(d => d.contributionCount));
  body += windowBox(mx, my, 53 * step + 18, 7 * step + 18);
  cal.weeks.slice(-53).forEach((w, wi) => w.contributionDays.forEach(d => {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay(), c = d.contributionCount;
    const lvl = !c ? 0 : c / max < .25 ? 1 : c / max < .5 ? 2 : c / max < .8 ? 3 : 4;
    body += `<circle cx="${(mx + 15 + wi * step).toFixed(1)}" cy="${(my + 15 + dow * step).toFixed(1)}" r="4.2" fill="${C.amberLv[lvl]}"/>`;
  }));
  body += glass(mx, my, 53 * step + 18, 7 * step + 18);
  body += `<text x="${mx}" y="${my + 7 * step + 46}" class="c" font-size="14" fill="${C.silk2}">the last 12 months, one light per day</text>`;

  const lx = 840;
  body += `<line x1="${lx - 26}" y1="108" x2="${lx - 26}" y2="${H - 40}" stroke="#000"/><line x1="${lx - 25}" y1="108" x2="${lx - 25}" y2="${H - 40}" stroke="${C.panelHi}"/>
<text x="${lx}" y="122" class="md" font-size="15" fill="${C.silk}">languages by code</text>`;
  langs.forEach(([n, v], k) => {
    const y = 154 + k * 38, lit = Math.max(1, Math.round(v / langs[0][1] * 10));
    body += `<text x="${lx}" y="${y + 4}" class="c" font-size="14" fill="${C.silk2}">${esc(n)}</text>`;
    for (let s = 0; s < 10; s++) body += `<rect x="${lx + 96 + s * 18}" y="${y - 7}" width="13" height="13" rx="2" fill="${s < lit ? C.amberLv[s > 7 ? 4 : 3] : C.amberLv[0]}" stroke="#000" stroke-width=".8"/>`;
    body += `<text x="${W - 44}" y="${y + 4}" text-anchor="end" class="c" font-size="14" fill="${C.silk3}">${Math.round(v / lt * 100)}%</text>`;
  });
  if (!langs.length) body += `<text x="${lx}" y="156" class="t" font-size="14" fill="${C.silk3}">Shows up after the first refresh</text>`;

  mkdirSync(join(OUT, "generated"), { recursive: true });
  write("generated/stats.svg", svg(W, H, `GitHub activity: ${cal.totalContributions} contributions this year, ${current} day current streak, ${longest} day longest streak`, body));
}

mkdirSync(OUT, { recursive: true });
header(); agentRack(); stack(); links(); footer();
stats(await loadStats());
