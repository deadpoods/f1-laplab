# F1 LapLab verification — 7 October 2026

## Automated model checks

Nine substantive Node test cases pass. They verify:

1. Training/held-out separation, four 600-bin circuit profiles and complete observed traces.
2. Monotonic integrated time, sector/corner totals and replay time/distance round trips.
3. Increasing fuel and tyre age slows the model across all four circuits.
4. Distinct drivers and cars alter actual speed traces; circuit characteristics change their effects.
5. ERS power, per-lap transfer and state-of-charge limits; braking closes DRS; race eligibility and wet closure.
6. Active inputs change modeled forces/time, including setup, atmospheric conditions, utilization and traffic. Conditional controls are exercised in their relevant context.
7. Unknown entities, nonfinite/out-of-range inputs and wet/slick combinations are rejected; suitable exploratory wet tyres are accepted.
8. Counterfactual contribution sums, sector/corner comparison integration and local phase integration reconcile with the complete lap. Cross-circuit comparisons are rejected.
9. Bounded extreme scenarios remain finite; out-of-range sensitivity perturbations return explicitly unavailable results.

## Browser checks

Tested the actual site in the Codex in-app browser at the normal desktop viewport and at 390 × 844 for mobile responsiveness. Browser warning/error logs were empty at the final telemetry inspection.

- Default Silverstone scenario: Norris/MCL38, 20 kg fuel, three tyre laps, recorded track temperature +4 °C, grip 1.005: 1:28.20, with ±2.4 s indicative envelope.
- Changing driver to Piastri changed that result to 1:28.34; an additional 1 kg fuel changed it to 1:28.38.
- Changing the circuit to Monza produced 1:20.91 for the same driver/car/fuel/tyre age, with circuit reference conditions reset. Changing car to SF-24 produced 1:20.78 and an explicit driver/car transplant warning.
- Replay visibly moved/rotated the car on the sampled circuit. Scrubbing to the finish reached 5,793/5,793 m at 1:20.78 on Monza.
- Copy A to B produced exactly +0.00 s. Adding 1 kg to B produced a modeled −0.03 s A-minus-B delta, with a sector and accumulated-phase explanation.
- Monza sensitivity returned different local results for fuel, tyre age, temperature, grip, wind and aero trim, with sector effects.
- Historical validation filtering displayed the appropriate 28 Monza hold-out rows.
- The optional OpenF1 check successfully matched all 17 Silverstone held-out timings, preserving the bundled calibration.
- Mobile document width matched the 390 px viewport with no horizontal page overflow; the configuration panel started collapsed and exposed functional controls when expanded.
- Rain with soft tyres was rejected with a clear configuration error, the previous valid result stayed visible and saving was disabled. Switching to intermediates recovered to 1:56.11 with ±16.9 s and explicit exploratory warnings. Returning to dry/soft recovered normally.
- The notebook showed an actual empty state. Saved a named valid scenario, reloaded and confirmed the name, inputs and modeled lap persisted. Scenario exports/imports have version, size and value checks in the controller.
- Telemetry CSV export produced the generated-channel notice. Speed, pedals, gear and cumulative delta rendered together with a shared cursor and distance axis.

## Critical assessment against the requested final test

| Question | Result and practical limitation |
| --- | --- |
| Do input changes affect the simulation? | Yes. Complete solver runs respond to inputs; conditional inputs are described. |
| Are driver differences meaningful? | Yes, they affect braking/traction/corner utilization locally. Residuals are deliberately modest and confounded; no fictional personality or universal wet rankings. |
| Are circuit differences meaningful? | Yes. Real sampled positions, corner envelopes, straights, DRS stretches, distance, timing boundaries, aero trim and tyre demand affect physics. Geometry is approximate. |
| Are car differences meaningful? | Yes. Effective power, drag, grip, braking and traction fits change the trace. They are estimates, not proprietary parameters. |
| Are major contributors represented? | Yes: aero, mass, acceleration, braking, grip/traction, effective tyre state, atmosphere, wind, ES deployment, DRS, driver utilization and traffic. Missing dynamics are explicit. |
| Is animation synchronized? | Yes. Replay uses integrated solver time and distance, the same cursor as telemetry. Gear/RPM are derived channels. |
| Can the user understand why time changed? | Sector/corner differences, accumulated phase explanations, force mechanisms, ordered counterfactuals and sensitivity experiments are available. Explanations describe the model, not proven causality in a real driver. |
| Are claims researched? | Primary sources and downloaded historical timing/car/location/weather/stint records are included. Calibration uses multiple early laps; later laps remain held out. |
| Are assumptions labeled? | Observed/regulated, estimated/calibrated and assumed states have separate markers, source notes, a coefficient register, explicit deferred factors and error envelopes. |
| Is this an engineering product? | The core workflows execute real experiments and inspect the same progressive model. Robustness includes input validation, stale-response protection, worker/fallback execution, caching, API failure fallback and local persistence. |

The largest remaining scientific limitation is identification: sparse public telemetry cannot uniquely separate driver, car, setup, fuel, track evolution and tyre preparation. The measured held-out error and uncertainty should accompany any exported conclusion. Broader circuits, higher-rate measurements and transient dynamics can be added through the modular circuit/vehicle/state interfaces.
