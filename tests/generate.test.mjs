/* ============================================================================
   StatSkill — tests for the question generator (netlify/edge-functions/generate.js)
   Author: Jeevesh Dev · Team DevOOPS · SIH26101

   Run with:  npm test      (needs Node 18 or newer, nothing to install)

   Gemini is never called for real. A fake `fetch` stands in for Google and
   replies however each test tells it to, so the tests are fast, free and
   never need an API key.
   ============================================================================ */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/edge-functions/generate.js";

/* ---------- fake Netlify environment ---------- */
let env = {};
globalThis.Netlify = { env: { get: name => env[name] } };

/* ---------- fake Google ----------
   `replies` is a queue: each call to fetch takes the next one.
   `calls` records what the function sent, so tests can check it. */
let replies = [];
let calls = [];
globalThis.fetch = async (url, opt) => {
  calls.push({
    url,
    keyInUrl: url.includes("key="),
    keyInHeader: opt.headers["x-goog-api-key"],
    body: JSON.parse(opt.body)
  });
  const next = replies.shift() || { status: 200 };
  const body = next.status === 200
    ? { candidates: [{ content: { parts: [{ text: next.text || '[{"q":"x"}]' }] }, finishReason: "STOP" }] }
    : { error: { message: next.msg || "error" } };
  return new Response(JSON.stringify(body), { status: next.status });
};

const request = (method, { origin, body } = {}) =>
  new Request("https://statskill.netlify.app/api/generate", {
    method,
    headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });

const send = async (method, opts) => {
  const res = await handler(request(method, opts));
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { res, data };
};

beforeEach(() => {
  env = { MCQ_Generator: "AQ.TESTKEY123" };
  replies = [];
  calls = [];
});

/* ============================== health check ============================== */

test("health check reports a key is set, without revealing it", async () => {
  const { res, data } = await send("GET");
  assert.equal(res.status, 200);
  assert.equal(data.key, true);
  assert.equal(data.starts, "AQ.T");          // only the first 4 characters
  assert.equal(data.length, 13);
  assert.ok(!JSON.stringify(data).includes("TESTKEY123"), "full key must never be returned");
});

test("health check reports a missing key", async () => {
  env = {};
  const { data } = await send("GET");
  assert.equal(data.key, false);
});

test("health check lists the models the page should try", async () => {
  const { data } = await send("GET");
  assert.ok(Array.isArray(data.models) && data.models.length === 3);
});

/* ============================== reading the key ============================== */

test("STATSKILL_GEMINI_KEY works as the variable name too", async () => {
  env = { STATSKILL_GEMINI_KEY: "AQ.OTHER" };
  const { data } = await send("GET");
  assert.equal(data.starts, "AQ.O");
});

test("GEMINI_API_KEY is ignored (Netlify's AI Gateway overwrites it)", async () => {
  env = { GEMINI_API_KEY: "eyJhbGciOiJIUzI1NiJ9.gateway-token" };
  const { data } = await send("GET");
  assert.equal(data.key, false);
});

test("spaces, line breaks and quotes pasted around the key are removed", async () => {
  env = { MCQ_Generator: '  "AQ.CLEAN\n"  ' };
  const { data } = await send("GET");
  assert.equal(data.starts, "AQ.C");
  assert.equal(data.length, 8);
});

test("a missing key gives a clear message naming the variable", async () => {
  env = {};
  const { res, data } = await send("POST", { body: { text: "material" } });
  assert.equal(res.status, 500);
  assert.match(data.error, /MCQ_Generator/);
});

/* ============================== one try with a named model ============================== */

test("a named model gets exactly one try and the reply comes back", async () => {
  replies = [{ status: 200, text: '[{"q":"What is sampling?"}]' }];
  const { res, data } = await send("POST", { body: { text: "material", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 200);
  assert.equal(data.model, "gemini-3.8-flash");
  assert.match(data.text, /What is sampling/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /gemini-3\.8-flash:generateContent/);
});

test("the key is sent as ?key= first (needed for AQ. keys)", async () => {
  await send("POST", { body: { text: "material", model: "gemini-3.8-flash" } });
  assert.equal(calls[0].keyInUrl, true);
});

test("if Google rejects the key in the address, it is retried once in a header", async () => {
  replies = [{ status: 400, msg: "API key not valid. Please pass a valid API key." }, { status: 200 }];
  const { res } = await send("POST", { body: { text: "material", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].keyInUrl, false);
  assert.equal(calls[1].keyInHeader, "AQ.TESTKEY123");
});

test("a model that rejects the thinking setting is asked again without it", async () => {
  replies = [{ status: 400, msg: "thinkingLevel is not supported for this model" }, { status: 200 }];
  const { res } = await send("POST", { body: { text: "material", model: "gemini-3.6-flash" } });
  assert.equal(res.status, 200);
  assert.ok(calls[0].body.generationConfig.thinkingConfig);
  assert.equal(calls[1].body.generationConfig.thinkingConfig, undefined);
});

test("a busy model's 503 is passed back so the page can retry", async () => {
  replies = [{ status: 503, msg: "high demand" }];
  const { res, data } = await send("POST", { body: { text: "material", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 503);
  assert.match(data.error, /503/);
  assert.equal(data.model, "gemini-3.8-flash");
});

test("a retired model's 404 is passed back so the page moves on", async () => {
  replies = [{ status: 404, msg: "no longer available" }];
  const { res } = await send("POST", { body: { text: "material", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 404);
});

test("a model not on the list is refused (stops misuse as a free proxy)", async () => {
  const { res, data } = await send("POST", { body: { text: "material", model: "gemini-ultra-pro" } });
  assert.equal(res.status, 400);
  assert.match(data.error, /Unknown model/);
  assert.equal(calls.length, 0);
});

/* ============================== the prompt ============================== */

test("the prompt is built on the server and includes the document text", async () => {
  await send("POST", { body: { text: "UNIQUE_MARKER about sampling", model: "gemini-3.8-flash" } });
  const prompt = calls[0].body.contents[0].parts[0].text;
  assert.match(prompt, /UNIQUE_MARKER/);
  assert.match(prompt, /STAT-01/);          // competency list is included
  assert.match(prompt, /BEHV-06/);
});

test("very long documents are trimmed before being sent", async () => {
  const long = "x".repeat(50000);
  await send("POST", { body: { text: long, model: "gemini-3.8-flash" } });
  const prompt = calls[0].body.contents[0].parts[0].text;
  assert.ok(prompt.length < 12000);
});

test("empty text is refused", async () => {
  const { res } = await send("POST", { body: { text: "   " } });
  assert.equal(res.status, 400);
});

/* ============================== who may call it ============================== */

test("GitHub Pages sites may call it", async () => {
  const { res } = await send("POST", { origin: "https://jeeveshdev17.github.io", body: { text: "t", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://jeeveshdev17.github.io");
});

test("Netlify deploy previews may call it", async () => {
  const { res } = await send("POST", { origin: "https://deploy-preview-3--statskill.netlify.app", body: { text: "t", model: "gemini-3.8-flash" } });
  assert.equal(res.status, 200);
});

test("other websites are blocked", async () => {
  const { res } = await send("POST", { origin: "https://someone-else.example.com", body: { text: "t" } });
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test("ALLOWED_ORIGINS can lock it to chosen sites only", async () => {
  env.ALLOWED_ORIGINS = "https://only-this.github.io";
  const { res } = await send("POST", { origin: "https://another.github.io", body: { text: "t" } });
  assert.equal(res.status, 403);
});

test("browser preflight (OPTIONS) is answered", async () => {
  const { res } = await send("OPTIONS", { origin: "https://jeeveshdev17.github.io" });
  assert.equal(res.status, 204);
  assert.match(res.headers.get("access-control-allow-methods"), /POST/);
});
