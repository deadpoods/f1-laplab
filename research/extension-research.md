# Extension research — 8 October 2026

The existing physics/source review was retained before extending the model. New experiments compose the solver rather than inventing added seconds.

- [2024 FIA technical regulations](https://api.fia.com/sites/default/files/fia_2024_formula_1_technical_regulations_-_issue_6_-_2024-04-30.pdf) constrain mass, fuel flow and ES/K paths. The existing ES-only approximation remains; stint resets are explicit.
- [2024 sporting regulations](https://api.fia.com/sites/default/files/fia_2024_formula_1_sporting_regulations_-_issue_7_-_2024-07-31.pdf) were inspected. **No 110 kg total cap was found in this text.** The illustrative budget is not presented as a 2024 regulation. [FIA 2019 explanation](https://www.fia.com/news/auto-26-closing-gap) supplies historical context.
- Race lap counts: Silverstone 52, Monza 53, Monaco 78, Bahrain 57. An assumed budget divided by these is a transparent preset, not telemetry. [FIA 2024 media kit](https://www.fia.com/sites/default/files/f1_gp_mco_2024_official_media_kit_gb.pdf).
- [Pirelli graining explanation](https://www.pirelli.com/global/en-ww/race/racingspot/formula-1/it-s-graining-men--124082/) and [2024 season review](https://press.pirelli.com/all-the-2024-season-stats-from-the-earth-to-the-moon-almost-with-formula-1s-pirelli-tyres/) do not supply transferable numeric wear curves. The disclosed map is reused; warmup/graining/tyre sensors are not fabricated.
- Coverage comes from actual training rows and separate holdout counts. Unobserved fuel/setup/ES prevents a defensible accuracy percentage.
- Sweeps retain complete sector deltas. Minima are sampled model minima, not measured optimal setups.
- Game budgets/difficulty/weather are design rules, distinguished from facts. The server uses the public solver and exact integrated trajectories; no random pace, crash personalities or predetermined winners.

The Supabase changelog was fetched before backend work. The 5 October framework-adapter deprecation does not affect this dependency-free Deno handler. Current function authentication and RLS docs informed custom capability checks and service-only tables. [Changelog](https://supabase.com/changelog.md), [function auth](https://supabase.com/docs/guides/functions/auth), [data security](https://supabase.com/docs/guides/database/secure-data).

The six established directions also govern new pages: docked engineering graphs; Apple horizontal control shelves; Netflix archive-backed brief; Editorial figures with outer-column notes; Future circuit-edge instruments; Experimental real signal as graphic hero. Original visual references/credits remain in `theme-directions.md`.
