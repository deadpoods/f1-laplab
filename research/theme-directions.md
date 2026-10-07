# F1 LapLab — six live visual directions

Research and implementation: 7 October 2026. Applied the Visual Taste & Design Direction skill. This is presentation research; it supplies no physics coefficients, historical telemetry or claims of professional accuracy.

## Brief and design criteria

The product is an interactive engineering experiment: choose a scenario, inspect its progressively calculated lap, trace a difference and audit the evidence. Each visual interpretation must retain the same scientific information and working interactions. The experiment should remain immediately usable, including while a theme changes. References supply principles, not copied layouts, trademarks or proprietary typefaces.

## Rendered references inspected before implementation

| Primary reference | Actual inspection and relevant principle | Translation into LapLab |
| --- | --- | --- |
| [Apple Logic Pro](https://www.apple.com/logic-pro/) | Opened and visually inspected the rendered product page, including its isolated instrument canvas, generous neutral space, quiet navigation and clear typographic hierarchy. | A spacious circuit/result pair, a horizontal settings shelf and broad, precise plots. Manrope supplies an independent typographic voice; no Apple font, branding or page replica. |
| [Netflix Media Center — Drive to Survive](https://media.netflix.com/en/only-on-netflix/80204890) | Inspected the rendered page: dark image-led presentation, strong title/synopsis hierarchy and restrained color. | A panoramic archive-image/replay stage, condensed display headings, result ribbon and lower analysis deck. No streaming catalogue, show poster or fabricated race imagery. |
| [ATLAS Waveform](https://docs.atlas.mclarenapplied.com/key-functionality/analyse/viewer/displays/waveform/) | Actual official screenshot inspected in the original research: numeric channel legend, thin grids, shared cursor and separate waveform bands. RaceStudio and Pi Toolbox references are documented in `visual-research.md`. | A docked workbench with results above settings, circuit and telemetry; compact numerical rows and workbook navigation. |
| [Type 7](https://type7.com/) | Opened and inspected the rendered photographic cover, prominent editorial headline and spare publication rhythm. | An asymmetric archive-photograph/lap-figure spread, serif masthead, numbered technical figures, captions and long ink rules. The inputs remain an experiment column. |
| [NASA Eyes](https://eyes.nasa.gov/apps/solar-system/) | Waited for the actual scene to load and inspected its spatial object, thin orbital paths, edge cards and bottom control/status area. | The circuit becomes the central working object, with edge inspectors, a navigation rail and aligned telemetry deck. Frames create depth without fictional live feeds, decorative metrics or neon effects. |
| [Pattern Radio — Google / NOAA](https://patternradio.withgoogle.com/) | Entered the live experience and inspected the actual large spectrogram, shared playhead, annotations and edge controls. | Lap Score makes existing distance-based traces the graphic composition. The oversized lap figure and companion circuit lead to the real waveform canvas; a bottom navigation strip and lower input rack complete the instrument. No new frequency/spectrogram data is invented. |

Additional creator-document research informed the experimental direction: [Dear Data](https://www.dear-data.com/theproject), [Radio Garden / Moniker](https://studiomoniker.com/projects/radio-garden) and [Chrome Music Lab](https://github.com/googlecreativelab/chrome-music-lab). These sources support the idea that real data can create an individual visual signature, deciphered through a precise key. Their live interfaces were not visually inspected in this turn. The bounded research memo is preserved separately in `theme-art-research.md`; its web-only limitation applies to that pass. The parent agent subsequently inspected Pattern Radio in the browser, as recorded above.

## Six different compositions

| Direction | Structure and navigation | Type, density and data treatment |
| --- | --- | --- |
| Apple-inspired | Centered circuit and result; horizontal settings shelf; full-width telemetry; compact segmented navigation. | Manrope, generous spacing, cool neutral surfaces, soft panel frames, large clear result and fine plot lines. |
| Netflix-inspired | Panoramic photograph and replay share a stage; three-part result ribbon; settings beside the analysis deck; understated top links. | Oswald display headings, immersive dark surfaces, strong photographic contrast, bold traces and red scenario/action emphasis. |
| Motorsport Engineering Lab | Result/contribution strip above three docked panes: settings, circuit and telemetry. Workbook tabs remain above. | IBM Plex Sans/Mono, compact controls and channel legends, simultaneous numerical detail, crisp rules and restrained motion. |
| Editorial Motorsport | Photograph and oversized lap figure open an asymmetric spread; circuit and numbered traces continue beside the input column. Masthead navigation. | Instrument Serif display type with Plex analysis labels; warm paper and ink, captions, rules and intentional reading space. |
| Futuristic Race Control | Vertical navigation rail; configuration and results flank the large circuit object; a broad telemetry deck below. | Space Grotesk, pale technical accents, precise corner frames, subtle spatial depth and dashed reference/cursor treatments. |
| Experimental / Art Direction | Lap Score: oversized lap figure above the primary waveform canvas, circuit companion at right, splits/contributions below and an input rack at the bottom. Lower navigation strip. | Space Grotesk/Plex Mono, signal yellow and ink, square edges, asymmetric scale, large cursor values and waveform bands as the main graphic material. |

Mobile layouts retain their character while giving controls a usable expandable section and a native six-option selector. Lap Score moves the telemetry ahead of the circuit and settings; editorial and cinematic versions retain their archive photographs. Tablet compositions have dedicated intermediate arrangements. Navigation, all controls, the notebook, evidence, comparison and sensitivity remain available.

## Shared scientific and accessibility contracts

All six expose uncertainty next to the lap figure, signed reference deltas, observed/estimated/assumed markers, generated-channel labels and links to limitations. Photos are archive context and stay clearly separate from the solver. No theme changes model coefficients, speed/time arrays, sampled circuit coordinates, driver/car fitting or validation data.

The theme adapter moves the original panels rather than remounting the application. Focusable controls keep their values/listeners. The chooser uses native buttons with pressed state, a labeled mobile select, polite selection feedback and a named native modal that restores focus. View transitions are short, let input pass through, and are omitted for reduced motion or unsupported browsers. Existing keyboard lap scrubbing remains available. Color always accompanies labels, signed values or line patterns.

## Assets and provenance

Photographs are the actual Silverstone 2024 archive images by **Jen Ross**, licensed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/):

- [Norris / McLaren MCL38](https://commons.wikimedia.org/wiki/File:2024_British_Grand_Prix,_Norris_(1).jpg), downloaded as a 1,280 px Wikimedia thumbnail. Cinematic direction.
- [Russell / Mercedes W15](https://commons.wikimedia.org/wiki/File:2024_British_Grand_Prix,_Russell_(3).jpg), downloaded as a 1,280 px Wikimedia thumbnail. Editorial direction.

CSS scales, crops and shades these images; the bitmap files were not edited. Captions and design notes provide author, licence, origin links, circuit/year/car and archive status. A selected Monaco scenario does not relabel a Silverstone photograph.

Fonts were obtained from the official [Google Fonts repository](https://github.com/google/fonts): Manrope (`ofl/manrope`), Oswald (`ofl/oswald`), Instrument Serif (`ofl/instrumentserif`) and Space Grotesk (`ofl/spacegrotesk`). They are locally bundled with complete SIL Open Font License notices. The original IBM Plex Sans/Mono files and notices remain.

## Final visual assessment

The principal differences survive removal of the brand and selector: the circuit/result product canvas, photographic replay stage, docked workbench, asymmetric magazine spread, spatial console and large waveform score have different silhouettes, navigation locations and reading orders. This distinction comes from composition and the prominence of existing data, not additional invented features.

Actual browser renders were inspected at 1,280 × 720, 820 × 900 and 390 × 844. An early Lap Score composition placed contributions ahead of the waveform; it was revised to put telemetry immediately beneath the oversized lap figure. A tablet grid-specificity issue was corrected so result strips and spanning save actions retain their intended arrangement. See `theme-verification.md` for measured state preservation and responsive checks.
