# Live visual system verification — 7 October 2026

## Simulation invariant

The existing nine substantive physics/data tests passed after the presentation changes. No calibration was run. Git object hashes remain identical to the pre-theme version:

| File | Unchanged object hash |
| --- | --- |
| `dist/engine.mjs` | `2357a931cca7cbcb53ac8b9d7948ae32730fd095` |
| `dist/worker.mjs` | `df7f3baef291958170753fe17925651cb19b44bb` |
| `dist/data/dataset.json` | `27a4dfe51d18566e5ca35bb25cc38dabb386bb9a` |

The app controller changes only add classes to its existing circuit SVG elements. The theme adapter contains no imports of the engine or worker and no solver, scenario or playback commands.

## Exact browser state check

Used a deliberately non-default Silverstone experiment: Scenario A Piastri/SF-24, 31 kg fuel and three tyre laps; Scenario B Russell/W15, 21 kg fuel. The driver/car transplant warning remained explicit. Scenario A predicted **1:28.59**, with its existing ±3.6 s indicative envelope. Enabled the actual observed NOR overlay and added ERS/lateral channels.

Captured all A/B input values, compound pressed states, lap/envelope/delta, sector/corner/contribution/comparison/sensitivity text, complete SVG trace paths, selected channels, observed checkbox, notebook count, cursor distance/time/readouts and car transform. For each of the six directions, this complete capture had the same SHA-256:

`85725b184dc94cda41642fdec78b0c1324e27eb0dd21689a6cc0fd93cfb6d59f`

No duplicate DOM IDs occurred. Theme switching did not recalculate or change any included output.

## Playback and responsive checks

- During uninterrupted 4× replay, switched through all six directions. Elapsed times advanced from 00:39.17 to 00:54.23; every switch retained “Pause simulated lap”, the same 1:28.59 result and ready model status. Paused normally afterward.
- Inspected all six actual desktop compositions at the normal 1,280 × 720 viewport.
- Inspected the 820 × 900 tablet breakpoint. All six page widths equaled 820 px. Engineering retained a compact result strip; the cinematic replay/image stage remained usable; Lap Score retained a primary waveform/circuit composition.
- Inspected all six at 390 × 844. All six page widths equaled 390 px, with no horizontal page overflow. The native selector exposed the full six theme names.
- Repeated an exact state comparison across all six mobile directions; the captures were identical.
- Expanded the actual mobile configuration and changed through every direction. The expanded state, visible original controls and 390 px page width survived. Collapse remained functional.
- Compare, Sensitivity and Research retained the selected view and lap through theme changes. Desktop and mobile view widths were checked independently.
- The design-notes chooser applied a selected direction, closed its native modal and returned focus to its invoking button. The theme preference restored on reload. Pressed state, a labeled select, polite feedback, visible focus styling and reduced-motion handling are implemented.
- CSV activation displayed the existing notice identifying generated channels. Browser download-event capture timed out, so a file-byte comparison was not verified; no export code was changed.

The original product verification remains in `verification.md`. This turn's checks concern preservation and presentation; they do not increase the scientific accuracy claimed for the model.

## Remaining practical limits

The archival photographs are contextual, not images of the selected scenario. The futuristic direction shows simulated playback, not a live race-control feed. Engine assumptions, held-out errors and unsupported factors remain exactly as documented in the app.

Static caching includes the new local fonts, images and presentation modules. Document/script/style requests prefer current resources on reload and use the bundled cache as fallback. A fresh offline hosted session was not exercised in this turn. The optional external OpenF1 timing check was not repeated because the dataset and research controller were unchanged.
