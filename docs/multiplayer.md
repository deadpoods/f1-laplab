# Setup Duel — five-round friend competition

Two players receive the same brief. Permissible setup choices differ; identity and conditions are fixed. Cars are independent flying laps on a shared map, with no collision/overtaking/racing-line dynamics.

| Mode | Editable setup | Tests per round | Budget |
| --- | --- | ---: | ---: |
| Guided | Aero trim, front bias | 100 | 5 |
| Engineer | Trim, bias, ES strategy | 8 | 2.5 |
| Expert | Trim, bias, ES strategy; finer steps | 3 | 1.5 |

`|trim| + |bias − 56| / 3 ≤ budget` is a game constraint, not an FIA rule or measured garage resource. Integer trim: −2…+2. Bias: 50…65%, 0.5% steps (Expert 0.25%). MCL38/NOR, fresh soft tyres, dry qualifying, clean air are fixed. Recorded baseline temperatures and scenario fuel/weather appear in the brief.

## All five rounds

1. Silverstone: high-speed compromise, 20 kg, no wind.
2. Monza: drag versus deceleration, 15 kg, 12 km/h finish-straight tailwind.
3. Monaco: mechanical precision, 18 kg, 8 km/h crosswind.
4. Bahrain: conservation brief, 25 kg, 14 km/h wind; at most 1 MJ ES deployment (Conserve in this strategy abstraction).
5. Silverstone: crosswind final, 20 kg, 24 km/h crosswind.

These are game scenarios, not claimed event measurements. The backend recomputes every test and locked lap using the exact public solver/dataset; clients cannot submit accepted timing, winner or score.

Locking is final. Both locks create one server start timestamp five seconds ahead. Clients animate computed `s(t)` at **1× real time**, with approximate RTT-based clock alignment. Small lateral display offsets distinguish cars without changing distance/time. The winner appears when the first car finishes; results and sector explanations follow both finishes. Both players ready the next round.

One point per win; differences below 0.005 s share 0.5 each. This is a numerical game threshold, unrelated to predictive precision. All five rounds run, without early termination at three wins. Most points wins; equal points use total lap time, otherwise a shared victory.

## Access and recovery

- Durable Postgres state and a server-authoritative Edge Function; no production in-memory/localStorage room backend.
- Random 128-bit invite grants the remaining join slot. Separate random 256-bit player capabilities identify members. SHA-256 hashes are stored; raw tokens stay in tab storage and HTTPS request bodies.
- RLS tables have no anonymous/authenticated grants. Only backend service role access. RPCs use `SECURITY INVOKER`, service-role-only execution and an empty search path.
- Persisted version compare-and-swap handles simultaneous locks/tests/readiness. Repeated lock requests and test action IDs are idempotent. Stale-round submissions are rejected.
- Names, IDs, tokens, bounds and budgets are validated server-side. No room listing. UI text is escaped. Responses and requests are uncached.
- 24-hour expiry; expired room/rate rows are cleaned on room creation. Creation/join/play limits bound abuse; forwarded-IP limits are best-effort, not identity proof.
- Refresh/reconnect in the same tab restores access. Closing/losing tab storage may lose the capability. This MVP has no replacement players or capability recovery from an invite.
- Heartbeats back off on failures/hidden pages. Immutable trajectories are transmitted once per room version; reconnects retrieve them again.

Casual engineering challenge, **not secure esports anti-cheat**: the public model can be optimized externally and trajectories inspected. Room budgets limit built-in tests only. No wagers, paid contests, rankings or promises of real F1 fidelity.
