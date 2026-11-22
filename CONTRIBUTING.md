# Contributing to StatSkill

Thanks for helping. StatSkill is built by **Jeevesh Dev** and Team **DevOOPS** for Smart India Hackathon 2026 (SIH26101).

## Get the code

```bash
git clone https://github.com/JeeveshDev17/statskill.git
cd statskill
```

There is nothing to install. To see the app, open `index.html` in a browser.

## Make a change

1. **Create a branch** for your change:
   ```bash
   git checkout -b fix-upload-message
   ```
2. **Edit the files.** Most work happens in:
   - `index.html`: the page, design and app logic
   - `netlify/edge-functions/generate.js`: the server function that calls Gemini
3. **Run the tests** (needs Node 18 or newer):
   ```bash
   npm test
   ```
4. **Open the page in a browser** and try your change by hand.
5. **Commit with a clear message** that says what changed:
   ```bash
   git add -A
   git commit -m "Show file size in KB and MB on the upload screen"
   ```
6. **Push and open a pull request:**
   ```bash
   git push -u origin fix-upload-message
   ```
   Then open the pull request on GitHub and fill in the checklist.

## Rules that keep the project working

- **Never commit an API key, token or `.env` file.** The tests and the secret scan will fail, and the key must then be deleted and replaced. See [SECURITY.md](SECURITY.md).
- **Model lists must match.** If you change the models, change `GEN_MODELS` in `index.html` and `MODELS` in `generate.js` together. A test checks this.
- **Competency lists must match.** The 33 competencies appear in both files. See [docs/competency-framework.md](docs/competency-framework.md).
- **No blank screens.** Every failure must lead somewhere usable and say why on screen.
- **Keep it one file.** The app stays a single `index.html` with no build step, so it can be opened anywhere.

## Commit message style

Start with a verb and say what the change does:

- ✅ `Add Hindi translation for the upload screen`
- ✅ `Fix course list hiding a gap's only course`
- ❌ `changes`
- ❌ `fixed stuff`

## Reporting bugs and ideas

Use the issue templates on GitHub. For a bug, include the exact banner text if one appeared, and never include an API key.
