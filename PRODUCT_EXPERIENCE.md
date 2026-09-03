# Product experience contract

Status: draft for user-representative defense. This document governs the v2
implementation; the original repository remains read-only.

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
| The snow bank must remain visibly inside the glass from every draggable view | User screenshots | stated correction | Narrow and raise the bank with a clear glass margin, including high and low camera angles |
| Snow exists only as a deliberate button-triggered event | User screenshots | stated correction | No permanent or welcome snow; particles fade in from zero, fall once, fade independently, and return to zero without respawning |
| The link may be opened inside WeChat/QQ/Weibo | Reference project | inferred | Do not block the gift; explain “open in Safari” only when AR is requested |
| Add audio, analytics, accounts, location upload, or a backend | None | invented | Forbidden unless separately requested |

## 3. Journey audit

### First contact

| Time / trigger | User goal | User sees | User action | System state | Wait | Can user do anything else? | Failure path | What persists |
|---|---|---|---|---|---:|---|---|---|
| Open shared URL | Understand what was sent | Midnight sky and a recognizable, composed globe silhouette | None | HTML/CSS ready | < 1 s target | Take in the object | Network delivery is outside the product promise | Normal HTTP cache |
| Model loading | See the actual gift | A soft nontechnical progress state and a calm nonblank stage | None | Local runtime and GLB streaming | < 5 s normal target | See the first-frame poster | If the model cannot be delivered, 3D simply does not load | Browser cache |
| First useful content | Enjoy and inspect it | A quiet globe with no suspended snow, a contained snow bank, a front-facing penguin, and a solid base whose centered low-contrast engraving reads “喜欢滑雪的 Fay” only on closer attention | Drag the globe | 3D interactive | Immediate | Discover the engraving; tap “让雪落下来” | Reduced-motion mode stays calm | Preference only; no personal data |
| Playful action | Make it feel alive | Snow emerges gradually from zero, falls once, thins out, and returns to a clear globe | Tap the dedicated snow button | One finite particle lifecycle | Immediate | Rotate model | No particle respawns at the bottom and repeat taps do not stack storms | Nothing |
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
| Interaction | Rotate and snow burst remain effortless | Pending implementation | Pointer, touch, and keyboard checks |
| Motion control | Reduced motion and hidden-tab pausing work | Pending implementation | Media-query and visibility tests |
| Reset | Every revisit begins in a clean state | Pending implementation | Reload and second-run test |
| Data/privacy | No analytics, storage, upload, or account | Pending implementation | Network and source audit |
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
complete static globe with a soft, nontechnical progress state. Dragging rotates
it; the settled globe contains no suspended flakes. The dedicated “让雪落下来”
control creates one gradual, finite snow fall. Globe taps
never compete with drag. A single “放到房间里” button, paired with “将进入
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
4. The main experience has exactly three obvious actions: rotate by dragging,
   make it snow from one dedicated button, and enter AR. A globe tap never
   triggers snow, so a slight drag cannot become an accidental action. No
   internal 3D/AR vocabulary appears in the primary UI.
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
   ≤ 4 MB and USDZ target ≤ 8 MB. Decorative snow adapts to device capability.
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
14. Automatic motion is limited to a brief auto-rotation settle. There is no
    automatic, static, or permanently suspended snow. Reduced-motion mode starts
    calm and keeps manual controls available.
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
22. The snow bank remains fully within the glass sphere with a visible glass
    margin from front, back, both sides, both three-quarter views, high view, and
    low view. It cannot form a lid, platter, or silhouette outside the globe.
23. A snow-button run starts from zero flakes. Individual flakes stagger their
    fade-in, fall downward without teleporting or respawning, fade out at
    different times, and leave the settled canvas empty again.

## 7. Implementation disposition

| Keep | Change | Delete | Defer |
|---|---|---|---|
| Penguin, skiing theme, snow-globe metaphor, rotate/snow delight, quiet “喜欢滑雪的 Fay” engraving | Solid closed base, front-aligned penguin and engraving, contained snow bank, finite fade-in/fall/fade-out snow, responsive composition, PBR materials, AR handoff | Static suspended snow, bottom respawn, snow outside glass, hollow-looking base, misaligned engraving, fixed 380 px geometry, remote CDN/font dependencies, prominent dedication concepts, globe-tap snow gesture | Audio and richer native AR animation until requested and tested on a real iPhone |

## 8. Acceptance evidence plan

- Static/model validation: GLB header and declared length, USDZ ZIP integrity,
  local asset references, dependency audit, triangle and file-size budgets.
- Browser runs: 375 × 667 (SE 3), 375 × 812 (12/13 mini), and 390 × 844
  (iPhone 12-class and newer); check portrait overflow, first useful frame,
  progress, model load, rotate, snow action, and console errors.
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

**Post-fix visual verdict:** PASS for all four screenshot-derived corrections.
At 390 × 844, a GPT-5.6-Sol xhigh visual reviewer used real drag gestures to
inspect the front, back, both sides, both three-quarter views, high view, and
low view. It found a solid base, one correctly aligned and restrained front
engraving, a contained snow bank, and a zero-to-fall-to-zero snow lifecycle
with no bottom respawn. Native AR placement and true Safari chrome remain
separate real-iPhone release evidence gaps—not permission to make the design
louder.

**Shortest satisfying flow:** Open → see a complete, quiet, flake-free globe →
drag to inspect and happen upon the engraving → use the explicit
snow control if desired → tap “放到房间里” → tap once in Safari if the original
browser cannot launch Quick Look → place an upright, believable tabletop globe →
return to the same calm page.
