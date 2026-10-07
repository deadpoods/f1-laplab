# F1 LapLab: physics research and honest model boundaries

Research date: 7 October 2026. Reference era: **2024**. This is a research brief for implementation, not a claim that proprietary F1 parameters are publicly known. A 2024 DRS/hybrid model must not be advertised as a simulation of the substantially different 2026 regulations.

## Recommendation

Use a distance-domain, quasi-steady, semi-empirical lap solver. Public lap and speed data anchor the reference performance; Newtonian force balance produces changes in acceleration, braking, cornering and traction as conditions change. An independently held-out set of real laps evaluates the reference prediction. This is materially more defensible than adding arbitrary seconds for each slider.

The literature supports the architecture. Brayshaw and Harrison describe quasi-steady lap simulation and the importance of racing line and centre of gravity. A 2025 UFSC master's dissertation builds a hybrid point-mass solver from public 2024 F1 data, with a smoothed track and forward/backward speed passes, energy accounting and parameter calibration. These establish a useful method, **not an accuracy guarantee for this implementation**. [Brayshaw & Harrison, 2005](https://journals.sagepub.com/doi/10.1243/095440705X11211), [Noronha, UFSC, 2025](https://repositorio.ufsc.br/bitstream/handle/123456789/265790/PEMC2420-D.pdf?isAllowed=y&sequence=-1).

Every quantity should have one of three visible evidence labels:

1. **Observed / regulated:** actual timing, sampled telemetry, compound allocation, FIA limits, published circuit dimensions.
2. **Estimated / calibrated:** coefficients fitted to public observations, approximate geometry, teammate-centred performance residuals.
3. **Assumed:** unsupported response curves, unknown fuel or state-of-charge, simplified thermal state, unmeasured setup effects.

An estimated coefficient is not an observed technical specification. A physics relation can be sound while its inputs remain uncertain.

## Authoritative constraints

The FIA's 2024 power-unit energy-flow diagram distinguishes **4 MJ per lap from ES to MGU-K**, **2 MJ per lap from MGU-K to ES**, and a **4 MJ maximum ES state-of-charge swing**. MGU-K mechanical power is limited to **±120 kW**. MGU-H energy paths are not bounded by those K-to-ES/ES-to-K lap budgets. Consequently, 4 MJ is not a universal cap on all K propulsion when H can feed K. An ES-only MVP may enforce these budgets while stating that it omits MGU-H and real team energy control. [FIA 2024 Technical Regulations, Article 5.3.2, energy-flow diagram](https://www.fia.com/sites/default/files/fia_2024_formula_1_technical_regulations_-_issue_1_-_2023-04-25.pdf), [2024 Issue 6](https://api.fia.com/sites/default/files/fia_2024_formula_1_technical_regulations_-_issue_6_-_2024-04-30.pdf).

Mercedes' official W15 specification corroborates a 798 kg car, eight forward gears, a 1.6 litre V6, a regulatory ICE limit of 15,000 rpm and fuel flow of 100 kg/h above 10,500 rpm. Its ERS summary gives 120 kW K power and 2/4 MJ K recovery/deployment figures; the detailed FIA flow distinction above remains essential. Do not infer that the ICE routinely operates at 15,000 rpm, that its exact output is public, or that each car actually weighs exactly its minimum. [Mercedes W15 technical specification](https://www.mercedesamgf1.com/cars/2024).

## Factor evidence and implementation policy

| Factor | Defensible mechanism / available evidence | Suitable MVP treatment | What remains unknown |
|---|---|---|---|
| Downforce | Speed-relative-to-air and density create vertical aero load; greater normal load increases tyre force capacity. | `D = 0.5 ρ (CL·A) |v_air|²`; apply to braking, traction and cornering. | Full aero maps, front/rear load, yaw, pitch, ride height and load sensitivity. |
| Drag | Dynamic pressure times drag area opposes relative airflow. | `Fdrag = 0.5 ρ (CD·A) |v_air|²`, projected on the direction of travel. | Exact team/configuration drag area and cooling drag. |
| Aero configuration | Wing choices trade downforce against drag. | One explicit assumed wing tradeoff curve around the calibrated reference. | How much each real wing angle changes each team's car. |
| DRS | Opening the rear flap lowers drag and also changes downforce. | Change drag/downforce only inside verified activation zones; close on braking; respect selected session eligibility. | Exact whole-car reduction and transient aero response. |
| Fuel | More mass lowers acceleration for a given force and changes cornering/braking limits with aero and tyre load sensitivity. | Add fuel to vehicle mass and rerun the solver; optionally burn fuel progressively using a labelled estimate. | Actual qualifying fuel, fuel burn, centre-of-gravity migration. |
| ICE / power unit | Wheel force is torque/rolling radius or power/speed, bounded by rear tyre traction. | Fit effective wheel power from comparable straight accelerations, retain residual uncertainty. | Proprietary torque/power curves, mode, cooling derates, losses. |
| ERS deployment | Limited electrical power and energy alter acceleration. Harvesting shares rear braking demand. | Integrate power over simulated time with conservative ES-only accounting; display used/harvested energy. | Initial state-of-charge, H generation, conversion losses, actual strategy. |
| Gearing | Gear and RPM determine engine operating point. | Estimate RPM/speed ratio per observed gear, or expose gear as a derived telemetry approximation if the engine uses effective power. | Exact ratio/final drive, tyre rolling radius, shift control and shift losses. |
| Acceleration / traction | Rear tyre force and power independently constrain drive force. | Rear-axle force limit plus lateral-force sharing; no unlimited `P/v` at very low speed. | Differential torque distribution and transient slip. |
| Braking | Tyres, normal loads, balance, drag and available friction torque constrain deceleration. | Backward speed pass; drag contributes to slowing; ideally front/rear limits and longitudinal load transfer. | Brake torque maps, pressure, migration, full temperature-dependent friction. |
| Brake temperature | Cooling is speed-dependent; carbon friction suffers when too cold or hot. | Explain the omission, or show a strictly assumed thermal index; do not claim measured disc temperature. | Disc/pad thermal masses, duct coefficients, operating curve. |
| Tyre compound | Allocation and performance/degradation differences are real and track-dependent. | Map soft/medium/hard to each event's actual C-number and fit relative grip/pace from suitable data. | Complete compound friction curves and carcass construction. |
| Tyre age / degradation | Wear and heat history change pace; age alone is insufficient. | Fit a circuit/compound stint response after fuel, traffic and evolution correction; report uncertainty. | Detailed wear, graining, blistering, tyre preparation, exact fuel correction. |
| Tyre temperature | Grip has a working window; overheating can increase degradation. | A labelled unimodal grip correction, preferably with an effective tyre thermal state. | Exact 2024 compound windows, thermal constants and front/rear asymmetry. |
| Track temperature | Alters tyre heating, grip balance and degradation; not identical to tyre temperature. | Input to an assumed thermal model or empirical correction near the observed reference. | A universal optimum track temperature or seconds-per-degree relationship. |
| Tyre pressure | Matters for construction, contact patch, stiffness and temperature; event prescriptions differ. | Show FIA/Pirelli event limits as research information; keep unsupported adjustment disabled. | Car-specific pace optimum and full pressure/grip relationship. |
| Air temperature / pressure | Determine density; also affect cooling and the power unit. | Density physics enabled; explicitly omit unidentified cooling and turbo/power derates. | Exact team thermal management and power response. |
| Humidity | Water vapour changes air density. | Optional moist-air density correction; no separate arbitrary humidity time penalty. | Direct tyre/driver effects cannot be reliably inferred. |
| Wind | Changes local relative airflow along differently oriented circuit sections. | Use a vector and per-segment tangent; headwind raises drag and downforce together. | Crosswind aero/yaw sensitivity, gusts and exact compass orientation. |
| Elevation / grade | Uphill adds gravity resistance; altitude affects density. | Use surveyed/published elevation when available. Otherwise disable vertical dynamics. | OpenF1 z coordinates are not a survey-quality elevation profile. |
| Corner radius / line | `ay = v² κ`; path curvature determines lateral demand. | Smooth measured approximate positions or infer effective curvature from reference speeds, clearly labelled. | True racing-line radius, line optimization and lateral placement. |
| Camber / banking | Banking alters normal load and gravity's lateral component. | Enable only with sourced geometry; otherwise explicitly omitted. | Per-corner surveyed cross slope. |
| Kerbs / bumps | Affect suspension, contact and aero platform; not a fixed speed bonus. | Describe track characteristics; omit numeric effects unless geometry and a transient model exist. | Kerb profile, car compliance, tyre contact, floor strikes. |
| Asphalt | Roughness and surface affect mechanical grip and tyre heating/wear. | Circuit-specific calibrated grip/degradation, with qualitative Pirelli surface notes. | Exact friction maps and roughness spectra. |
| Track evolution | Rubbering, cleaning and conditions change grip over a session. | An explicit effective grip multiplier around the reference; empirical session fit if identifiable. | Separating driver improvement, fuel, tyres and grip from lap times. |
| Rain / water | Grip, cooling, tyre drainage, visibility and racing line change together. | Research-labelled exploratory wet grip model or restricted unsupported state; pair wet tyres with wet scenarios. | Water depth, drainage, aquaplaning and trustworthy wet driver ratings. |
| Traffic | Tow can reduce straight drag; wake can reduce cornering aero and compromise line. | An explicitly assumed wake/tow response with location/phase dependence, or omit. | Reliable universal penalty per second of following distance. |
| Driver entry / apex / exit | Comparable speed, brake-on and throttle observations can distinguish corner phases. | Teammate-centred, sample-specific residuals and observable event metrics. | Brake pressure, steering, trail-brake intensity, tyre management intent, true risk tolerance. |
| Aggression / consistency | Force utilization and repeated-lap variability are measurable in limited contexts. | User-controlled utilization margin, labelled a scenario assumption; consistency from repeat samples. | Stable personality scores or certain driver-specific risk effects. |
| Brake bias | Changes which axle reaches grip saturation. | Enable only with axle load/force modelling; a point mass cannot support a credible bias slider. | Real brake migration and dynamic balance. |
| Differential | Affects left/right torque distribution and entry/exit balance. | Disabled with limitation in a point-mass model. | Setup maps, wheel loads, slip and torque split. |
| Ride height | Changes ground-effect aero, floor clearance and ride response. | Disabled without an aero-height map and vertical suspension/track model. | Proprietary ride-height maps, oscillations and kerb clearance. |
| Track limits / compromised lines | Change path and driver behavior; deleted laps must not train clean-lap models. | Filter invalid laps where data permits; line compromises remain a labelled scenario. | Fine lateral location and a complete legality/track-width model. |

### Aero, wind and useful sanity checks

NASA gives the standard drag relation and emphasizes that coefficients depend on the chosen reference area and experimental conditions. Prefer coefficient-times-area quantities in m² so the simulator does not hide an arbitrary area convention. [NASA Glenn: Drag Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/).

Mercedes explains the downforce/drag tradeoff, floor contribution, headwind/tailwind response and low-density altitude effects. Its 2022 explainer gives an **order-of-magnitude** example: downforce around car weight at 150 km/h. Using the article's roughly 795 kg and an assumed 1.225 kg/m³ gives `CL·A ≈ 7.3 m²`; this is a **derived historical sanity check**, not a measured 2024 team coefficient or a universal default. No exact drag area follows from this example. [Mercedes: Downforce in Formula One, Explained](https://www.mercedesamgf1.com/news/feature-downforce-in-formula-one-explained).

A primary CFD/vehicle study shows DRS reducing rear-wing drag and downforce, but uses simplified NACA airfoils and a low-powered reference Formula vehicle. Do not transfer its wing-only percentages to a 2024 F1 whole-car drag slider. The trustworthy claim is the mechanism; the effect size needs calibration or an assumed parameter. [Dimastrogiovanni et al.: An improved active drag reduction system](https://journals.sagepub.com/eprint/EJQBC3VYIS6CEJFCRUQH/full).

Use meteorological wind convention explicitly: direction is the direction **from** which wind arrives. If map compass orientation is unknown, label it map-relative rather than pretending a north arrow is surveyed. A single fixed wind time penalty misses the fact that a car changes heading continuously.

### Tyres and setup

Pirelli's 2024 allocations were five dry compounds C1–C5: Bahrain C1/C2/C3, Monaco C3/C4/C5, and Silverstone C1/C2/C3. Soft is an event-relative label. Monaco has smooth road asphalt and particularly low tyre forces; Silverstone's fast combinations impose lateral forces over 5g. These are useful track-specific demands, not proof of exact corner grip coefficients. [Pirelli opening 2024 nominations](https://press.pirelli.com/pirelli-nominates-the-compounds-for-the-start-of-2024/), [Pirelli Monaco 2024 preview](https://press.pirelli.com/the-monaco-wheel-spins-round-to-70/), [Pirelli Silverstone 2024 preview](https://press.pirelli.com/the-hardest-compounds-for-the-cradle-of-formula-1/).

Mercedes states that track temperature affects tyre grip and degradation, that tyres need a working window, and that front/rear temperatures differ. This supports a nonlinear thermal response and balance caveat, **not** a published optimum track temperature or a known Gaussian width. Older primary F1 tyre-management research couples tread/carcass temperature, friction and wear. Its assumed historical parameters cannot be relabelled as 2024 Pirelli measurements. [Mercedes: Temperature Talk](https://www.mercedesamgf1.com/news/insight-temperature-talk), [Optimal Tyre Management of a Formula One Car, IFAC 2020](https://ifatwww.et.uni-magdeburg.de/ifac2020/media/pdfs/0335.pdf).

Mercedes describes real wing, ride-height, camber, toe, stiffness, differential and brake-balance adjustments and stresses that useful simulation depends on the data/model quality. Their existence does not make an unsupported scalar slider meaningful. It also contrasts Bahrain's rear-tyre, low/medium-speed and traction demands with Silverstone's high-speed emphasis. [Mercedes: How Do You Set Up a Formula One Car?](https://www.mercedesamgf1.com/news/how-do-you-set-up-a-formula-one-car).

The team's braking explanation identifies tyre/downforce limits, rear friction/engine/K blending, temperature and brake migration. It describes peak discs around 1,000°C, not a guaranteed operating optimum. A single fitted deceleration ceiling is an approximation; a brake-temperature gauge without thermal calibration is modelled. [Mercedes: Formula One Brake Systems, Explained](https://www.mercedesamgf1.com/news/formula-one-brake-systems-explained).

### Atmospheric modelling

Pressure, temperature and water vapour are appropriate density inputs. The CIPM-2007 moist-air equation is a metrology reference, with a stated recommended temperature range of 15–27°C and pressure range 600–1100 hPa. An ideal moist-air approximation outside that temperature range must be identified as an approximation, rather than borrowing the CIPM certification. For an MVP, `ρ ≈ p/(Rd T)` for dry air is already a physically meaningful improvement over assigning temperature a fixed lap penalty; adding humidity through partial pressures improves it. [Picard et al., CIPM-2007, NIST-hosted original paper](https://www.nist.gov/system/files/documents/calibrations/CIPM-2007.pdf).

Air density alone is not a complete air-temperature model. Mercedes explains the cooling/aero compromise and weather-driven tyre effects. Unmodelled cooling requirements and turbo control should remain explicit limitations. [Mercedes: How the Weather Challenges F1](https://www.mercedesamgf1.com/news/how-the-weather-challenges-f1).

## Solver architecture

The following equations are an implementation recommendation, not proprietary F1 vehicle data. All quantities use SI units internally.

1. Create samples at arc distance `s`, with `ds`, map position, heading, effective curvature `κ`, corner/sector tags and DRS zone. Preserve the real track's length and distinct speed demands. Effective curvature inferred from early-lap speed data is a **performance-equivalent reconstruction**, not a surveyed radius.
2. Calculate `m = reference dry mass + fuel`; derive air-relative velocity from the car vector and wind vector. Calculate drag and downforce using explicit aero-area coefficients.
3. Form normal load `Fz = mg + D` on a flat track. A simple load-sensitive tyre capacity may use `Fcap = μref Fz_ref (Fz/Fz_ref)^n × grip_state`. `n < 1` represents decreasing friction coefficient with increasing load; **n and μref need fitting or an assumption label**. A point mass loses per-tyre load transfer, so do not overclaim fidelity.
4. Find lateral speed limits by solving `m v² |κ| ≤ Fcap(v) × driver_utilization`. Distinguish tyre grip from the driver's fraction of that capacity. If empirical speed anchors set the reference ceiling, disclose that geometry and aero are not independently identified.
5. Reserve longitudinal grip through a friction ellipse: `(Fx/Fx_cap)² + (Fy/Fy_cap)² ≤ 1`. Apply rear-only drive capacity and all-wheel braking capacity if an axle extension is implemented. This makes braking/turning and acceleration/turning compromises meaningful.
6. Run a forward acceleration pass. `Fx_drive = min(available_wheel_power/max(v,v_floor), traction_limit)` and `ax = (Fx_drive − Fdrag − rolling_resistance − mg sin(grade))/m`. Use `v_next² = v² + 2 ax ds`, limited by lateral ceilings. The low-speed floor is a numerical regularizer, not extra torque.
7. Run backward braking constraints from every corner and finish/start boundary. Braking slows the car progressively before a corner, rather than instantly changing speed at its apex. Iterate around the closed lap until boundary speeds converge.
8. Integrate `dt = 2 ds/(v_i + v_(i+1))`; accumulate lap and sector times. Add energy/state updates using **this simulated dt** and repeat where thermal/energy state materially changes the profile.
9. Derive simulated throttle, brake effort, lateral/longitudinal acceleration, gear and RPM only as far as the solver supports. Distinguish these generated channels from historical observed channels. Generate map animation from `s(t)` in the same result object so playback and scrub synchronization are guaranteed.

Do not multiply the entire lap time by a team rating after solving. Car effects should alter identifiable reference phase capacities or estimated drag/power/grip inputs. Driver effects should alter entry/braking/apex/exit behavior. Both should influence which circuit sections gain or lose time.

## Driver information that can actually be supported

OpenF1 exposes sampled speed, gear, RPM, throttle, DRS state and a **binary** brake signal at about 3.7 Hz. Its position feed is approximate, lacks fine lateral placement and uses an arbitrary origin; its lap start timestamp is approximate. These channels cannot measure brake pressure, steering smoothness, tyre temperatures, differential settings, or true trail-braking intensity. Unknown DRS codes must remain unknown; documented active values include 10, 12 and 14. [OpenF1 API documentation](https://openf1.org/docs/).

Reasonable inferred metrics include brake-on distance relative to a corner, deceleration over a smoothed interval, minimum speed, 50%/95% throttle pickup distance and time lost by phase. Compare teammates on matched compound/session samples; show sample counts and dispersion. Never call the result a universal driver fingerprint independent of car, setup, fuel and conditions. A driver/car transplant is an estimated experiment with increased uncertainty.

Sampling at roughly 0.27 s intervals gives several metres of event-location ambiguity at racing speed. Do not print braking-point differences to 0.1 m or interpret binary brake as 0–100% measured pressure.

## Calibration, validation and explanations

- Store raw source URLs, session/driver/lap keys, retrieval date, cleaning rules and training/holdout membership. Make reference data available offline when the API fails.
- Choose clean flying laps; exclude out/in laps, red/yellow/safety-car laps, deleted or obvious nonrepresentative laps where identifiable. Unknown qualifying fuel and battery state are assumptions even when timing is exact.
- Split chronologically before estimating anything. Fit early qualifying samples; hold out later flying laps. A held-out set tests that session/circuit/model domain; it does not validate tyres, wind, rainfall or transplanted driver/car combinations never seen in that set.
- Do not calibrate each held-out lap, corner or sector to itself. If actual sector times are used as per-driver features, they cannot also be called independent validation targets.
- Show per-sample actual/predicted/error, sample count, mean absolute error and signed bias. Compare speed profiles and sectors too; matching lap time can conceal offsetting errors.
- Keep fitted drag, power, grip and aero values explicitly **unidentifiable effective coefficients** where multiple parameter combinations fit the same public speed trace.
- A statistical uncertainty interval comes from held-out residuals within scope; an extrapolation interval also needs assumptions. A default ±0.5 s with no basis is not a calibrated confidence interval. An illustrative uncertainty band must say so.
- Compute sensitivity by rerunning the full solver at `x + Δx`; state the step and reference scenario. Do not reuse universal seconds-per-kg/degree/wing-level constants.
- Explain A/B changes from local phase deltas and intermediate forces: e.g. higher mass reduces traction-limited exit acceleration; lower wing drag gains on straights but reduced downforce loses in fast corners. Only name the mechanism the model actually computes.
- Major-factor contribution bars require a stated counterfactual method. One-at-a-time changes generally do **not** sum to the total because tyre, fuel, aero and driver effects interact. Use an ordered waterfall and label its order, or Shapley contributions for the selected groups. Never silently rescale arbitrary bars to the final delta.

## Hard boundaries for the MVP

Keep pressure, real ride height, real differential, camber, steering smoothness, kerb contact, aquaplaning, damage and detailed brake temperature out of active inputs until corresponding data and dynamics exist. It is acceptable to expose their research status and extension points. A smaller set of physically connected inputs is more credible than fictional proprietary specifications.

The model should state: **“2024 reference-era, telemetry-anchored quasi-steady estimate. Public data does not reveal proprietary aero, tyre or power maps. Wet, traffic, setup and cross-car driver experiments are extrapolations where marked.”**
