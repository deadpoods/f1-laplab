# Deployment and operations

## Vercel frontend

Other/static framework, `outputDirectory: dist`, empty build/install commands. The local lab needs no secrets or live timing API. `dist/rooms-config.mjs` contains only a public Supabase function URL/publishable key.

Before release: `npm test`, actual browser results across six directions/mobile, intended Vercel account/project, two real room clients against the durable store. Preserve preview deployment protection. Change the service-worker cache version with static assets.

## Room backend

Choose a dedicated Supabase project with the user's organization and plan/cost confirmed. Apply `backend/schema.sql` as a recorded migration through Supabase tooling/Management MCP. It is idempotent, enables RLS, revokes anonymous/authenticated grants, and creates service-role-only compare-and-swap/rate RPCs.

Deploy `backend/index.ts` as `laplab-rooms`, including:

```
backend/index.ts
backend/rooms.mjs
dist/game.mjs
dist/engine.mjs
dist/data/dataset.json
```

The backend uses Supabase-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` runtime variables. No SDK dependency. `verify_jwt=false` permits account-free rooms; the handler implements random player-capability authentication and checks membership on every action. Creation/join are rate-limited. This does not grant browser database access.

Configure explicit allowed frontend origins, then the public URL/key in `rooms-config.mjs`. Never commit `.env`, access tokens, browser state or service-role keys. Run security advisors and prove a publishable key cannot read room rows or call internal RPCs.

The security advisor reports informational [RLS enabled with no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notices for the two server-only tables. This is intentional: no anonymous/authenticated table access is permitted. Do not add browser policies to suppress the notice. Direct public-key probes must remain denied.

## Post-deploy checks

1. Create from one client, join from another.
2. Test different setups; prove opponent tests stay private.
3. Lock simultaneously; retain both setups and one start time.
4. Refresh mid-race; resume from shared elapsed time.
5. Conceal winner until the leading car crosses the finish.
6. Finish five rounds including the energy requirement, and verify points/tiebreak.
7. Check full/expired rooms, invalid invites, stale rounds, illegal settings and reconnect errors.

Rooms require network access. Paused/unavailable database errors remain recoverable; local experiments still work. Free-plan quotas/pausing apply. Review storage/egress and invocations as usage grows; no automatic plan upgrade or infrastructure purchase is implemented.

## API

POST `{action, roomId, token, ...}` to the function. Actions: `create`, `join`, `status`, `test`, `lock`, `next`. Test/lock/next require current `round`; tests use unique `actionId`. Settings permit only listed setup keys. Client timing/scores are never authoritative.

Responses contain the brief, readiness, caller's tests, common start, locked trajectories, timed finish/results. Never capability hashes, service credentials or opponent tests. `knownVersion`/`hasRace` avoid redundant trajectory transfers.
