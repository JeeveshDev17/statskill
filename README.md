# StatSkill

**AI competency assessment for India's Official Statistical System.**
Smart India Hackathon 2026 · Problem Statement **SIH26101** · Ministry of Statistics and Programme Implementation

Built by **Jeevesh Dev** · Team **DevOOPS** (OCT, CSE-B, First Year)

---

## What it does

1. A trainer uploads a training document (PDF or text).
2. Gemini writes 10 multiple-choice questions from it, each tagged to **one** of the 33 competencies named in the problem statement.
3. An officer answers them.
4. Scores roll up by competency and domain. Anything below 60% becomes a named gap.
5. Each gap is matched to a real iGOT Karmayogi course or NSSTA programme, with a link.

Questions can also be exported as **QuML**, the question format iGOT's assessment engine reads.

If the AI is unavailable for any reason, the app runs a reviewed bank of 10 sample questions, so it never shows a blank screen.

## How the API key is kept secret

```
Browser (index.html)  ──text──▶  /api/generate  (Netlify edge function)  ──▶  Gemini
                      ◀─questions─              reads GEMINI_API_KEY
```

There is **no API key anywhere in this repository**. The key is stored on Netlify as an environment variable. The edge function in `netlify/edge-functions/generate.js` reads it, calls Gemini, and returns only the questions.

The GitHub Pages copy calls the same Netlify function, so it gets live AI too.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: page, design and logic |
| `netlify/edge-functions/generate.js` | Server function that holds the key and calls Gemini |
| `netlify.toml` | Tells Netlify there is no build step |
| `LICENSE` | MIT licence |

## Run it

- **Live:** open the Netlify or GitHub Pages link.
- **Locally:** open `index.html` in a browser. It calls the Netlify function set in `NETLIFY_SITE` near the top of the script.

## Deploy your own copy

1. Fork or push this repo to GitHub.
2. On Netlify: **Add new site → Import an existing project → GitHub →** pick the repo. Leave the build command empty and the publish directory as `.`.
3. **Site configuration → Environment variables → Add a variable:** `GEMINI_API_KEY` = your key. Then **Deploys → Trigger deploy**.
4. Put your Netlify address in `NETLIFY_SITE` in `index.html`.
5. Optional: on GitHub, **Settings → Pages → Deploy from a branch → main / root**.

## Licence

MIT © 2026 Jeevesh Dev
