/* ============================================================================
   StatSkill — repository checks
   Author: Jeevesh Dev · Team DevOOPS · SIH26101

   1. The JavaScript inside index.html must parse (catches a broken page
      before it is deployed).
   2. No file may contain something that looks like a real Google API key.
   3. The model list in the page must match the one in the server function.
   ============================================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "index.html"), "utf8");
const server = readFileSync(join(root, "netlify/edge-functions/generate.js"), "utf8");

test("the script inside index.html parses", () => {
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
  assert.ok(scripts.length > 1000, "expected the app script to be present");
  assert.doesNotThrow(() => new Function(scripts));
});

test("no file contains a Google API key", () => {
  const skip = new Set([".git", "node_modules", ".netlify"]);
  const keyLike = [
    /AIza[0-9A-Za-z_-]{35}/,          // standard Google API key
    /AQ\.[0-9A-Za-z_-]{30,}/,         // service-account-bound key
    /eyJhbGci[0-9A-Za-z_-]{20,}/      // a token pasted by mistake
  ];
  const walk = dir => readdirSync(dir).flatMap(name => {
    if (skip.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const file of walk(root)) {
    if (/\.(png|jpg|jpeg|gif|pdf|zip|ico)$/i.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const re of keyLike) {
      assert.ok(!re.test(text), `possible API key in ${file.replace(root, "")}`);
    }
  }
});

test("page and server try the same models", () => {
  const list = src => (src.match(/\[\s*"gemini-[^\]]+\]/) || [""])[0].replace(/\s/g, "");
  const inPage = list(page.slice(page.indexOf("GEN_MODELS")));
  const inServer = list(server.slice(server.indexOf("const MODELS")));
  assert.ok(inPage.length > 0 && inServer.length > 0);
  assert.equal(inPage, inServer, "update GEN_MODELS in index.html and MODELS in generate.js together");
});
