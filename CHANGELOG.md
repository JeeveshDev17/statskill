# Changelog

All notable changes to StatSkill. Newest first.

StatSkill by Jeevesh Dev · Team DevOOPS · SIH26101

## [1.0.0] — 2026-11-22

First public release.

### Added
- **Live AI question generation** from uploaded PDFs, `.txt` and `.md` files, using Google Gemini through a Netlify edge function.
- **33-competency tagging** from problem statement SIH26101, with tags checked against the official list.
- **Competency profile:** scores by domain with a 60% threshold, named gaps, and an explanation for each.
- **Course recommendations** from 35 iGOT Karmayogi and NSSTA courses. Every competency has at least one course.
- **QuML export** for the Sunbird platform behind iGOT Karmayogi.
- **3 models × 3 tries:** `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-flash-lite-latest`, with progress shown on screen.
- **Honest fallback** to 10 reviewed sample questions, with the reason for every failed try listed.
- **Health check** at `/api/generate` that shows only the first 4 characters of the key.
- **25 automated tests** and GitHub Actions checks, including a secret scan.
- Sample training PDF, sample QuML export, screenshots and full documentation.

### Security
- The API key lives only in Netlify's environment variables, never in the page or the repository.
- The key is read from `MCQ_Generator` (or `STATSKILL_GEMINI_KEY`), because Netlify's AI Gateway overwrites `GEMINI_API_KEY`.
- The key is sent as `?key=` with a header retry, so newer `AQ.` keys work.
- Only approved models and approved websites may use the function.

### Fixed
- Gemini replies were too slow for Netlify's time limit. Thinking is now turned down, and each try is its own request.
- A gap could lose its course recommendation when more than 6 courses matched. Every gap now gets its best course first.
- Pasted keys with stray spaces, line breaks or quotes are now cleaned automatically.

[1.0.0]: https://github.com/JeeveshDev17/statskill/releases/tag/v1.0
