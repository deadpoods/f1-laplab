# Extension verification — 8 October 2026

## Completed automated checks

`npm test` passes the existing nine physics/data checks and ten new experiment/game checks (19 test groups across three test files).

- Every sweep cell matches a fresh physical solver run; inputs are immutable; sector deltas sum to the lap delta.
- Duplicate axes, grid bounds and discrete-age errors are rejected.
- Coverage comes from training records and original driver/car pairings; fuel/setup remain explicitly unobserved.
- Stints conserve entered fuel, increment/reset tyre age, add pit loss once, and retain complete cumulative timing; invalid/fuel-starved projections are rejected.
- Server requirements reject changed fixed variables, illegal setup budgets and excess energy deployment.
- Private tests are counted; repeated IDs and locks are idempotent; opponent tests/capability hashes stay hidden.
- Simulated five-round matches share a start, conceal winners before the finish, require both readiness signals, and handle ties/final totals.
- Real room controller logic with a test store rejects outsiders/third players/expired rooms/stale rounds and preserves simultaneous locks. This test store is never a production backend.

## Completed browser checks

- Actual one-axis fuel sweep: nine full runs, 1:28.20 baseline; changing mass changes computed lap/sector time.
- Actual two-axis fuel/wing sweep: 45 full runs; six themes retain the identical 1:28.20 working result and all 45 cells.
- Stint: eight laps from 20 kg and tyre age 3, 2.115 kg/lap illustrative burn. Fuel ends at 3.08 kg and tyre age reaches 10. Soft/medium comparison and cumulative table are computed by the solver.
- All six new experiment layouts have no page overflow at desktop and 390 px mobile.
- Theme transitions were adjusted to allow navigation clicks through their visual overlay.
- Applying the fastest sweep point transfers fuel 5 kg / wing +2 to Simulation and produces the same 1:27.34 computed result.
- The coverage dialog displays actual matched training ranges; the selected 23.4°C track temperature is outside NOR/MCL38's Silverstone training range.
- A generated stint CSV was downloaded and inspected: header, strategies, fuel accounting, lap and cumulative times are populated.
- An invalid 30-lap / 20 kg projection displays the 64.5 kg requirement while retaining the previous eight-lap result. Inputs remain editable for recovery.
- Competition navigation and explicit missing-backend state were checked before provisioning. No local fake room store is substituted.

## Completed shared-backend checks

- Dedicated Free-plan Supabase project, recorded `laplab_private_rooms` migration, native Deno Edge Function. Player capabilities authenticate the function; database credentials remain server-side.
- Direct publishable-key probes: both private tables and the internal CAS RPC return 401; missing player capability returns 401; an unsupported browser origin returns 403.
- Security advisor: only informational “RLS enabled, no policy” notices for intentionally server-only tables. See deployment documentation for the explanation and source.
- Live API probes pass idempotent creation, invalid invitation, third-player rejection, outsider access, stale rounds, setup-budget enforcement, fixed-field rejection, idempotent tests and opponent privacy.
- Two actual browser players completed all five rounds against durable storage. Simultaneous lock clicks retain both trajectories; both clients show matching scores and results. Round times A/B: 87.19/87.92, 80.14/80.43, 72.34/72.84, 92.55/92.92, 87.48/89.71 seconds (display-rounded). Final points 5:0; displayed totals 6:59.70/7:03.83.
- Race clocks differed by approximately 0.04 s in the observed check; refreshing the second player during the first lap resumed at the shared elapsed time.
- Private tests were invisible to the opponent. An Attack test in round four was rejected by the 1 MJ deployment constraint; both Conserve setups completed the round.
- A separate real live race was checked in all six visual directions: no document overflow at 1280 px desktop or 390 px mobile. Two cars and an advancing shared clock remained present through direction changes.
- All five rounds run even when one player has won the majority. Final scoring and the “Create another match” state are shown to both players.

## Completed production checks

- Vercel production deployment `dpl_HTWdEiZV3qh8BmfFVKFfrrX5T7eA` is READY at https://f1-laplab.vercel.app. The original model and data versions remain 0.1.0 / 2024.1.
- On the public origin, the fuel/wing grid computes 45 runs with the same 1:28.20 baseline and 1:27.34 best point. The eight-lap stint computes and the coverage dialog exposes the matched training ranges.
- Two public-origin players created and joined a durable room, locked different valid setups and raced at 1× time. The finish announcement “Aero Garage crosses first.” was observed while the other car was still running; both full results then appeared, 1:27.53 / 1:28.64, with matching round score and sector explanations.
- README image and relative document links resolve to the reviewed files. Screenshots show actual solver runs and actual shared-room races.

## Publication

Source repository: https://github.com/deadpoods/f1-laplab. Final source upload and X showcase publication are still in progress at the time of this record; do not treat those as completed verification.
