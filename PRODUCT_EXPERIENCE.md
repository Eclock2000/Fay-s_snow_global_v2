# Product experience contract

Status: implemented and visually reviewed; real-iPhone Safari/Quick Look and
thermal acceptance remain pending. This document governs the v2 implementation;
the original repository remains read-only.

## 1. Current-state audit

Evidence comes from the deployed original page, its source at commit
`e1ab21e7d32d54694c46687e372ba005bb51b9d0`, and browser checks on 2026-09-03.

| Current fact | Actual user experience | Disposition |
|---|---|---|
| One 4,710,325-byte HTML response contains the mesh and textures | The gift eventually appears without many requests, but parsing and decoding start from a multi-megabyte document | Change: split the model from the page and keep the first document small |
| Three.js and Cinzel load from third-party CDNs | The page depends on an extra origin and the intended typography is not deterministic | Change: ship the rendering runtime locally and use a system font stack |
| The globe is fixed at 380 × 380 CSS pixels | At the supported-minimum iPhone SE 3 viewport (375 × 667), the globe is already 2.5 px offscreen and creates horizontal overflow | Change: size from both viewport width and available height |
| The loader says only `LOADING…` | The visitor cannot tell whether the page is progressing or stuck | Change: show real model progress and a useful static first frame |
| Drag, click-to-shake, and automatic shaking work | The core playful interaction is good, but it is described only in small English text | Keep the actions; localize and make touch/keyboard intent explicit |
| There is no AR path | The friend cannot place the gift in their space | Add native iPhone Quick Look |
| The page continuously animates | It can consume battery after the tab is hidden and ignores reduced-motion preference | Change: pause when hidden/offscreen and respect reduced motion |
| Browser check at 390 × 844 used about 27.6 MB JS heap after cold load | The existing scene is not catastrophic, but it spends that budget before adding AR | Keep the v2 model and overlay within explicit mobile budgets |

## 2. Requirement and source audit

| Requirement / assumption | Source | Status | Consequence |
|---|---|---|---|
| Do not modify the existing project | User | stated | Original repository, branch, deployment, and URL are read-only |
| Create an independent upgraded repository/page | User | stated | v2 has its own Git history, repository, and Pages URL |
| Make the gift visually finer | User | stated | Improve materials, depth, lighting, typography, loading, and interaction—not merely add controls |
| Keep it smooth on iPhone | User | stated | Mobile layout and frame/battery budgets are release gates |
| Treat iPhone SE 3 and iPhone 12/13 mini as the smallest supported iPhones | User | stated | Minimum checks are 375 × 667 and 375 × 812; 320 px legacy iPhones are out of scope |
| Prioritize iPhone 12 and newer | User | stated | Tune the primary composition and quality for 390 × 844 and larger modern iPhones |
| Add AR and learn from the working cat project | User | stated | Preserve the proven user-gesture AR launch pattern and explicit USDZ asset |
| The recipient is Fay and likes skiing | Original page | requirement-stated | Keep only this existing personalization; do not invent more private details |
| Personalization must be quiet, discoverable detail rather than prominent copy | User | stated correction | The globe stays visually dominant; the existing phrase is a restrained base engraving that rewards attention |
| The base must read as solid, not transparent or hollow | User screenshots | stated correction | Close the base geometry and keep one continuous walnut body between the brass bands |
| The engraving must share the penguin's front direction | User screenshots | stated correction | When the penguin's face and chest are front-facing, the complete engraving is centered on the base front |
| The snow volume is a filled, tilted spherical cap rather than a mound | User | stated correction | Fill the lower sphere to one plane, close it along the inner globe, then rigidly tilt snow, tracks, and penguin together |
| Fast wind-driven snow is the default atmosphere | User | stated correction | Remove the snow button; loop 3D flakes diagonally with speed, hidden loop seams, and no visible bottom respawn |
| The link may be opened inside WeChat/QQ/Weibo | Reference project | inferred | Do not block the gift; explain “open in Safari” only when AR is requested |
| Add audio, analytics, accounts, location upload, or a backend | None | invented | Forbidden unless separately requested |

## 3. Journey audit

### First contact

| Time / trigger | User goal | User sees | User action | System state | Wait | Can user do anything else? | Failure path | What persists |
|---|---|---|---|---|---:|---|---|---|
| Open shared URL | Understand what was sent | Midnight sky and a recognizable, composed globe silhouette | None | HTML/CSS ready | < 1 s target | Take in the object | Network delivery is outside the product promise | Normal HTTP cache |
| Model loading | See the actual gift | A soft nontechnical progress state and a calm nonblank stage | None | Local runtime and GLB streaming | < 5 s normal target | See the first-frame poster | If the model cannot be delivered, 3D simply does not load | Browser cache |
| First useful content | Enjoy and inspect it | A filled diagonal snow plane, a penguin cutting downhill, and fast diagonal 3D snow already establish motion; the solid base's low-contrast engraving reads “喜欢滑雪的 Fay” only on closer attention | Drag the globe | 3D interactive | Immediate | Discover true snow depth and the curved engraving | Reduced-motion mode stays calm and flake-free | Preference only; no personal data |
| Enter AR | Put the gift in the room | One clear AR call to action | Tap once | Native AR launch from same user gesture | Native handoff | Continue enjoying page if cancelled | Direct Quick Look link and browser guidance | Nothing |
| Close | Leave without cleanup | No warning or forced share | Close tab | Animation stops | None | — | — | Cached assets only |

### Second contact

| Question | Answer | Evidence / gap |
|---|---|---|
| What persisted from first use? | Browser-cached local assets only | Must verify with a second cold/warm navigation |
| What appears immediately? | Background and complete globe silhouette, then cached model | Must verify no loading overlay flash after warm cache |
| What refreshes in the background? | Nothing personal and no remote API | Static GitHub Pages design |
| What changed because of previous actions? | Nothing; the gift resets cleanly | Deliberate non-goal: no tracking or stateful personalization |
| What wait is visible? | Real progress only if an asset is not cached | Must verify progress semantics |
| What explains failure? | AR-specific guidance explains only AR launch constraints | Must exercise the AR paths |

### Nth contact

| Area | Expected mature experience | Current gap | Acceptance evidence |
|---|---|---|---|
| Visual quality | Still feels intentional, not like a 3D demo | Pending implementation | Desktop and iPhone screenshots |
| Interaction | Drag rotation remains immediate while fast 3D snow runs independently | Browser-verified; touch feel remains a device check | Pointer, touch, and keyboard checks |
| Motion control | Reduced motion and hidden-tab pausing work | Browser-verified; device energy use remains pending | Media-query and visibility tests |
| Reset | Every revisit begins in the same composed ambient state | Browser-verified | Reload and second-run test |
| Data/privacy | No analytics, storage, upload, or account | Implemented | Network and source audit |
| AR | One-tap native launch or concise recovery | Requires real iPhone confirmation | iPhone Safari acceptance check |

## 4. Capability versus experience

| Technical capability | Required user-visible experience |
|---|---|
| A GLB loads | A recognizable gift is visible before and after load, with honest progress |
| A USDZ exists | One clearly labeled tap opens native AR at a believable tabletop size |
| `activateAR()` exists | It is called synchronously from the visitor's tap into iPhone Quick Look |
| The canvas is responsive | No clipping, horizontal overflow, unsafe-area collision, or tiny controls from 375 × 667 upward |
| Animation runs at 60 fps in the development browser | The specified iPhones remain the performance target |

## 5. Product advocate screenplay

**Product one-liner:** A tiny, never-melting winter gift for Fay that feels
special in the browser and can be placed on a real table with one tap on iPhone.

**Primary user:** Fay, receiving a shared link on a phone, with no technical
knowledge expected.

**First run:** The page immediately looks like a finished object, not a greeting
card or a loader. The globe is the visual center; there is no prominent `FAY`
headline, dedication block, date, or sentimental slogan. The existing phrase
“喜欢滑雪的 Fay” is engraved quietly into the base with low contrast: readable
when noticed, centered only when the penguin's face and chest are front-facing,
and never animated or called out. The 3D detail resolves behind a
complete static globe with a soft, nontechnical progress state. As the 3D model
resolves, wind-driven snow streams diagonally through real depth by default and
the skier appears to cut quickly down the full-width slope. There is no snow
button and a globe tap never competes with drag. A single “放到房间里” button, paired with “将进入
iPhone 的 AR 相机视图；本网页不收集画面”, opens native AR. If the link is
inside an unsupported in-app browser, the gift remains usable and only the AR
tap explains how to open it in Safari.

**Second run:** Cached assets make the same gift appear faster. No tutorial,
account, consent wall, or stale interaction state returns.

**Nth run:** The experience stays a simple keepsake. It does not ask for
maintenance or accumulate data. Animation stops when unseen and respects reduced
motion.

**Explicit non-goals:** Social posting, analytics, accounts, sound, camera use
inside the web page, editable messages, and persistent personalization.

## 6. Experience contract

1. The original page and repository are never modified or repointed.
2. At 1 second, the visitor sees a deliberate gift composition—not a blank
   canvas or blocking setup.
3. Under normal delivery, the interactive model is targeted to be useful within
   5 seconds and model loading exposes real progress. Carrier failures are out
   of scope.
4. The main experience has only two user actions: rotate by dragging and enter
   AR. Snow is ambient and starts with the model; there is no snow button and a
   globe tap has no hidden toggle, so a slight drag cannot become an accidental
   action. No internal 3D/AR vocabulary appears in the primary UI.
5. AR uses a physically scaled local GLB plus an explicit local USDZ. The primary
   launch is synchronous from the visitor's tap; a direct Apple `rel="ar"` link
   is the iOS fallback.
6. An in-app browser never triggers a full-screen warning on arrival. Guidance
   appears only when the visitor asks for AR. That tap adds a non-personal `#ar`
   intent marker; when “open in Safari” preserves the URL, the same AR button is
   immediately emphasized. Safari still requires one real tap to launch Quick
   Look; the page never pretends it can bypass that platform rule.
7. No third-party runtime/font request, analytics call, account, data upload, or
   local-storage profile is allowed.
8. The supported minimum is iPhone SE 3 at 375 × 667, with a dedicated mini
   check at 375 × 812. The primary design target is iPhone 12 and newer at
   390 × 844 and above. These viewports have no horizontal overflow, clipping,
   unsafe-area collision, or undersized controls. Legacy 320 px iPhones are an
   explicit non-goal.
9. The model target is ≤ 70,000 triangles with textures ≤ 1024 px; GLB target
   ≤ 4 MB and USDZ target ≤ 8 MB. The restrained 44-flake field is the supported
   composition from SE 3 upward; no untested adaptive-quality claim is made.
10. Animation pauses when the document is hidden, and reduced-motion mode removes
    automatic rotation and continuous snowfall while preserving manual actions.
11. Every visible action has a keyboard label/focus state; AR guidance is
    readable without relying on color.
12. Personalization rewards attention instead of demanding it. The visual center
    is always the globe. “喜欢滑雪的 Fay” appears only as a small, low-contrast
    engraving integrated into the base—present and readable, but neither
    spotlighted nor announced. There is no large `FAY`, prominent dedication,
    date, sender name, sentimental slogan, pulsing highlight, or reveal animation.
    The engraving exists at one physical azimuth only: it is centered on the
    base precisely when the penguin's face and chest are front-facing.
13. The inline vector exists only to avoid a blank flash during ordinary model
    startup. It is not an offline or network-failure feature.
14. Automatic motion consists of the brief orientation settle plus a restrained,
    continuous 3D snow stream. Snow moves quickly and diagonally and may read as
    headwind, but adding it cannot change a viewer's judgment of the skier's
    downhill direction. It cannot read as slow vertical snowfall, rain, or a
    screen overlay. Reduced-motion mode starts calm and flake-free while keeping
    manual rotation and AR available.
15. The engraving crosses the line from hidden to discoverable without becoming
    a headline: at 375 px portrait it is readable without zoom when someone
    deliberately looks at the base, but it is not among the first three visual
    elements that attract attention. Static fallback, 3D, and AR keep the same
    wording, placement, and restrained hierarchy.
16. Static-to-3D replacement does not visibly jump in scale, framing, engraving
    position, or overall luminance. The progress treatment never becomes a
    permanent spinner or a support flow.
17. Welcome motion never blocks interaction. The first pointer gesture gives
    control to the visitor immediately and cancels automatic rotation naturally.
    Returning from Quick Look restores the calm page without replaying the
    welcome sequence or entering an error state.
18. AR exports the globe upright at an intended physical height of about 24 cm,
    suitable for a tabletop. Real-device release checks must reject a model that
    arrives giant, tiny, tilted, floating, or difficult to place.
19. The AR expectation is conversational, not a policy banner: “会打开 iPhone
    相机，把水晶球放到桌面；画面不会上传到这个网页.” In-app guidance is
    tailored to the detected browser when possible and always offers “复制链接”
    when no direct Safari action exists. The `#ar` intent is preserved.
20. Portrait Safari's expanding/collapsing browser bars and safe areas cannot
    cover the controls on the specified iPhone sizes.
21. Link-preview metadata and artwork are intentional, identify a refined snow
    globe rather than a repository or technical demo, and do not reveal the
    quiet engraving surprise before the page opens.
22. The snow terrain remains fully within the glass sphere with a visible glass
    margin from front, back, both sides, both three-quarter views, high view, and
    low view. It cannot form a lid, platter, snowball, or silhouette outside the
    globe.
23. Snow starts automatically when the loaded model becomes visible and loops
    at stable density. Individual streaked flakes occupy varied depths in globe
    coordinates, move on fast diagonal paths, and cross into the opaque snow cap
    before they are recycled. Position and scale match at the clip boundary;
    no flake may visibly teleport from the bottom to the top.

## 7. Implementation disposition

| Keep | Change | Delete | Defer |
|---|---|---|---|
| Penguin, skiing theme, snow-globe metaphor, spatial snow delight, quiet “喜欢滑雪的 Fay” engraving | Solid closed base, front-aligned penguin and engraving, tilted spherical-cap snow volume, fast looped volumetric snow, responsive composition, PBR materials, AR handoff | Snow button, slow vertical snow, screen-space particles, visible loop respawn, snow outside glass, hollow-looking base, planar engraving, fixed 380 px geometry, remote CDN/font dependencies, prominent dedication concepts | Audio and richer native AR animation until requested and tested on a real iPhone |

## 8. Acceptance evidence plan

- Static/model validation: GLB header and declared length, USDZ ZIP integrity,
  local asset references, dependency audit, triangle and file-size budgets.
- Browser runs: 375 × 667 (SE 3), 375 × 812 (12/13 mini), and 390 × 844
  (iPhone 12-class and newer); check portrait overflow, first useful frame,
  progress, model load, rotation during ambient snow, and console errors.
- Performance: cold and warm navigation transfer/timing, JS heap, long tasks,
  and a throttled mobile run. Record any gap rather than claiming a device result.
- AR: verify the deployed GLB/USDZ response headers and the visible launch path.
  Final native placement remains pending until tested in iPhone Safari because a
  desktop browser cannot prove Quick Look placement.

## 9. Remaining gap from an excellent product

The largest unavoidable gap is real-device evidence: a responsive desktop
emulation can prove layout and web rendering, but only iPhone Safari can prove
the Quick Look handoff, physical scale, glass appearance, and thermal behavior.
The release must label those items pending until that test is completed.

## 10. User-representative defense transcript

| Round | Product advocate claim | User objection | Severity | Adjudication / contract change | Remaining uncertainty |
|---:|---|---|---|---|---|
| 1 | Personalization should be explicit on first contact | A prominent name or dedication would make the object feel like a greeting-card demo | Superseded by direct user correction | Removed all prominent personalization; retained only the original quiet base engraving | Real-device legibility |
| 1 | Globe tap and button can both create snow | Tap and drag intent collide | Probable blocker | Globe tap does nothing; one dedicated snow control owns the action | Thumb feel on SE 3 |
| 1 | AR can be one tap everywhere | In-app browsers cannot honestly provide the same path | Probable blocker | Keep the gift usable, preserve `#ar`, give browser-specific guidance and copy-link fallback, then require one real Safari tap | Menu labels vary by app/version |
| 1 | A loader with progress is sufficient | The initial frame should not flash blank during ordinary loading | Friction | Keep an inline first-frame poster, but make no weak-network or recovery promise | Static/3D visual continuity |
| 2 | Low-contrast engraving is tasteful | Low contrast may become invisible on a 375 px phone or in glare | Probable blocker | Legibility-with-attention threshold added; not top-three visual prominence; verify static, 3D, and AR | Material and display brightness |
| 2 | Brief welcome motion feels alive | Automatic motion might hold control or replay after AR | Friction | Manual input cancels it immediately; Quick Look return stays calm | Native return lifecycle |
| 2 | AR conveys a tabletop gift | Scale and upright placement were undefined | Blocking for release | Export target fixed near 24 cm and upright; giant/tiny/tilted/floating placement is a release failure | Must be tested on real iPhones |
| 2 | Supported portrait sizes are enough | Dynamic Safari bars can still cover controls | Probable blocker | Safe-area and dynamic-height checks retained only for the specified portrait iPhones | True Safari behavior |
| 2 | Page contents establish trust | Chat previews may expose a repo-like/technical presentation | Missing need / trust | Add intentional title, icon, and generic preview art without revealing the engraving | Platform preview caching |
| 3 | The first refined model is ready | User screenshots show a hollow-looking center, misaligned engraving, snow outside the globe, and permanent flakes | Blocking | Treat the screenshots as the visual contract; close the base, align fronts, shrink the bank, and remove all static flakes | Recheck every draggable view |
| 3 | A snow button proves dynamic snow exists | The button merely overlays a second layer on frozen flakes and particles appear abruptly | Blocking | Idle and settled states contain zero flakes; one click staggers fade-in, downward fall, and independent fade-out with no respawn | Verify a timed visual sequence |
| 4 | A front screenshot is enough | Snow/glass intersection and engraving azimuth can fail from side, high, or low views | Blocking | Final acceptance requires real UI dragging through front, back, both sides, both three-quarter views, high, and low views | Xhigh visual reviewer must repeat after every structural change |

**Superseded intermediate verdict:** PASS for the four earlier screenshot-derived corrections.
At 390 × 844, a GPT-5.6-Sol xhigh visual reviewer used real drag gestures to
inspect the front, back, both sides, both three-quarter views, high view, and
low view. It found a solid base, one correctly aligned and restrained front
engraving, a contained snow bank, and a zero-to-fall-to-zero snow lifecycle
with no bottom respawn. The user's next review correctly superseded this pass:
the result still lacked a curved inscription, a downhill story, and spatial
snow. Passing defect repair was not evidence of an excellent gift experience.

**Current shortest satisfying flow:** Open → see the complete globe already in
fast, restrained wind-driven snow → drag to confirm its depth and happen upon the
engraving → tap “放到房间里” → tap once in Safari if the original browser cannot
launch Quick Look → place an upright, believable tabletop globe → return to the
same living scene.

## 11. Structural experience reset after the second user correction

### Current-state audit

| Artifact evidence | Actual experience | Verdict |
|---|---|---|
| `BaseEngraving` uses one flat rectangular plane in front of a convex lathed base | The words stay planar while the wood curves away, so the inscription reads as an applied label | Reject |
| `SnowMound` is a rotationally symmetric lathed form | It solves containment but removes the original steep downhill direction; the penguin stands on a snow bun | Reject |
| `Snowfall` draws particles into an HTML canvas above the 3D viewer | Camera orbit changes the object but not the particle volume; snow appears attached to the screen | Reject |
| A fixed HTML glass-light layer sits above the 3D viewer | Part of the object's highlight is screen-space decoration rather than evidence of one coherent object | Delete |

### Requirement/source audit

| Requirement | Source | Status | Contract consequence |
|---|---|---|---|
| Inscription follows the convex base instead of a flat plane | User | Stated | Every glyph is carried by a curved surface sampled from the base profile; no rectangular edge or visible air gap |
| Preserve the original steep-slope and downhill idea | User + original artifact | Stated | Default view must communicate descent before the visitor rotates the globe |
| Snow changes spatially when the view changes | User | Stated | Snow is 3D model geometry at varied depths; no screen-space particle layer |
| Make a substantial aesthetic and experiential advance | User | Stated | Recompose the diorama around one captured downhill instant rather than polishing the symmetric ornament |
| Add prominent dedication, game mechanics, music, or extra copy | None | Invented and forbidden | Do not add |
| Add weak-network, broken-screen, Android, WebXR, or landscape recovery | User correction | Explicit non-goal | Do not add |

### Rebuilt journey

| Contact | User wants | User sees and does | What persists / changes |
|---|---|---|---|
| First | Feel that the gift was composed, not assembled | The default view first reads as a penguin committing to a diagonal descent while fast wind-driven flakes cross real depth. On closer inspection, the quiet words follow the walnut belly | Nothing personal is stored; the ambient loop remains secondary to the skier |
| Second | Confirm the object rewards handling | One drag to either three-quarter view reveals the filled snow volume, track depth, particle parallax, and the inscription wrapping away around the base | Same living initial object; no tutorial or stale interaction state |
| Nth | Revisit one satisfying interaction without maintenance | Rotate while near and far flakes reveal depth; optionally launch AR | No scores, state management, setup, analytics, or accumulating effects |

### Replacement experience contract

24. The hero composition is an asymmetric captured descent. The ridge is high
    at left/back and opens toward right/front; the penguin sits in the upper
    third rather than the center. The default front view must read as downhill
    motion without explanation.
25. Penguin lean, foot equipment, terrain fall line, and tracks share one
    downhill vector. Tilting the character alone is a failure.
26. Two ski tracks are sculpted into the terrain height itself. Their grooves,
    light edge displacement, depth, and width taper along the surface; flat
    decals, equal-width lines, and floating tubes are forbidden.
27. The engraving surface samples the same radius-versus-height profile as the
    convex walnut base and wraps through a real horizontal arc. Only glyphs are
    visible. At three-quarter, high, and low views the text must foreshorten and
    remain attached; a rectangular boundary or air gap is a release failure.
28. Snow is animated 3D geometry within the glass volume at multiple depths.
    Camera movement cannot restart, reseed, billboard, or screen-lock it. Flakes
    avoid the penguin volume. They move quickly along varied diagonal paths and
    finish by passing just beneath the opaque snow surface, where occlusion—not
    a visible bottom respawn—makes them disappear.
29. Snow density stays low enough that the penguin silhouette and fall line
    remain readable. Model reveal and camera interaction cannot visibly hitch or
    restart the ambient loop.
30. No HTML canvas, DOM particle effect, or fixed screen-space glass highlight
    may sit over the loaded 3D object. The loading illustration remains merely
    a first-frame placeholder.
31. The initial web and AR orientation presents the face, fall line, and curved
    inscription together. SE3 and mini may scale the composition only; they may
    not crop away the visual story.

### Implementation disposition

| Keep | Rebuild | Delete | Defer |
|---|---|---|---|
| Penguin source model, quiet phrase, walnut/brass restraint, drag and AR actions | Directional closed terrain, physically coordinated penguin pose, sculpted tapered tracks, curved inscription carrier, continuous volumetric snow animation | Rotational snow mound, planar engraving, canvas snowfall, fixed glass-light overlay, manual snow control | Real-iPhone Safari/Quick Look appearance and thermal proof until device access |

### User-representative defense, new direction

| Round | Advocate claim | User objection | Severity | Contract response | Proof still required |
|---:|---|---|---|---|---|
| 1 | A steeper asymmetric ridge restores skiing | A smooth slanted snow bun or merely tilted penguin still reads as a misplaced figurine | Blocking | Require offset composition, shared fall line, sculpted tapering tracks, and default-view downhill legibility | Default and side renders |
| 1 | Curving the inscription solves the label | A bent plane can still float or expose a rectangle | Blocking | Sample the base profile at every engraving row; render glyphs only; reject any gap or border | Three-quarter, high, and low views |
| 1 | 3D particle positions solve snow | Snow can still reset on drag, intersect objects, obscure the scene, or hitch | Blocking | Keep animation time independent of camera; use depth lanes and terrain-aware endings under a strict density budget | Continuous drag during timed snowfall |
| 1 | Passing earlier checks proved refinement | Defect removal did not create speed, drama, or authorship | Blocking | Supersede the earlier pass and make first-glance motion the primary visual criterion | Unprompted visual read |
| 2 | Drag 120 degrees during the early 0.8–2 second interval | That timing forces an unnatural flick immediately after tapping and compresses the snow into a demo effect | Blocking | Give the main fall at least roughly 2.5–4 seconds of usable observation; 120 degrees is reviewer coverage at normal speed, not a user deadline | Timed interaction recording |
| 2 | Scale flakes away before they reach the ground | Visible shrinkage would expose particle cleanup | Blocking | Let flakes become naturally occluded by the opaque terrain; reset only after every visible flake is already hidden | Low and three-quarter views near the end |

### Acceptance evidence plan for the reset

- Capture the stable default view first; a reviewer must describe descent and
  its direction without being told where the slope is.
- Use real UI drag through front, back, both sides, both three-quarter views,
  high, and low. Either three-quarter view must simultaneously prove terrain
  height, track relief, and curved-text foreshortening.
- Rotate at normal hand speed through at least 120 degrees while the ambient
  loop continues. Compare multiple frames for depth parallax, uninterrupted
  motion, object avoidance, and absence of screen-locking or reseeding.
- Observe through multiple 4.8-second boundaries and for sixty seconds in total;
  reject any shared empty beat, brightness pulse, synchronized refill/clear, or
  camera-triggered restart.
- Repeat stable-layout checks at 375 × 667, 375 × 812, and 390 × 844. Record
  desktop frame timing as provisional; do not call iPhone performance proven
  until a real supported phone is tested.

### Remaining gap from excellent

The concept now has an explicit standard, but it is not yet earned by prose or
geometry names. Excellence requires the first unprompted visual read to be
"downhill motion," followed by physical confirmation while rotating and while
snow is falling. Real iPhone Safari and Quick Look remain the final performance,
glass, scale, and AR-orientation authority.

**Round-two user-representative verdict after the two corrections above:**
PROCEED to implementation. The visual direction has no remaining conceptual
blocker; every remaining objection is an explicit interaction or visual proof
required before release.

## 12. Snow-volume correction from the user

The asymmetric height-field direction above was still too interpretive. The
user clarified the intended construction directly: first fill the bottom of a
sphere to one flat snow level, then tilt that filled miniature so the flat snow
surface becomes the downhill plane. This section supersedes contract item 24's
"asymmetric ridge" and any implementation based on an isolated terrain island.

### Corrected geometry contract

32. The settled snow is a true spherical cap: one nearly planar upper snow
    surface spans the complete interior width available at that fill level,
    while the lower snow volume closes continuously along the inside of the
    globe. It is not an oval mound, height-field island, platter, or floating
    wedge.
33. Slope comes from one rigid transform shared by the snow cap, its carved
    tracks, and the penguin. The glass stays concentric; because it is a sphere,
    rotating the filled miniature creates the intended diagonal snow plane
    without changing its containment.
34. The cap radius stays slightly inside the glass radius. From every orbit and
    the allowed high/low camera limits, the snow can approach the wall but may
    never cross it, reveal an open underside, or leave a black seam above the
    base neck.
35. The penguin's original horizontal foot-contact plane is placed on the
    unrotated snow surface before the shared tilt. This preserves believable
    contact without selecting an unrelated pole or carried-ski vertex as the
    support point.
36. Only fine wind relief and genuinely recessed, fading ski grooves may disturb
    the plane. Those details cannot recreate a central mound or a colored decal.
37. Wind-driven flakes remain in globe coordinates and cross the scene on fast
    diagonal paths. Their projection, the body's force line, and the slope must
    preserve one unambiguous downhill reading rather than establish competing
    directions. Landing points are sampled on the transformed cap; after
    crossing the plane, the closed opaque snow volume must hide them from front,
    back, side, high, and low views. The cyclic restart occurs only while each
    flake is invisible.

### Corrected acceptance read

- Default: one continuous diagonal snow plane fills the globe bottom and leaves
  open run-out in front of the skier.
- Side and low: the lower snow mass follows the inner sphere into the base; no
  thin plate, exposed bottom, floating island, or neck-gap silhouette is visible.
- High: the plane reads as the complete top of the filled snow volume, not a
  circular snow bun surrounding the penguin.
- Rotation: the cap, tracks, and penguin retain one rigid relationship while
  the engraving foreshortens independently on the fixed base.
- Snowfall: camera orbit proves near/far parallax while every flake disappears
  by physical occlusion at the inclined plane, not by a bottom reset.

### Default high-speed snow addendum

38. The snow stream is atmospheric hierarchy, not the subject. Across any
    ten-second observation it cannot continuously obscure the face, body force
    line, or main slope for more than roughly half a second, and its mixture of
    short crystals and longer streaks cannot resolve into uniform parallel rain.
39. The loop maintains stable density and exact boundary continuity. A
    sixty-second watch with slow orbit must not reveal a shared empty beat,
    brightness pulse, synchronized top refill, bottom clear, or camera-triggered
    restart.
40. No hidden globe-tap pause is introduced. Visibility loss pauses the mixer;
    return resumes naturally without catch-up. A reduced-motion visit never
    starts the snow animation, so no high-speed flake flashes before stopping.

## 13. Final browser visual acceptance

On 2026-09-03, a GPT-5.6-Sol xhigh visual reviewer reloaded the built page and
used real drag gestures rather than static source inspection. It covered the
default/front/back views, both sides, both three-quarter views, and the allowed
high/low camera limits. The filled tilted snow cap remained continuous and
inside the glass; the penguin stayed in contact and read as an aggressive
downhill carve; and the engraving remained attached to the convex walnut base,
foreshortening and disappearing at the correct azimuth.

After the final groove-only model adjustment, the reviewer confirmed that two
separate recessed ski cuts remain countable at default, both three-quarter
views, and the highest view. Their darker compacted bottoms and small bright
lips change with perspective, remain inside the displaced snow surface, and do
not read as blue decals or floating tubes.

The same reviewer then watched the automatic snow for a continuous sixty
seconds while making small forward and reverse rotations near 10-second
intervals. Snow remained present without an all-field empty beat, brightness
pulse, synchronized top refill, synchronized bottom clear, loop-boundary hitch,
or camera-triggered restart. Near/far occlusion and parallax remained visible,
and density never displaced the skier as the subject.

Responsive browser checks passed at 390 × 844, 375 × 812, and 375 × 667 with a
single AR button and no crop, collision, or horizontal overflow. The final
groove adjustment changed only model geometry, not page layout. Automated
acceptance reports 65,320 triangles, a 3,201,852-byte GLB, a 7,976,772-byte
USDZ, and 0.2346 m AR height; `usdchecker` reports success.

This is browser/model acceptance, not a substitute for hardware evidence. A
real supported iPhone must still confirm Safari touch feel, sustained frame
pacing and temperature over ten minutes, Quick Look handoff, upright tabletop
placement, glass/material appearance, and the engraving's physical-size
legibility before deployment is called fully device-accepted.
