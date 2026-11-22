# Security

StatSkill by Jeevesh Dev · Team DevOOPS · SIH26101

## How the Gemini API key is protected

| Rule | How it is enforced |
|---|---|
| The key is never in the page | `index.html` has no key. It calls `/api/generate`, and only the Netlify edge function talks to Gemini. |
| The key is never in this repository | It is stored only in Netlify's environment variables. `tests/check-repo.mjs` fails if anything that looks like a Google key or token appears in any file, and GitHub Actions runs a [gitleaks](https://github.com/gitleaks/gitleaks) scan of the full history on every push. |
| The key is never sent back to the browser | The health check (`GET /api/generate`) returns only `true`/`false`, the first 4 characters and the length. This is tested. |
| The function can't be used as a free Gemini proxy | It builds its own question-writing prompt, trims the input, and accepts only its 3 approved models. |
| Only approved websites may call it | Netlify sites, GitHub Pages sites and local testing are allowed by default. Set `ALLOWED_ORIGINS` on Netlify to allow only specific addresses. |

### Environment variable name

Use `MCQ_Generator` (or `STATSKILL_GEMINI_KEY`). **Do not use `GEMINI_API_KEY`.** Netlify's AI Gateway fills that name with its own token, which Google rejects.

## If a key is ever exposed

If a key is pasted into a chat, committed, shown in a screenshot or posted anywhere public:

1. **Delete it immediately** at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Deleting it makes it useless, even if someone has copied it.
2. **Create a new key.**
3. In Netlify, open the `MCQ_Generator` variable, paste the new key into **Value** and save.
4. **Deploys → Trigger deploy → Deploy site.**
5. If it was committed to Git, deleting the file isn't enough, because the old commit still contains the key. Rotating the key (steps 1–4) is what actually protects you.

## Recommended settings

- **GitHub:** Settings → Code security → turn on **Secret scanning** and **Push protection**. GitHub then blocks a push that contains a key.
- **Google Cloud:** set a daily request limit on the Generative Language API for the key's project, so misuse can't run up large usage.
- **Netlify:** set `ALLOWED_ORIGINS` to your exact site addresses once they are final.

## Reporting a problem

If you find a security issue, **please don't open a public issue.** Contact the maintainer through the email on the [GitHub profile](https://github.com/JeeveshDev17) with:

- what you found,
- how to reproduce it, and
- what someone could do with it.

You'll get a reply as soon as possible. Please give a reasonable time to fix it before sharing details publicly.

## Data handling

- Uploaded documents are read **in the browser** with pdf.js. They are never stored.
- Up to 6,000 characters of text are sent, through the Netlify function, to Google's Gemini API to write the questions. Don't upload confidential documents to the public demo.
- Answers and results stay in the browser and are gone when the page is refreshed.
