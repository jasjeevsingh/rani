# Repository Guidelines

## Project Structure & Module Organization
RANI is an Electron desktop app paired with a Next.js renderer. `src/` holds the main process, window orchestration, and domain features (`ask`, `listen`, `research`, `settings`); IPC bridges live in `src/bridge/`, preload logic in `src/preload.js`, and shared UI in `src/ui/`. `pickleglass_web/` contains the Next 14 + Tailwind renderer, `functions/` hosts Firebase Cloud Functions, and build outputs land in `dist/`. Treat `docs/` and `data/` as reference-only.

## Retrieval-Augmented Generation (RAG)
- Document ingestion (`documentService`) still chunks extracted text into `document_chunks`, but embeddings now run entirely through the local Ollama daemon.
- `DocumentEmbeddingService` calls the `qwen3-embedding:8b` model at `OLLAMA_BASE_URL` (defaults to `http://localhost:11434`); no OpenAI keys are required. Run `ollama pull qwen3-embedding:8b` before generating embeddings.
- At question time, `DocumentRetrievalService` embeds the query with the same local model, pulls the top-scoring chunks, and `AskService` injects them into the prompt.
- The assistant UI (`AskView`) renders retrieved sources as a footnote (“Sources […]”) appended below the response, replacing the previous full-width context card.

## Build, Test, and Development Commands
- `npm run setup` installs dependencies, builds `pickleglass_web`, and boots the desktop app.
- `npm run start` rebuilds the renderer (`build:renderer`) and opens Electron for local work.
- `npm run build:web` compiles the Next bundle; `npm run build` wraps that plus `electron-builder` packaging.
- `npm run watch:renderer` streams esbuild output for renderer tweaks; Next-specific changes run via `cd pickleglass_web && npm run dev`.
- `npm run lint` runs ESLint across JS/TS; pair with `npx prettier --check .` before submitting.

## Coding Style & Naming Conventions
Prettier enforces 4-space indentation, 150-character lines, semicolons, and single quotes. Use `camelCase` for functions and variables, `PascalCase` for React/Electron components, and `SCREAMING_SNAKE_CASE` for constants. Keep IPC channel identifiers explicit (`listen:session-ended`) and resolve ESLint warnings rather than disabling them.

## Testing Guidelines
Automated coverage currently relies on Node scripts in the repository root. Run or extend `node test-arxiv-search.js`, `node test-arxiv-debug.js`, and `node simple-test.js` when modifying research or ingestion flows, keeping the `test-*.js` naming convention. For renderer changes, add component or integration tests (`*.test.tsx`) under `pickleglass_web/` and note any manual verification steps in your PR until a formal `npm test` command exists.

## Commit & Pull Request Guidelines
Recent history mixes informal summaries with Conventional Commits; converge on `<type>: <present-tense summary>` such as `feat: add zotero sync toggle`. Keep each commit focused on one concern. Pull requests should outline scope, list commands run (`npm run lint`, relevant test scripts), link issues, and include screenshots or screen recordings when UI changes. Request reviewers who own the touched area and confirm build artifacts stay clean before merge.

## Security & Configuration Tips
Store API keys and Firebase credentials in `.env` or the system keychain—never in git. When adding providers, update `src/features/common/services` and confirm settings in `firebase.json` and `electron-builder.yml`. If you introduce native modules, keep `notarize.js` and entitlements aligned so packaging succeeds on all platforms.
