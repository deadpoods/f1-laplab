# Contributing

Run `npm test` before proposing a change. Keep UI presentation separate from the solver and preserve all six directions, mobile layouts, reduced-motion support and keyboard access.

For a model extension, document its mechanism, units, provenance and uncertainty. Distinguish observed data, calibrated estimates and assumptions. Unsupported setup variables should wait for a defensible model rather than gain cosmetic sliders.

Preserve the chronological training/holdout split. Do not tune to held-out errors. Re-run and publish validation when changing physics; explain which domains are still unvalidated. Driver residuals should stay modest and telemetry-grounded.

For multiplayer changes, keep the server authoritative, preserve capability privacy, validate every input, test simultaneous actions/retries and exercise two real clients. Never commit service credentials or private room access tokens.

Include focused verification for changed behaviour and a screenshot when a visual composition changes. Respect the separate data, photo and font licenses in `docs/attribution.md`.
