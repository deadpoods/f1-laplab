# Parameter sweeps, calibration coverage and stint projections

## Sweeps

Capture the working scenario at run time. Each point changes only its axes and calls the complete solver. Output: lap time, captured-baseline delta and three sector deltas. One axis permits 2–31 points; two axes permit 2–11 each, at most 121. Duplicate axes, out-of-range bounds and fractional discrete ages/wing steps are rejected. Inputs are never mutated.

Changing the working scenario does not rewrite completed experiments. Applying a point restores its full captured configuration. CSV retains deltas. The best cell is the model's sampled minimum, not a measured optimum or proof of a global optimum.

## Coverage

Evidence availability, not an accuracy score: circuit samples, matched original driver/chassis samples, dry soft qualifying context, observed temperature/age ranges in matching training rows. Unmatched pairs use circuit-fleet ranges with an explicit label. Holdout counts are separate and never define training ranges.

- **Reference domain:** these checks have supporting samples.
- **Extrapolating:** at least one check falls outside available reference.
- **Exploratory:** damp/wet or a nonzero water proxy.

Fuel/setup/ES remain unobserved. Wind, evolution and response maps remain assumptions even inside those checks. Circuit MAE describes the held-out samples, not personalized certainty for the current inputs.

## Stint projection

1–30 flying laps and at most one tyre stop. For zero-indexed lap `i`:

```
fuel_start = initial_fuel − burn_per_lap × i
fuel_end = fuel_start − burn_per_lap
solver_fuel = (fuel_start + fuel_end) / 2
tyre_age = initial_age + i       # before stop
tyre_age = i − stop_after_lap    # after stop
lap_elapsed = solver_time + entered_pit_loss_on_stop_lap
```

Strategy B changes only the starting compound. Both share fuel, stop lap/loss, post-stop compound, driver and conditions. The full projection is rejected if fuel falls below the entered reserve or age exceeds 40 laps. Tyre validation matches the single-lap solver.

Fuel burn is an **assumption**. The starter divides an illustrative 110 kg race budget by published race laps (52/53/78/57). It is not fuel telemetry or a claimed 2024 cap. The value has historical FIA precedent in 2019; the 2024 sporting text inspected here does not establish that total cap. A 1 kg reserve and optional 20 s pit loss are editable illustration settings, not universal measured requirements. No refuelling occurs.

Weather/utilization remain fixed. Each lap resets ES to 4 MJ. MGU-H, continuous battery carryover, standing starts, flags/safety cars, warmup/graining/blistering, pit trajectories and a stint uncertainty distribution are omitted. This is a modular flying-lap projection, **not a validated continuous race simulation**.

## Sources

- [FIA 2024 technical regulations](https://api.fia.com/sites/default/files/fia_2024_formula_1_technical_regulations_-_issue_6_-_2024-04-30.pdf): mass, fuel-flow, ES/K limits.
- [FIA 2024 sporting regulations](https://api.fia.com/sites/default/files/fia_2024_formula_1_sporting_regulations_-_issue_7_-_2024-07-31.pdf): refuelling context; do not infer the old total-fuel cap.
- [FIA 2024 media kit](https://www.fia.com/sites/default/files/f1_gp_mco_2024_official_media_kit_gb.pdf): selected race lap counts.
- [FIA 2019 explanation](https://www.fia.com/news/auto-26-closing-gap): historical 110 kg context, distinct from 2024.
- [Pirelli on graining](https://www.pirelli.com/global/en-ww/race/racingspot/formula-1/it-s-graining-men--124082/) and [2024 stint review](https://press.pirelli.com/all-the-2024-season-stats-from-the-earth-to-the-moon-almost-with-formula-1s-pirelli-tyres/): age alone cannot establish degradation, and no numerical friction map is public here.
