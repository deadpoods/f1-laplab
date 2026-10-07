# F1 LapLab visual reference research

Research completed 7 October 2026. Applied the Visual Taste & Design Direction skill. This is an independent design recommendation, not a claim that LapLab has professional telemetry accuracy.

## Rendered interfaces actually inspected

1. **ATLAS Waveform**, official McLaren/Motion Applied documentation. Read the documentation, then opened the actual screenshot in the browser and visually inspected it. Black graph canvas, a narrow left numeric legend with colored parameter names and units, thin grid lines, blue speed and red stepped gear traces, a white cursor and a red reference cursor, and a shaded interval between them. It is a data workspace rather than a conventional dashboard. [Documentation](https://docs.atlas.mclarenapplied.com/key-functionality/analyse/viewer/displays/waveform/) · [Viewed screenshot](https://docs.atlas.mclarenapplied.com/key-functionality/analyse/viewer/displays/assets/waveform.png).

2. **AiM RaceStudio 3 Time–Distance workspace**, official documentation screenshot. Opened the screenshot directly and visually inspected it. Main chart spans most of the width; the left column has channel names, cursor values, and units. A small track view occupies the lower left. A corner/straight stripe above the chart supplies numbered geometric context; a common black crosshair ties the time/distance chart to the map. A delta curve gets its own shallow band under the main trace, and the bottom lap storyboard supports selection. [Documentation](https://www.aim-sportline.com/docs/racestudio3/manual/html/analysis.html) · [Viewed screenshot](https://www.aim-sportline.com/docs/racestudio3/manual/html/_images/RSA3_TimeDistanceView.png).

3. **AiM RaceStudio 3 Split Report**, official documentation screenshot. Opened the screenshot directly and visually inspected it. A broad numeric split table remains the principal object; selecting a split supplies a speed trace, segment statistics, and a matching highlighted section of a circuit map at the right. This is a useful interaction model for LapLab's corner-by-corner explanatory comparison. [Viewed screenshot](https://www.aim-sportline.com/docs/racestudio3/manual/html/_images/RSA3_SplitTimesReport.png).

4. **Cosworth Pi Toolbox**, official product-page screenshot/hero. Opened the product page and the underlying large image, then visually inspected both. The product image is a composite with a central promotional overlay, so it provides weaker compositional evidence than the first two. Nevertheless, behind it are docked charcoal telemetry panels, a channel tree, a circuit map with a position marker, and weather maps. The relevant principle is simultaneous track, vehicle, and weather context; the overlay and marketing treatment should not transfer. [Product page](https://www.cosworth.com/motorsport/products/pi-toolbox/) · [Viewed image](https://www.cosworth.com/media/qmgdzy0m/tb13-hero-1.png?width=1000&height=500&v=1dc5ad232c0cb40).

MoTeC's historical i2 feature-guide URL returned 404, and its current product-page extraction failed. The ATLAS NASCAR PDF also failed to load. Do not say those interfaces were visually inspected. The current Cosworth product PDF was readable as text, but the screenshot tool returned text-only and the in-app browser rendered a blank PDF; visual findings above rely on the rendered product image instead.

## Recommended coherent direction

**An engineering notebook that can run a lap.** This audience needs to adjust conditions, observe what changed, and audit the evidence. Make the circuit, traces, and scientific limits the memorable elements. Begin in the working lab; do not add a sports-photo hero, athlete cards, score tiles, glossy gradients, or a generic feature grid.

Use an almost-black neutral canvas (#101214), slightly lighter working panels (#181B1E), thin cool gray rules (#30353A), off-white primary text (#F0F1ED), and quiet gray supporting text (#A3A9AE). A restrained amber/papaya (#F2A55B) is the current scenario and action color. Comparison B can use pale cyan (#7CCED0). Use green/red only with signed text for gain/loss, and keep tyre compound colors confined to compound indicators. Color should label data and state rather than decorate surfaces. These are design choices, not technical source claims.

Use a sharply readable humanist/grotesk sans for labels and prose; use a real monospace with tabular numerals for lap times, controls' values, chart axes, and telemetry. Suitable implementation choice: IBM Plex Sans + IBM Plex Mono with local/system fallbacks. Compact labels around 11–12 px, values and controls 13–15 px, section titles 17–21 px, primary lap time 44–56 px. Avoid letterspaced microtext as the sole label on a control. Uppercase is useful only for short metadata such as SECTOR 02 or ESTIMATED.

Keep shape quiet: 3–6 px corners, nearly no shadows, crisp 1 px borders and separators. One panel frame per real workspace, not an independent floating card around every statistic. Use dense aligned rows, inset numerical fields, and proper units. Give the track room while keeping the controls and traces visible within a practical first desktop viewport.

## Workspace composition

- **Compact top bar:** F1 LapLab mark, Simulation / Compare / Methodology navigation, dataset era and model version, save-scenario action. Add a small honest status line: "Physics estimate · public telemetry calibration".
- **Left experiment rail (~280–310 px):** circuit, driver/car pairing and era, session and tyre selection; then grouped Conditions, Car & energy, and Driver inputs. Keep essential controls visible. Advanced inputs belong in expandable sections only where they actually affect the engine. Each group has a concise provenance badge/tool tip: observed / estimate / assumption.
- **Main top workspace:** selected circuit name and concise profile on the left; large predicted lap with uncertainty and delta to pinned reference on the right. Beneath, a generous real circuit drawing with small numbered corner labels, sector boundaries, DRS strips, neutral map grid, and a restrained selected car marker. Beside/below the track, synchronized current speed, gear, throttle, brake, energy/aero state, sector and elapsed distance. The car marker is animated; the rest of the shell should stay calm.
- **Telemetry below:** large width and shared distance ruler. Speed gets the deepest band; throttle/brake and gear/energy use thinner bands; delta receives a separate signed band. Every plot has a visible unit, cursor value, and matching line key. The current cursor crosses all bands and highlights the correct circuit position. Do not smooth stepped gear/aero state into decorative curves. A corner stripe above the chart gives spatial context from the circuit model.
- **Analysis adjacent/lower:** sector/corner split table, a signed contribution list/waterfall, and sensitivity rows. Mechanism prose should be a compact factual sentence supported by changed modeled channels. "Setup B gains here through lower drag" should appear only when the engine's outputs establish that mechanism.

## Confidence and workflow details

Place model uncertainty next to the headline lap time rather than burying it in sources. Separate the scenario identity, era and tyres from confidence; neither a green dot nor an attractive animation implies empirical validation. Historical validation needs a table of sample, predicted, actual, error, and train/hold-out status. Driver profile rows should explicitly show where data is absent instead of a radar chart with invented traits.

Distance is the default comparison axis because it keeps corners aligned across different lap times, following ATLAS's comparison workflow. Playback can still be time-based, with sampling converted to simulated distance for synchronization. Provide pause, playback rate, arrow-key scrub, click/hover on chart/track, and a persistent readout so touch users get equivalent information.

Scenario comparison works best with an A/B identity strip and stable colors throughout the circuit, traces, splits and explanations. Saving a scenario should preserve inputs, model version and circuit-data version; render a real empty state before anything has been saved. Sensitivity should show the perturbed amount with units and signed modeled lap effect, plus an assumptions link.

On small screens, present experiment controls in a drawer or expandable first section, then lap estimate, track, and trace bands in a single scroll. Keep the telemetry ruler and selected readout usable, make controls at least touch-sized, and avoid shrinking the desktop table into unreadable microtype. Numerical plots can have controlled horizontal scrolling.

## Review criteria for the delivered interface

Inspect desktop and mobile renders. The first glance should identify what is selected, the estimated result, confidence, and the next meaningful adjustment. One changed input must visibly alter the trace/circuit behavior, headline result, and explanation together. Track and data cursor must agree at braking zones. Ensure subdued text still has sufficient contrast; gains/losses and provenance remain understandable without color. Remove every decorative element that competes with the circuit or trace. If the visual shell could become a football dashboard merely by swapping labels, it is too generic.

Browser reference tab was closed after research; no application files or Sites were edited.
