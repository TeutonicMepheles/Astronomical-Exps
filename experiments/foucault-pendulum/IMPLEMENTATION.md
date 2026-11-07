# Homepage visual study — 2026-11-04

> 入口状态注记（2026-11-07）：当前 `main` 已包含本实验页面，默认入口为实验根 `index.html`；下文端口、分支和工作区描述属于当时研究记录。

> 公共组件状态（2026-11-07）：私有 `js/globe-renderer.js` 已删除，`js/main.js` 改用 `shared/components/globe-shader-renderer/index.js`。10° 虚线纬线、白色最终网格、接触阴影、高光颗粒和实时光照对象继续由本实验配置；私有 `gl-core.js` 仍供本页其他小型 WebGL 渲染器使用。

User request: Raft #Astronomical-Exps:0e4e1d96. This is a homepage composition, not the full experiment workflow in REQUIREMENTS.md. No additional visible controls or explanatory text were requested.

## Entry and provenance

- `index.html`, served from this checkout at port 8378. Independent branch `experiment/foucault-pendulum/initial-delivery`; no changes to the current Earth-circumference checkout/server.
- Historical provenance: on 2026-11-04 the textured globe began as private copies from Earth-circumference's renderer-textured.js and createGL (source branch feat/exp04-interactive-globe, base 29e13d0 plus working changes). On 2026-11-07 the shared superset renderer replaced `js/globe-renderer.js`; the experiment keeps only its own style and frame data. `js/gl-core.js` remains for this experiment's smaller shader renderers.
- Globe assets copied from the same source: earth-eq-redraw-1152x576.png, grain-ref-512.png, grain-brush-512.png, land-relief-1024x512.png.
- `assets/hall.png`: Visual-Designer LibTV draft, source work/foucault-bg/out/BG-大厅-16x9.png, 1280×720, message 51027008. Kept unchanged after composition review.
- `assets/bob.png`, `assets/pedestal.svg`: Assets-Creator delivered cutout and vector reconstruction, message 944aec0c.

## Motion and limits (updated 2026-11-04)

User db142a28 supplied B:/GithubProject/SpaceHTML/index.html and explicitly authorized reuse of its motion/trail logic. pendulum-model.js adapts app.js foucaultState and the drawFoucaultPendulum sampling loop. Reference defaults retained internally: latitude39.9, length30m, earth-only acceleration3600. Period=2*pi*sqrt(length/9.81); swing=.48*sin(time*2*pi/period); rotation=time*speed*15*sin(latitude)/3600 in degrees. No new visible controls or labels.

Removed the hall image from the existing entrypoint; black background while art direction is pending. Existing globe and layout retained. Trail starts empty, samples every .025s, caps at900 points and80 additions/frame, fades older segments; no decorative pre-roll. Bob, shadow and trail use the same horizontal projection (the reference's additional .72 bob-only factor is omitted to keep them aligned). Reference bob-height expression retained with current layout scale. These are reference-model defaults, not newly approved scientific specifications. Globe rotation does not select the model latitude yet.

Hidden pages pause; reduced-motion preference shows a static scene while retaining globe interaction.

## Validation

- Static check: zero errors. Root tests: 23 passed plus existing optical/course tests.
- Dedicated visible Chrome check at 1600×900, DPR 1: globe drag/keyboard, changing bob position, no page/console errors. Screenshot inspected for background overlap, pedestal contact and trail placement.
- Performance专项检查: static background, globe redraw only on interaction/texture load/resize; one animation loop, bounded 1400 trail samples. A 180-frame foreground sample returned P95 13.4 ms, zero frames over 50 ms. One earlier sample stalled while foreground state was uncertain; it is excluded and not a performance conclusion. Long-duration memory and touch-whiteboard testing remain unverified.
- No recording, no commit/push, no full scientific or user visual acceptance claimed.

Root browser regression passed after generating its required Newton/light-pollution offline exports. This regression covers existing pages; the new homepage was checked separately above.

## Latest checks

48 combinations (latitude -90/0/39.9/90, both speed modes, six times) match the original function to1e-12. Trail samples match the same model and remain capped900 after60 simulated seconds. Browser: no hall image, changing bob position, bob/shadow x equal, populated trail, globe drag/keyboard, no errors. Foreground180frames P95 13.4ms, over50ms0. Root check/test/browser passed. Isolated browser closed, no recording.

## Latest background/axis revision
Background now uses user attachment88c3d707 as assets/stage1-background.png, unchanged1280x720, full16:9. Baked ring deliberately retained. Axis fixed23.5deg relativevertical; pointer/keyboard spin about that axis. Trail contrast supported by dark underlay. Browser sync/noerrors and root regression passed; no recording.

## Highlight grain revision

The globe highlight now uses a local RGB halftone instead of an extra post-processing pass. Its three channel dots rotate at 15/30/45 degrees, use 3px cells by default, and are masked by the existing diffuse/GGX highlight amount. Grain combines chroma dots with multiplicative luminance pits so it remains visible when a saturated highlight clips. The tint is derived from the Halo palette (#ff5005 / #dbba95 / #d0bce1) at low chroma so the globe remains blue-grey and the texture stays legible. Concept and constants come from the MIT ShaderGradient Halftone implementation observed on 2026-11-04; this experiment keeps an independent shader implementation and adds no runtime dependency.

The latitude overlay is composited after diffuse, GGX highlight, rim and grain, keeping it as the final annotation layer. The debug panel exposes highlight grain strength over 0-4 and grain size over 1.2-5. Saved values equal to the previous 1.1 strength / 2.6 size defaults migrate once to the stronger 2 / 3 defaults while preserving custom colors and other lighting values.

Performance note: the effect adds three procedural dot masks per globe fragment and no texture samples, render targets or animation loops. The globe still redraws only when rotated, resized or a texture/lighting parameter changes.

## Ground contact shading

The globe is a transparent shader impostor rather than a scene mesh, so the floor receives a separate static contact layer after the background and before the trail, pedestal and globe. A broad low-opacity ellipse falls opposite the fixed key-light direction, while a tighter ellipse anchors the pedestal to the floor. Both use pre-blurred CSS radial gradients rather than runtime blur filters or shadow maps. A narrow lower-rim AO term is applied inside the existing globe shader. This adds no render pass, texture upload, animation loop or per-frame shadow update.

## Connector/cable alignment fix (2026-11-04)

User reported a bend (折角) at swing extremes: the top connector looked detached from the tilted cable. Cindy ruled the highlight is environment lighting and is not the bob axis; the real defect is the top connector not rotating with the suspension->centre direction, and the cable not terminating on the connector.

`js/main.js` drawPendulum now places the connector on the sphere toward the suspension point instead of a screen-fixed point directly above the centre. With suspension S=(1040,0), bob centre C=(x,y), offset off=33 (sphere radius): connector P = C - normalize(C-S)*off; the cable path ends at P and the joint circle moves to P. At rest this reduces to the old vertical top position, so no visual change there.

Verified in a headless Chromium pass: at sampled right-tilt (58.43deg), near-vertical (90.09deg) and left-tilt (102.10deg) positions the cable endpoint equals the joint position, the connector stays exactly 33px from centre, and the centre->connector angle equals the suspension->centre cable angle in every sample. Swing logic and lighting untouched. Static check 0 errors, root tests 23 passed.

## Pedestal AO + silver bob + swing-plane reference (2026-11-04)

User db142a28 follow-ups (fe0e3192, dcbb8b1a):
1. Added `.pedestal-contact-ao` (index.html + style.css): a soft radial-gradient contact shadow between the globe and the pedestal socket, layered above the pedestal and below the globe canvas so only the socket surface is shaded. Centred on the sphere bottom (450,622) where the sphere (centre 450,375 r250) rests in the socket (centre 450,627 rx83 ry10.6).
2. `js/bob-renderer.js` shader: light-silver metallic bob instead of bronze. Retains the hand-painted noise (fine grain + broad mottle) and adds an environment reflection (bright sky above, dark ground below), Fresnel grazing, and a sharp specular highlight. Swing logic untouched.
3. White ground + swing-plane reference line: `.pendulum-floor` (soft white radial-gradient that fades at the edges, replacing the dark hall floor under the pendulum) plus an SVG `#swingPlane` dashed line. `js/main.js` drawPendulum updates the line each frame so it rotates with the precession around (1040,680), matching the existing ground projection (x +-420, y +-420*.26).

Verified headless Chromium (no recording): contact-AO present at (450,622), swing-plane line endpoints rotate around (1040,680) with no console errors, bob/shadow animation running. Static check 0 errors. Not committed/pushed. Lighting model (highlight = env light) unchanged.

## Trail/reference correction (2026-11-04, Cindy 62f06db8)

Cindy ruled "地面绘制纹理使用高光亮色，建议白色" must be read in the trail context, not as "paint the ground white". Reverted the `.pendulum-floor` white overlay. The swing trail is now white (255,255,255) over a soft dark underlay; the swing-plane reference line is a brighter ice-blue (#b7d3ee) dashed annotation so it stays distinguishable from the white trail on the dark hall floor. Bob silver and pedestal contact-AO retained. Static check 0 errors; headless Chromium no errors.

## Bloom on trail + swing-plane line (2026-11-04, msg 5a01779a)

User asked for bloom on the ground swing-plane line and trail. Trail: drawTrails now draws a 13px wide white halo stroke under the 2.4px white core (both fade toward the tail). Swing-plane line: SVG `feGaussianBlur` filter `#swingGlow` (stdDeviation 3, userSpaceOnUse region over the swing area) merged with the source line. Static check 0, syntax pass; browser re-test pending resource window (real-generation scheduling) per Cindy.

## White globe + city markers (2026-11-05, thread fe190f87)

User confirmed the 6 selectable cities (上海/巴黎/新加坡/悉尼/南极/北极, default 上海) and asked to show them as Chinese markers on the WHITE globe, front-side only, with selected/default states.
- `js/globe-wireframe.js` (new): white graticule globe (Eratosthenes-style), adapted from EXP-04 renderer-wireframe.js; light sphere + grey lat/lon grid + single-side lighting.
- `js/city-markers.js` (new): CITIES list + projection. lat/lon -> sphere direction n = sin(lat)·axis + cos(lat)(cos(lon)·e2 + sin(lon)·e3); front = n.z >= 0 (>= so the poles on the fixed tilt axis stay visible); screen x=450+n.x·250, y=375?n.y·250. Selected = larger dot (r7) + ring (r11); default = small dot (r4.5); label = name + 1-decimal coordinate, flips left/right to stay inside the disc.
- `main.js`: switched renderer to createWireframeRenderer(); integrated createCityMarkers with selectedCity (default shanghai); markers.update runs in drawGlobe each spin.
- `index.html`: added `<svg id="cityMarkers" class="city-layer">` above the globe canvas. `style.css`: dark-ink markers (visible on white) with white text halo; selected = warm accent.
Node-verified projection: 6 points length 1.0, positions within globe bounds, front/back flips with spin, poles fixed on rim. Static check 0. Browser re-test pending Cindy's GPU window.

Browser re-test (Cindy 5ce64eab gave the window): white globe sampled R/G/B ≈ 237-243/239-244/242-246 (confirmed white, not textured blue); 6 markers present, default selected shanghai, click switches selection; visibility correct across spin (mid-lat cities hide on back, poles stay on rim). Fixed a float bug: cos(±90°)≈6e-17 made pole nz flip sign with spin, culling the poles; changed front test to nz > -1e-6. No console errors, browser closed.


## Continuous rate changes (2026-11-05)

The Stage-1 slider accelerates precession only, with the existing 67 m swing period of 16.42036 s. Its label now says so explicitly. This is a two-clock visualization: at high precession rates the swing direction changes substantially during one oscillation; it must not be interpreted as uniformly accelerated physical time.

`createMotion` accumulates swing time and precession angle over elapsed intervals. Rate or city changes affect subsequent intervals rather than recomputing the current pose from total runtime. Trail vertices capture the same integrated state and do not recompute previous motion using new parameters. The page uses this state for bob, shadow, reference line and trail.

Targeted Chrome check verified HTTP source matches this worktree; rate changes have zero instantaneous position discontinuity; previous trail points remain unchanged; full angular amplitudes ±0.48 rad are retained at 0.25/1/4 simulated hours per second. Actual page slider switching produced no page errors. These checks do not establish scientific validity of artificially fast precession, device acceptance or long-duration performance.

性能专项检查: retains one animation loop and the 900-point trail cap; at the existing 0.5 s frame-delta limit there are at most 20 integration samples per frame. No new texture uploads or rendering passes. Long-run and whiteboard performance remain unverified.


## Actual-page rate verification (2026-11-05)

`tests/rate-browser.cjs` ran Chrome 156 headless against port 8378 and verified served main.js equals this worktree. Playwright controlled the clock while running the actual page animation/render loop at normal rAF cadence; this is not a real-time performance sample. Each of 0.25, 1, 2, 4 simulated hours/second ran for 34 animation seconds (2125 DOM samples each). Measurements invert the ground projection using #shadow and #swingPlane; plane SVG coordinates are rounded to 0.01 px, accounting for small amplitude/rate reconstruction errors.

All four measured periods were 16.420363 s; angular amplitudes approximately ±27.50 degrees. Plane speeds were 1.9443 / 7.7771 / 15.5543 / 31.1085 degrees/second (Shanghai latitude). Sequence 4→0.25→4→1→2→0.25 retained exactly identical DOM poses at the event boundary; subsequent-frame rotation residuals were below 0.00005 rad (0.0029 degrees), within coordinate rounding and frame-time reconstruction tolerance. Zero page errors. Detailed raw summary: tests/rate-browser-results.json. No changes to runtime behavior in this verification round.


## City switches preserve motion and clear only trail (2026-11-05)

User requested uninterrupted motion on speed/location changes. `createMotion.clearTrail()` clears only stored vertices. A different-city click updates latitude, clears and redraws the trail immediately, and leaves the accumulated swing time, precession angle and active animation request untouched. Re-selecting the current city does nothing. Speed changes retain trail history.

Validation: `node tests/motion-clock.cjs` (from experiment directory) passes city-pose retention, hemisphere reversal and trail restart in addition to existing rate/amplitude checks. `tests/switch-browser.cjs` drives actual Chrome pointer clicks on north/south markers and slider input events. Seven mixed switches retain identical event-boundary bob/cable/plane/shadow poses; city changes clear canvas pixels immediately and regenerate them; speed switches preserve pixels; reselecting a city retains history. Controlled-clock sampling has a 16 ms maximum frame gap; a short actual-clock sequence recorded 55 frames, max 47 ms and P95 45 ms. No page errors. This short desktop/headless sample is not whiteboard or long-run performance acceptance. Raw report: tests/switch-browser-results.json.

性能专项检查: no extra animation loops or rendering passes; clearing the bounded trail uses the existing canvas and redraw path; globe redraw remains triggered by selection. Tests check motion continuity separately from real-clock frame intervals.

Final checks for city-switch change: npm run check passed (0 errors); npm test passed (23 Python tests plus optical/course suites). npm run test:browser failed because previews/components/progress.test.cjs timed out loading /previews/components/progress.html at port 8378. The separate actual Chrome Foucault switch test passed as recorded above. No commit or push.


## Swing plane and parameter-stage camera (2026-11-05)

A toggle next to the speed slider exposes a translucent vertical swing plane using the same precession angle as the ground reference. Stage navigation uses a 600 ms smoothstep camera transform in the existing rAF loop: scale 1→0.78, ground anchor (1040,680)→(800,740). The rendered bob eases from its saved moving pose to the vertical rest pose; accumulated motion and trail history pause throughout parameter mode and camera transitions. Returning reverses the transform before continuing motion from its saved state. Reversing navigation mid-transition starts from the current transform. Once stationary, parameter mode stops scheduling animation frames; debug/resize/navigation wake the same loop as needed. Reduced-motion settings switch immediately.

Stage 2 now has its own local CSS navy gradient and floor wash rather than exposing the black body after hiding the hall image. Stage-1 scenery, readout, speed and plane controls fade out, while complete cable and scale references appear. Scale annotation now uses pendulumConfig.length (67 m) instead of stale defaults.length (30 m). No new scientific parameter ranges or mass behavior were invented: actual length/mass input controls remain outside this presentation change.

Targeted stage-browser test passes plane toggle, intermediate camera scale, centered stationary bob, full visible cable, saved-pose restoration, resumed swing and three rapid transition reversals; screenshots visually inspected. Existing speed/city switch test rerun passes seven mixed changes, immutable instantaneous pose and correct trail lifecycle, with zero page errors. Short real-time sample: max frame gap 26 ms, P95 20 ms (not long-run/whiteboard acceptance). Tests use controlled animation time for continuity and separate actual-clock timing.

性能专项检查: one existing animation clock, no added textures or offscreen passes, no per-frame annotation DOM rebuilding, bounded history retained. Stationary parameter mode idles rather than redrawing the hidden trail; only the transition keeps the existing loop active.

Final validation for stage presentation: npm run check, npm test (23 Python tests and optical/course suites), npm run test:browser all passed. The general browser suite used a quiet local server on port 8381 and local Playwright dependency via NODE_PATH; it covers existing experiments/components/offline exports, while the separate Foucault tests cover this change. Reduced-motion navigation at 1920×1080 also passed, with immediate centered rest pose and correct 1.2 stage scaling. No commit or push.


## Length and mass controls (2026-11-05)

Stage 2 now has numeric length (m) and mass (kg) inputs plus ±1 buttons. Valid entries must be positive and finite; empty length or invalid values keep the last valid model and prevent leaving Stage 2 until corrected. Mass starts unset because there was no confirmed prior default; leaving it empty is supported. No arbitrary scientific min/max range has been imposed. Chosen values persist across the two stages, and Stage 1 shows length, mass and the ideal model's period. Ideal point-mass dynamics ignore resistance: mass cancels and does not change period, amplitude or precession; the displayed sphere is schematic, with no inferred density/radius relationship.

The oscillator now accumulates phase rather than deriving phase from accumulated seconds divided by the current period. A length edit changes future angular speed without resetting the current swing phase or precession angle. Length edits clear the old trail; mass-only edits preserve it. Stage 2 remains paused, centered at x=800; references share one px/m scale fitted to the larger of current length and the existing 67.31 m tower, with baseline at y=662. Very short pendulums use a smaller schematic bob marker so it does not cover the entire cable. No additional animation loop; existing event-driven redraw handles edits and the stationary mode still idles.

Actual Chrome page test (`tests/parameters-browser.cjs`) measured returned Stage-1 periods: 10 m / 1 kg = 6.343740 s; 30 m / 1 kg = 10.987680 s; 30 m / 100 kg = 10.987680 s; 100 m / 100 kg = 20.060667 s. All agree with the existing ideal period formula within 0.003 s. Tests verify centered/stationary editing, synchronized length/person/tower proportions, saved phase on return, current mass in the readout, rejection of zero/negative inputs, and physical pointer activation of increment/decrement buttons. Zero page errors. Timing uses the actual rendered DOM animation with a controlled clock, not a wall-clock performance benchmark. Raw report: tests/parameters-browser-results.json. A separate real-clock screenshot after completed crossfade was visually inspected and confirmed hall opacity 0.

Validation: motion-clock unit test (including length-change phase preservation and mass independence) and stage-browser transition regression pass. npm run check, npm test (23 Python tests plus optical/course tests), npm run test:browser pass; the general browser suite covers existing experiments/components/offline outputs, with the Foucault-specific checks listed separately. No commit/push.

性能专项检查: input events rebuild only the small scale SVG and redraw the existing canvas; no per-frame rebuild, new texture generation, new timers or new render passes. Long-run performance, touch-whiteboard and extreme numerical ranges remain unverified.


## Mass-dependent bob display (2026-11-05)

The user requested visible size changes with mass. For equal-density spherical relative-size illustration, bob display scale is cbrt(mass / 100 kg); 100 kg is a display calibration for the existing 70 px canvas, not an inferred density or an absolute physical diameter. An unset mass retains the original schematic size. The model's period, phase, center position and precession remain mass-independent. The UI identifies the equal-density relative-size assumption.

The same scale drives both stages, joint radius/stroke and ground-shadow dimensions. Cable endpoints are computed toward the suspension point at the shader surface's half-alpha contour; bob-renderer exports that radius as its display geometry API. Extreme displays are limited to a 220 px canvas and a sphere radius at most 35% of suspension-to-center distance, with an explicit size-limit message. This prevents a huge sphere or short cable from inverting the connection. The displayed length still measures suspension to bob center.

Actual Chrome checks (`tests/mass-size-browser.cjs`): 1→8 kg and 100→800 kg both double displayed diameter, center stays (800,662) within 0.01 px in editing mode, and the return to Stage 1 preserves the center and 800 kg size (140 px canvas before camera zoom). Across 48 moving poses, maximum surface-connection radius error was 0.005 px and collinearity error 0.006 px; cable endpoint and joint mismatch was under 0.001 px. A 1 m / 10^12 kg display triggers the size limit and retains a non-inverted connection; restoring normal values removes the note. No page errors. Raw report: tests/mass-size-browser-results.json. Final 800 kg screenshot was visually inspected.

Stage transition and motion-clock regressions pass. npm run check, npm test (23 Python tests plus optical/course suites), npm run test:browser pass. No commit/push.

性能专项检查: scaling reuses the existing canvas/shader and animation loop; no added textures or rendering passes. Limit-note DOM updates occur only when its state changes. Static parameter mode remains event-driven; whiteboard and long-run acceptance remain unverified.


## Fixed-reference scale comparison, three tiers (2026-11-05)

User clarified Stage 2 as an image-based scale comparison. This supersedes earlier free-number length input and auto-fit reference behavior. Length is now exclusively 28 / 67 / 100 m. The existing tower reference remains 67.31 m, at a fixed top datum y=180 and fixed 5 logical px/m; it never moves or rescales on tier or mass edits. The pendulum is displayed alongside at x=1180 with the same top datum, so center distances are 140 / 335 / 500 px. The reference is described by js/scale-reference.js (name, height and stacked image parts with their height/aspect metadata); a different reference can replace these data without changing the scene/controller. Mass controls preserve the relative equal-density size convention and do not resize the building.

A 520 ms smoothstep transition updates displayed cable length, ball center, dimension endpoint and numerical label in the existing rAF loop. Mass edits interpolate radius for a smooth size change; a refresh-opacity pulse accompanies parameter updates. Entering Stage 2 reveals the dimension line from its top datum while the camera moves. Reference DOM is built once and reused. Rapid edits retarget from the current displayed length/radius; leaving during an active edit allows the edit and camera transitions to finish together. Reduced-motion users get immediate final values, including when the preference changes mid-transition. The paused parameter scene returns to idle when animations finish.

Fixed scale means the bob center intentionally changes vertically when length changes, matching the user's top-aligned comparison sketch. It remains motionless once the selected value settles. No forced recentering or reference auto-fit occurs between tiers. The shadow is hidden in the comparison scene. The display-size safeguard now allows a sphere radius up to 80% of cable distance, avoiding incidental resizing of ordinary masses at 28 m; a visible limit note still covers extreme values.

Actual Chrome scale-stage-browser checks pass: reference image x/y/width/height arrays are identical for all tiers; cable and dimension lengths agree within 0.02 px during and after interpolation; mass size remains unchanged when only length changes; mass interpolation, rapid retargeting and return during animation are continuous. Screenshots 28/67/100 and a same-scale side-by-side comparison were visually inspected. Transition and mass/cable regressions were updated to the confirmed tiers and pass. Returned periods measured by parameters-browser: 28 m = 10.615107 s; 67 m = 16.420363 s (both 1 and 100 kg); 100 m = 20.060667 s. Reports are under tests/. No recording or user visual acceptance claimed.

性能专项检查: one existing rAF loop, no extra timers or textures; reference nodes/images are retained, with only cable, ball and dimension attributes updated during the bounded animation. Static Stage 2 idles. Long-run and touch-whiteboard acceptance remain pending.

Final checks for fixed-reference revision: npm test and npm run test:browser passed; reduced-motion initial navigation and mid-animation preference changes also passed at 1920×1080. Static check passed and was rerun after the final source/test/doc changes. No commit or push.


## Equal-height relative camera and confirmed mass tiers (2026-11-05)

User corrected the meaning of relative scale: the complete pendulum must occupy equal screen height across length tiers, and the reference image must change scale. This supersedes the immediately preceding fixed-reference revision. Length remains 28/67/100 m (default 67); mass is now exclusively 25/28/50 kg (default 28). Both controls are buttons, with no arbitrary numeric entry. Page and model defaults agree.

The parameter camera fits suspension-to-sphere-bottom into 320 logical px, top y=140, at x=1180. Its fit factor is 320/(displayedLength*nominalPxPerMeter + nominalSchematicRadius). Both reference image and bob use this same fit factor; dimension endpoints use the resulting px/m. Thus the equal-density relative-radius illustration is preserved even when length changes: a short pendulum is viewed at greater magnification, so both building and sphere appear larger. The 100 kg visual calibration remains a schematic radius convention, not a claimed density or physical sphere diameter. Image parts stay mounted; their group transform and the reference dimension/label positions update continuously. Parameter labels, dimensions, radius and reference image share the existing 520 ms animation.

Actual Chrome tests (`tests/relative-scale-browser.cjs`) exercised all nine combinations. Each full displayed height was 320 px within 0.004 px, reference height/px-per-m equaled 67.31 m, length dimension/px-per-m equaled the selected L, and sphere radius/px-per-m/cbrt(m) stayed constant. Cable endpoints match the joint within 0.001 px; the maximum moving surface-connection error after returning was 0.006 px. Defaults 67 m/28 kg, exactly three choices per control, no numeric input, rapid retargeting, stable idle state and no page errors were verified. The new same-height 28/67/100 screenshots were visually inspected and assembled into tests/relative-tiers-comparison.png.

Earlier test entry points for mass size and scale comparison now delegate to the combined nine-case test because their former free-input/fixed-reference expectations were explicitly superseded. Stage transition and independent oscillator regression remain separate. No recording, commit or push.

性能专项检查: retains one rAF loop, bounded trail history and existing image/canvas resources. Reference scaling changes an SVG group transform without image decode/replacement or per-frame node creation; dimensions remain screen-sized. Static parameter mode still idles after its bounded animation. Long-run and whiteboard validation remain pending.

Returned Stage-1 period checks with the confirmed default mass of 28 kg passed for all tiers: 28 m = 10.615107 s, 67 m = 16.420363 s, 100 m = 20.060667 s. Stage transition and nine-case relative-scale regressions pass. npm run check and npm test (23 Python tests plus optical/course tests) passed; general browser regression was also rerun separately.

Final equal-height revision checks: npm run check, npm test and npm run test:browser all passed. Reduced-motion behavior and mid-animation preference changes also passed at 1920×1080. No commit/push.


## Fill core area, align bottoms and refresh reference ruler (2026-11-05)

User requested a nearly full-core-height pendulum with vertical padding, shared bottom alignment with the building/ruler, and refresh/switch effects for the building ruler. The equal-height camera now occupies y=140..800 (660 logical px) inside the 1600×900 stage, leaving 50 px below the navigation and 100 px to the stage bottom. Mass text and building name remain below the shared baseline. All three length and mass tiers, defaults and physical motion semantics are retained.

Building imagery is scaled with the existing physical px/m but anchored at y=800, matching the sphere's bottom, rather than at the suspension datum. Its ruler ends at the same baseline. The 28 m image would exceed the viewport at the correct scale, so a fixed SVG clip region (x=500..1040, y=140..800) limits the reference display without shrinking it independently or covering controls/navigation. A double upward chevron and 向上延伸 label replace the misleading full-height top tick in this case. Full image height and reference ruler label still represent 67.31 m. This clipping treatment is an implementation decision to reconcile full-core pendulum size with the known tall reference, not a new user-provided reference asset.

Reference image, ruler line, ticks, value/name and overflow marks share a 0.45→1 refresh-opacity effect over the existing 520 ms geometric scale transition. Baseline stays fixed throughout. No extra animation loop or timers; the parameter scene idles after the transition.

Actual Chrome nine-case test verifies 660 px full pendulum height within 0.004 px, sphere/building/ruler bottom at y=800 within 0.02 px both mid-transition and settled, same px/m, expected clipping only at 28 m, visible intermediate refresh opacity and final opacity 1. Cable surface/endpoint checks and resumed motion pass; transition and oscillator regressions also pass. Final 28/67/100 screenshots were visually inspected and comparison image refreshed. npm run check and npm test passed; general browser regression rerun separately. No recording, commit or push.

性能专项检查: reuses reference image nodes, one SVG clip region and the existing bounded animation loop; only transform/opacity/geometry attributes change, with no new texture generation, image replacement or per-frame node creation. Long-run and whiteboard checks remain pending.

Final core-fill checks: npm run check, npm test, npm run test:browser all passed. Reduced-motion navigation and preference changes mid-animation passed at 1920×1080. Nine-case actual-page and stage/oscillator checks passed as above.


## Calibrated short-tier bob, independent simple swing and directional wipe (2026-11-05)

User requested 28 m bob size match the 67 m convention, simple pendulum observation in Stage 2 with start/pause and parameter changes while playing, parameter readouts and a bottom-right previous-step button. Sphere calibration now uses max(displayedLength,67); reference px/m still follows the actual selected L. At the same mass, 28 and 67 m have equal bob display diameters while the full resting height remains 660 px. This is explicitly identified as a schematic size calibration in the UI, superseding strict cross-length equal-density screen scaling.

Stage 2 has an independent swing phase and active elapsed time, integrated inside the existing rAF loop with angular frequency sqrt(9.81/L), amplitude 0.48 rad. The bob moves on a fixed-length circular arc in one screen plane; Stage-1 history/precession are frozen throughout Stage 2. Start/resume preserves phase, pause freezes its current angle, and changing L changes only subsequent phase speed. Mass changes retain ideal period independence. Existing parameter geometry interpolation continues during playback. Returning pauses simple mode and blends back to the saved Stage-1 motion; reentering starts at rest. Readouts show maximum angle, current angle, period and active time. The right-bottom previous-step button uses the same navigation path as the top return button. User-initiated simple playback remains available with reduced-motion preference; automatic presentation transitions honor that preference.

The pendulum center moved to x=1260 and the reference viewport to x=500..920, so the existing ±27.5° swing fits within the stage without crossing the reference image. Mass label follows the bob; cable endpoint/joint still use the shared shader radius. Hidden Stage-1 trail canvas is not redrawn during plain playback; unchanged readout text is not rewritten.

Building/ruler transition now uses an SVG clip rectangle: 220 ms erase downward, one fully hidden frame with the new reference scale applied, then 160 ms reveal upward. No visible image scaling or opacity fade occurs; selected parameter/length-label geometry keeps its separate 520 ms tween. Retargeting starts erasing from the current clip boundary. Image, ruler and name share the wipe group. This reuses the one rAF clock, with no timers or redecoded/replaced image nodes.

Validation: nine-case relative-scale test passes, including equal 28/67 m diameters for every mass and correct full resting height/connection. Stage navigation regression passes. Actual simple-stage-browser test measured 67 m period 16.420324 s (expected 16.420363) and 28 m period 10.615124 s (expected 10.615107) while switching L and mass during active playback. Measured angles remain ±0.48 rad; fixed-length distance spread <0.014 px and surface connection error <0.007 px. Start/pause/resume continuity, frozen precession, unchanged scale during erase/reveal, scale replacement in a fully hidden frame, readouts and bottom-right return all pass. Zero page errors. Screenshot visually inspected. Timing uses controlled clock and actual rendered DOM, not real-time performance acceptance.

性能专项检查: one shared rAF loop, no Stage-2 trail allocation, no hidden-trail redraw while playing, cached readout elements and changed-text-only updates; reference switching uses clip geometry rather than new assets/render passes. Long-run and whiteboard acceptance remain pending. No recording, commit or push.

Final checks for simple-observation revision: npm run check, npm test (23 Python tests plus optical/course suites), npm run test:browser all passed. Nine-case calibration, stage transitions, oscillator and actual simple-playback/wipe tests passed. Explicit play/pause with reduced-motion preference, phase-preserving edits and bottom-right return also passed at 1920×1080.

## 2026-11-06 地点聚焦与阶段二布局

点击非极点地点后，地球绕固定的倾斜轴转动，将该地点移到同纬度上最朝向镜头的位置。点击南北极时只更新选中态和读数。地点名称、坐标和标记同步高亮；纬线与地球采用同一朝向。拖动和方向键可中断聚焦，减少动态效果模式直接定位。

阶段二单摆在左，参考物及标尺在右。控制面板左移，给单摆的完整摆幅留出空间。参考图按默认 28 kg 的视觉比例标定，仅切换摆长时更新。换摆重仍调整摆球大小和悬线长度以保持整副摆的展示高度，因此非默认摆重的悬线比例与参考图略有差异。

性能专项检查：聚焦沿用现有帧循环，仅在朝向更新时重绘地球及标注。换摆重不再启动参考图擦除，沿用同一组图片资源。Chrome 浏览器覆盖地点定位与标签、阶段切换及九组参数；智慧白板与长时性能仍待实机验证。


## 阶段一真实比例与固定镜头

阶段一以 28 kg、17 cm 摆球为实物标定，其他摆重按等效密度相同换算。保持原摆球显示尺寸，悬点置于画面上方。水平单边摆幅为 320 逻辑像素，摆球升高量按长摆的圆弧计算。投影轨迹和阴影沿用同一水平摆幅。阶段二恢复原有独立尺度与摆动。

性能专项检查：沿用原有帧循环、摆线和轨迹画布，未增加资源与绘制对象。浏览器验证悬点距离、摆幅、摆球接点及阶段切换，白板实机待验。

阶段一周期可在阶段一编辑面板覆盖（下限 4 秒），清空后随摆长自动计算。覆盖只改变后续相位推进速度，沿用既有帧循环。偏转滑块上限为 15 模拟小时/秒。浏览器覆盖默认值、覆盖、恢复及阶段二读数隔离，模型检查覆盖相位连续性。

阶段一固定为 67 m、28 kg。阶段二独立保存摆长和质量，球径以 28 kg 对应 17 cm 为基准，其他质量按等效密度换算。整副摆按同一比例缩放进展示区，默认档球径约 1.7 逻辑像素。切换阶段和档位沿用现有动画循环、SVG 摆线和摆球资源。

阶段一刷新后默认偏转速度为 0.05 模拟小时/秒，上限仍为 15。摆球和地面投影共享前后方向的屏幕位移。该修正沿用现有帧循环和轨迹样本，不增加绘制对象。高加速档仍为偏转演示。

阶段一编辑面板的“无背景”模式以纯色几何替换展厅，隐藏地球与底座。椭圆标记完整地面投影范围，与动态轨迹共用中心、最大摆幅和纵深缩放。阶段二自动隐藏示意层，返回阶段一时恢复选择。

性能专项检查：示意层使用静态 SVG 色块，开启时无需解码新图片，也不增加逐帧计算。

阶段一编辑模式提供摆动中心 Gizmo。拖拽整体平移悬线、摆球、摆平面、阴影、轨迹及透视示意椭圆。松手后在浏览器本地保存，刷新恢复。方向键微调，按住 Shift 以较大步长调整。轨迹画布与滤镜边界整体平移，保留现有画布尺寸和绘制循环。
