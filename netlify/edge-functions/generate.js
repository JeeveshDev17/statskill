/* ============================================================================
   StatSkill — question generator (Netlify Edge Function)
   Author: Jeevesh Dev · Team DevOOPS · SIH26101

   WHY THIS FILE EXISTS
   The Gemini API key must never sit inside index.html, because anyone can read
   a web page's source. This function runs on Netlify's servers. It reads the
   key from a Netlify environment variable called MCQ_Generator (or
   STATSKILL_GEMINI_KEY), calls Gemini, and sends back only the questions.
   The key never reaches the browser.

   Do not name the variable GEMINI_API_KEY: Netlify's AI Gateway fills that
   name with its own token, which Google rejects as "API key not valid".

   ROUTES
     GET  /api/generate   health check: {"ok":true,"key":true|false}
     POST /api/generate   body {"text":"<training material>", "model":"<name>"}
                          one try with that model (the page runs the retries)
                          returns {"text":"<model reply>","model":"<name>"}
                          Without "model", tries every model in turn.

   The function only builds its own MCQ prompt, so it can't be used as a
   general-purpose free Gemini proxy by other people.
   ============================================================================ */

export const config = { path: "/api/generate" };

/* Google retires model names from time to time. These are tried in order. */
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-lite-latest"];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

/* Edge functions must start replying within 40 s. Stay safely under that. */
const TIME_BUDGET_MS = 34000;
/* One try with a named model may use nearly all of the 40 s. */
const SINGLE_TRY_MS = 32000;
const MAX_TEXT_CHARS = 6000;

/* Which websites may call this function from a browser.
   Default: any Netlify site, any GitHub Pages site, local testing, and a file
   opened straight from disk. To lock it down, set an ALLOWED_ORIGINS variable
   on Netlify, e.g.  https://jeeveshdev.github.io,https://statskill.netlify.app  */
function allowedOrigin(origin) {
  const custom = readEnv("ALLOWED_ORIGINS");
  if (custom) {
    const list = custom.split(",").map(s => s.trim()).filter(Boolean);
    return list.includes(origin) ? origin : "";
  }
  if (!origin || origin === "null") return "*";
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.netlify\.app$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "";
}

function readEnv(name) {
  try { if (typeof Netlify !== "undefined") return Netlify.env.get(name) || ""; } catch (_) {}
  try { if (typeof Deno !== "undefined") return Deno.env.get(name) || ""; } catch (_) {}
  try { if (typeof process !== "undefined") return process.env[name] || ""; } catch (_) {}
  return "";
}

/* The 33 competencies from the problem statement. index.html holds the same
   list for validation; keep the two in step if you ever change one. */
const COMPETENCIES = [
  ["Survey Design","Statistical","STAT-01"], ["Sampling","Statistical","STAT-02"],
  ["National Accounts","Statistical","STAT-03"], ["Price Statistics","Statistical","STAT-04"],
  ["Labour Statistics","Statistical","STAT-05"], ["Agricultural Statistics","Statistical","STAT-06"],
  ["Industrial Statistics","Statistical","STAT-07"], ["SDG Indicators","Statistical","STAT-08"],
  ["Metadata Standards","Statistical","STAT-09"], ["Data Quality Frameworks","Statistical","STAT-10"],
  ["Python","Technical","TECH-01"], ["R","Technical","TECH-02"], ["SQL","Technical","TECH-03"],
  ["Stata","Technical","TECH-04"], ["SPSS","Technical","TECH-05"], ["SAS","Technical","TECH-06"],
  ["GIS","Technical","TECH-07"], ["Data Visualization","Technical","TECH-08"],
  ["AI / ML","Technical","TECH-09"], ["Cloud Computing","Technical","TECH-10"],
  ["APIs","Technical","TECH-11"], ["Open Data","Technical","TECH-12"],
  ["Cybersecurity","Digital Governance","DGOV-01"], ["Data Privacy","Digital Governance","DGOV-02"],
  ["Digital Signatures","Digital Governance","DGOV-03"], ["Government Cloud","Digital Governance","DGOV-04"],
  ["Digital Public Infrastructure","Digital Governance","DGOV-05"],
  ["Leadership","Behavioural & Managerial","BEHV-01"], ["Communication","Behavioural & Managerial","BEHV-02"],
  ["Project Management","Behavioural & Managerial","BEHV-03"], ["Ethics","Behavioural & Managerial","BEHV-04"],
  ["Decision Making","Behavioural & Managerial","BEHV-05"], ["Change Management","Behavioural & Managerial","BEHV-06"]
];

function buildPrompt(text) {
  const list = COMPETENCIES.map(c => `${c[2]} | ${c[0]} | ${c[1]}`).join("\n");
  return `You write assessment questions for officers in India's Official Statistical System.

From the training material below, write 10 multiple-choice questions.

Rules:
- Every question must be answerable from the material. Do not invent facts.
- Exactly one option is correct. The other three must be plausible but clearly wrong.
- Tag each question to ONE competency from this list, using its exact ID and name:
${list}

Return ONLY a JSON array. No markdown, no backticks, no commentary. Each element:
{"outcome":"STAT-02-a","comp":"Sampling","domain":"Statistical","q":"question text","options":["a","b","c","d"],"answer":0,"why":"one sentence explaining why the correct option is correct"}

"answer" is the 0-based index of the correct option. "outcome" is the competency ID plus -a.
"comp" and "domain" must match the list exactly. Keep "why" to one short sentence.
Keep every field brief. The whole array must fit in one reply.

TRAINING MATERIAL:
${text.slice(0, MAX_TEXT_CHARS)}`;
}

function json(body, status, origin) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Vary"] = "Origin";
  }
  /* 204 and 304 replies may not carry a body */
  const payload = (status === 204 || status === 304) ? null : JSON.stringify(body);
  return new Response(payload, { status, headers });
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/* Google issues two kinds of key. Standard keys (starting "AIza") work in a
   request header. Keys bound to a service account (starting "AQ.") are only
   accepted as ?key= in the address. This runs server-side, so the key is still
   never seen by the browser either way.
   Try the address form first; if Google says the key is invalid, try the
   header form once before giving up. */
async function callGemini(model, key, text, signal) {
  /* Thinking makes Gemini slow; 10 MCQs don't need it. 2.5 models take a
     token budget, newer ones take a level. If a model rejects the setting,
     we resend without it. */
  const thinking = /2\.5/.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
  const makeBody = withThinking => JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(text) }] }],
    generationConfig: Object.assign(
      { temperature: 0.4, maxOutputTokens: 6000, responseMimeType: "application/json" },
      withThinking ? { thinkingConfig: thinking } : {})
  });
  const url = `${API_BASE}${model}:generateContent`;
  const send = (body, useHeader) => fetch(useHeader ? url : `${url}?key=${encodeURIComponent(key)}`, {
    method: "POST", signal, body,
    headers: useHeader ? { "Content-Type": "application/json", "x-goog-api-key": key }
                       : { "Content-Type": "application/json" }
  });
  const errMsg = async r => { try { return (await r.clone().json())?.error?.message || ""; } catch (_) { return ""; } };

  let body = makeBody(true);
  let r = await send(body, false);
  if (r.status === 400 && /thinking/i.test(await errMsg(r))) {
    body = makeBody(false);
    r = await send(body, false);
  }
  if ((r.status === 400 || r.status === 401 || r.status === 403) &&
      /api key|credential|unauthenticated|permission/i.test(await errMsg(r))) {
    r = await send(body, true);
  }
  return r;
}

export default async function handler(request) {
  const origin = allowedOrigin(request.headers.get("origin") || "");
  const sameSite = !request.headers.get("origin");

  if (request.method === "OPTIONS") return json({}, origin ? 204 : 403, origin);
  if (!origin && !sameSite) return json({ error: "This website is not allowed to call the generator." }, 403, "");

  /* Strip spaces, line breaks and quotes that sneak in when a key is pasted */
  const key = (readEnv("STATSKILL_GEMINI_KEY") || readEnv("MCQ_Generator")).trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, "");

  /* Health check. Shows only the first 4 characters and the length, never the key. */
  if (request.method === "GET") return json({
    app: "StatSkill by Jeevesh Dev", ok: true, key: Boolean(key), starts: key.slice(0, 4), length: key.length, models: MODELS
  }, 200, origin);
  if (request.method !== "POST") return json({ error: "Use POST." }, 405, origin);
  if (!key) return json({ error: "No Gemini key on Netlify. Add a variable named MCQ_Generator under Project configuration > Environment variables, then redeploy." }, 500, origin);

  let text = "", model = "";
  try { const b = await request.json(); text = String(b.text || ""); model = String(b.model || ""); } catch (_) {}
  if (!text.trim()) return json({ error: "No document text was sent." }, 400, origin);

  /* ONE TRY WITH A NAMED MODEL
     The web page runs the 3 models x 3 tries loop itself and calls this once
     per try, so every try gets Netlify's full time limit to itself. */
  if (model) {
    if (!MODELS.includes(model)) return json({ error: `Unknown model ${model}.`, model }, 400, origin);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SINGLE_TRY_MS);
    let r;
    try {
      r = await callGemini(model, key, text, ctrl.signal);
    } catch (e) {
      clearTimeout(timer);
      return json({ error: e.name === "AbortError" ? "took too long to answer" : "could not reach Gemini", model },
                  504, origin);
    }
    clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      const cand = data?.candidates?.[0];
      const reply = cand?.content?.parts?.map(p => p.text || "").join("") || "";
      return json({ text: reply, model, finishReason: cand?.finishReason || "", by: "StatSkill by Jeevesh Dev" }, 200, origin);
    }
    let detail = "";
    try { detail = (await r.json())?.error?.message || ""; } catch (_) {}
    return json({ error: `${r.status}${detail ? " — " + detail : ""}`, model }, r.status, origin);
  }

  const started = Date.now();
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - started);
  let lastErr = "no model responded";
  let lastStatus = 502;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (timeLeft() < 4000) return json({ error: "Gemini took too long. " + lastErr }, 504, origin);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeLeft() - 1000);
      let r;
      try {
        r = await callGemini(model, key, text, ctrl.signal);
      } catch (e) {
        clearTimeout(timer);
        lastErr = e.name === "AbortError" ? "Gemini took too long to answer." : "Could not reach Gemini.";
        lastStatus = 504;
        break;
      }
      clearTimeout(timer);

      if (r.ok) {
        const data = await r.json();
        const cand = data?.candidates?.[0];
        const reply = cand?.content?.parts?.map(p => p.text || "").join("") || "";
        return json({ text: reply, model, finishReason: cand?.finishReason || "", by: "StatSkill by Jeevesh Dev" }, 200, origin);
      }

      let detail = "";
      try { detail = (await r.json())?.error?.message || ""; } catch (_) {}
      lastErr = `${r.status}${detail ? " — " + detail : ""}`;
      lastStatus = r.status;

      /* busy or rate-limited: one short retry, then the next model */
      if ((r.status === 503 || r.status === 429) && attempt < 2) { await wait(1500); continue; }
      /* retired model, or still busy: next model */
      if (r.status === 404 || r.status === 503 || r.status === 429) break;
      /* bad key or bad request: retrying will not help */
      return json({ error: lastErr }, r.status, origin);
    }
  }
  return json({ error: lastErr }, lastStatus >= 400 ? lastStatus : 502, origin);
}
