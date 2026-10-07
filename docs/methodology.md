# Simulation methodology and data

## Architecture

`dist/engine.mjs` is a DOM-independent solver. A circuit profile contains 600 equally spaced distance bins. Effective curvature is inferred from early qualifying speed and approximate public position data; it is **not a surveyed racing-line radius**. Forward acceleration and backward braking passes close the speed profile around the circuit. Time is integrated from distance and speed. The same arrays feed replay, plots, sector/corner integration and comparisons.

Aerodynamic forces use dynamic pressure and coefficient-times-area values. Tyre capacity includes a modest assumed load-sensitivity exponent and a friction ellipse. Brake bias limits each axle using assumed wheelbase, centre-of-gravity height and weight distribution. Electrical deployment is integrated against actual model time and constrained to 120 kW, 4 MJ ES→K and 2 MJ K→ES. MGU-H flows are omitted. Generic speed-based gear selection and observed RPM/speed ratios create **derived** channels, not a gearbox simulation.

`dist/worker.mjs` runs complete model experiments off the UI thread with a bounded in-memory cache. `dist/app.mjs` rejects invalid states, debounces inputs and ignores stale responses. A bundled research snapshot permits use without a live external API. A service worker caches the static site on the hosted origin; it is disabled on localhost to avoid stale development assets.

`dist/research.mjs` exposes the evidence taxonomy, all coefficients and limitations. Every control is connected to a physical or explicitly assumed mechanism. Conditional inputs are explained: wind direction requires nonzero wind; following gap matters when following; race DRS needs an eligible gap. Unsupported setup variables have no cosmetic sliders.

### Presentation adapter

`dist/theme-boot.js` restores a validated browser-local visual preference before paint. `dist/themes.mjs` manages only the theme attribute, selection state, archive photograph and order of the original panels. It moves existing DOM nodes rather than mounting another application. It has no engine imports, model reads, solver calls, playback commands or new data parameters. `dist/themes.css` defines six independent compositions, responsive arrangements, navigation treatments, type systems and trace/map styling. The controller's only rendering additions are SVG classes for styling existing geometry. The single-lap solver and reference dataset are shared across every visual direction and experiment.

Theme changes use a brief view transition where supported, with an immediate fallback and reduced-motion support. Inputs, A/B outputs, saved scenarios, expanded controls, selected channels, the observed overlay and replay cursor remain in the original nodes. Changing themes while a lap plays does not restart or pause it. The preference is independent of saved simulation scenarios. The service worker includes all new presentation assets, refreshes documents/scripts/styles on reload and retains cached fallbacks for offline use.

## Data, preparation and calibration

`research/raw/` includes the unmodified downloaded JSON used by preparation, plus the selected-lap manifests. Public OpenF1 session keys: Silverstone 9554, Monza 9586, Monaco 9519 and Bahrain 9468. Approximate turn annotations are from MultiViewer's 2024 circuit endpoints and were checked against FIA event maps. Source links and the underlying API queries are preserved in the data and in the app.

The first two eligible soft flying laps per driver/circuit supply **62 training laps**. Later eligible soft laps supply **117 held-out laps**. Eligibility requires complete sectors, no pit-out flag and a lap within 3.5% of that driver's session best. The selection threshold uses session outcomes, so this is not a fully blind sampling protocol. There is no comprehensive race-control/deleted-lap filtering. Pérez had no eligible Silverstone soft traces and is excluded there.

Distance is obtained by trapezoid-integrating observed speed and normalized to the official circuit length. OpenF1 car data is roughly 3.7 Hz, brake is binary and positions are approximate. No unavailable steering, brake pressure, tyre temperature or proprietary car channels have been fabricated.

To reproduce the bundled dataset using the downloaded files, install NumPy in a Python environment and run:

```sh
python3 tools/prepare-data.py
node tools/calibrate.mjs
npm test
```

Preparation resets fitted circuit scales. Calibration fits an effective drag scale to the maximum median training speed and an effective curvature scale to the mean training lap time across multiple samples. It then evaluates the held-out rows. **Do not fit using those held-out errors.** `tools/download-data.py` can retrieve the original public inputs again, subject to API availability and rate limits.

## Validation and practical limits

| Circuit | Held-out laps | Mean absolute error | 90th-percentile absolute error |
| --- | ---: | ---: | ---: |
| Silverstone | 17 | 1.385 s | 2.034 s |
| Monza | 28 | 0.750 s | 1.089 s |
| Monaco | 47 | 1.578 s | 2.160 s |
| Bahrain | 25 | 0.917 s | 1.292 s |

Overall mean absolute error is **1.211 s**. All residuals have a slower-prediction bias. Later qualifying improvement, unknown fuel and energy state, changing grip and the limited model remain important explanations. The implementation retains the error instead of correcting it with held-out outcomes.

The displayed error envelope starts at the circuit's held-out 90th-percentile error and adds declared heuristic allowances for departures from the calibration domain. It is **not a statistical confidence interval**. Hundredths help compare two solver runs, but do not describe real-world predictive precision. Validation of aggregate lap time does not validate every assumed sensitivity curve.

Fuel is constant for the single simulated lap. Tyre grip is a stationary effective state, not a full transient thermal model. Compound, wear, temperature, wetness, aero trim, wake/tow and driver margin response curves are explicit assumptions. Rain is a water proxy, not mm/hour. Wet scenarios are exploratory and have no aquaplaning or driver-specific wet model. Race mode is one flying lap, not a race or strategy simulator.

Elevation/gradient, surveyed radii/camber, kerb impacts, line optimization, suspension, ride-height aero maps, differential maps, tyre pressure, brake temperature, gusts/yaw, real gearing, exact PU maps and 2026 active aero/PU rules are deferred. The app explains why these require unavailable measurements or an expanded dynamics model.

## Research and verification

`research/physics-research.md` records the primary-source physics review. `research/visual-research.md` records the inspected ATLAS, RaceStudio and Pi Toolbox interfaces behind the visual direction. `research/verification.md` records the completed automated and browser checks against the user's ten final questions.

`research/theme-directions.md` documents the rendered references, six-way composition matrix, typography and photography credits behind the live visual system. `research/theme-verification.md` records the exact state-invariance and responsive checks.

