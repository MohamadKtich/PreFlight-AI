# PreFlight AI

Pre-production creative intelligence for evaluating video concepts against Oriane video evidence.

## Run & Operate

- Install dependencies with `pnpm install --frozen-lockfile`.
- Start the managed workflows `artifacts/preflight-ai: web` and `artifacts/preflight-ai: API Server` using Replit's Run/workflows controls.
- The web workflow runs `pnpm --filter @workspace/preflight-ai run dev` with `PORT=18108` and `BASE_PATH=/`.
- The API workflow runs `pnpm --filter @workspace/api-server run dev` with `PORT=8080`.
- Open the root preview `/`; `/api` is routed to Express by Replit's shared proxy, not a Vite proxy.
- Service routing and environment settings are declared in `artifacts/preflight-ai/.replit-artifact/artifact.toml`.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret for live evidence: `ORIANE_API_KEY`, stored server-side in Replit Secrets. Restart the API workflow after adding or changing it.
- Without the key, the app opens but live searches fail; the existing UI explicitly labels any illustrative demo fallback. Live search success must not be claimed until tested with a valid key.
- `DATABASE_URL` is managed by Replit for the shared DB package; the current search flow does not use database tables or require a schema push.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/preflight-ai` — existing React/Vite application, visualizations, scoring, and creative outputs.
- `artifacts/api-server` — Express API and server-side Oriane integration.
- `lib/api-spec/openapi.yaml` — API contract; generated clients and validation live in sibling `lib` packages.
- `artifacts/mockup-sandbox` — imported design sandbox; not needed to run the main app.

## Architecture decisions

- Preserve the working server-side Oriane Live integration as the source of truth for Run PreFlight. All future intelligence features and visualizations must use the real Oriane results returned by the run whenever available; never substitute mock, demo, or hardcoded evidence for a successful live response.
- Demo/illustrative evidence is permitted only as a clearly labeled fallback when Oriane fails. A successful search with no relevant results must remain a live empty result. Keep `ORIANE_API_KEY` server-side, and preserve the existing API route, scoring, Evidence, Make It Better, and working Run PreFlight flow.

## Product

Creative brief intake, evidence search, PreFlight scoring, opportunity mapping, evidence analytics, suggested hooks/scripts/storyboards, and presentation mode. Scores support decisions and do not guarantee campaign performance.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
