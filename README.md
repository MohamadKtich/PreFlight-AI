# PreFlight AI

**Validate before you film.**

PreFlight AI is a pre-production creative intelligence application built during the Oriane × Replit hackathon. It helps brands and creative teams evaluate a video concept before production by grounding the decision in live video evidence from Oriane.

## What it does

- Searches Oriane for relevant real-world video evidence
- Produces a transparent PreFlight Score and recommendation
- Evaluates five signals: Performance Signal, Saturation Risk, Hook Freshness, Creator Diversity, and Evidence Strength
- Ranks evidence by heuristic relevance
- Visualizes the concept in a Creative Opportunity Map
- Provides interactive evidence analytics
- Suggests an evidence-guided Hook, Script, and Storyboard
- Includes a Presentation Mode for live demos

## Important note

PreFlight AI provides evidence-backed creative decision support. It does **not** guarantee or predict campaign performance.

## Tech stack

- React
- TypeScript
- Vite
- Node.js / Express
- Oriane API
- Recharts
- Framer Motion
- pnpm workspaces

## Environment variables

Create your own local environment configuration. Do not commit secrets.

```text
ORIANE_API_KEY=your_oriane_api_key_here
```

The Replit workspace also uses environment-specific values such as `PORT` and `BASE_PATH`.

## Security

API credentials are expected to remain server-side. This public package intentionally contains no `.env` files, Git history, Replit caches, installed dependencies, or build output.

## Project structure

- `artifacts/preflight-ai` — main React application
- `artifacts/api-server` — server-side API and Oriane integration
- `lib` — shared workspace packages
- `scripts` — workspace scripts

## Hackathon

Built as a standalone product for the video economy, with Oriane video intelligence at the core of the workflow.
