---
name: cyanoff-design
description: Design-taste rules for building UI that does not look like an AI default — real design-system tokens, Pretendard typography, reference-first layouts, steady motion, and soft optional sound. Use when designing, building or reviewing interface work, especially Korean-language products.
---

# cyanoff-design

Agents produce the average of every interface they have seen. This skill lists the specific places where the average is wrong, and what to do instead. Apply it when you design, build or review UI.

Default posture: **fewer decisions, made on purpose, repeated everywhere.**

## 1. Start from references, not from imagination

Before inventing a layout, look at how shipped products solve the same screen.

- Collect 3–5 references for the screen type (onboarding, empty state, checkout, settings…). [Mobbin](https://mobbin.com) is the first stop for real-product flows and screens; use the flow, not just a single screenshot.
- Write down what the references agree on. That agreement is the convention — break it only with a reason you can state in one sentence.
- Match the *structure* (hierarchy, density, order of actions). Never copy brand assets, illustrations or copy.
- If you cannot reach a reference tool, say so and proceed from established platform conventions rather than inventing a novel pattern.

## 2. Tokens before values

If the project uses a design system (for example [SEED Design](https://seed-design.io)), every color, size, radius and spacing comes from its tokens.

- Never write a raw hex, a one-off `13px`, or an arbitrary radius when a token exists. If none fits, flag the gap instead of hard-coding.
- Prefer semantic tokens (`fg-neutral`, `bg-layer-default`, `stroke-neutral`) over palette tokens (`gray-600`). Semantic tokens survive dark mode and rebrands.
- Use the system's component first. Compose it; do not re-skin it.
- Without a design system, define a small token set up front (4–6 spacing steps, 3 radii, 2 font weights, one accent) and refuse to leave it.

## 3. Typography: Pretendard, set properly

For Korean or mixed Korean/Latin UI, use [Pretendard](https://github.com/orioncactus/pretendard) (the variable build when you can).

- One family. Hierarchy comes from size and weight, not from mixing fonts.
- Body line-height around 1.5–1.65 for Korean (more than Latin text needs). Headings tighter, 1.25–1.35.
- Apply `word-break: keep-all` to Korean text so words are not split mid-syllable-group; add `overflow-wrap: anywhere` only on narrow, user-generated strings.
- `font-variant-numeric: tabular-nums` for anything numeric that updates, aligns or sits in a table: prices, timers, scores, counts.
- Weights: 400 body, 600 emphasis, 700 only for the largest headings. Avoid 300 on small Korean text; the strokes thin out.
- Minimum 14px for body on mobile, 12px for captions that are not essential.

## 4. Motion: steady, not showy

Motion explains change. It should feel like the same hand did all of it.

- **One duration scale** for the whole product — for example 120ms (feedback), 200ms (enter/exit of small things), 320ms (layout, sheets). Do not invent a new number per component.
- **Enter with `ease-out`, exit with `ease-in`, move with `ease-in-out`.** An `ease-in` entrance feels sluggish; this is the single most common agent mistake.
- Animate `transform` and `opacity` only. Never animate `width`, `height`, `top` or `left` in hot paths.
- No bounce, overshoot or spring wobble on utility UI. Reserve playful easing for one moment of delight per screen at most.
- Never animate from `scale(0)`; start at `0.95` with opacity.
- Interruptible: a second tap mid-animation redirects it; it never queues.
- Anything that repeats many times a day (opening a menu, toggling a row) should be near-instant.
- Honor `prefers-reduced-motion`: replace movement with a cross-fade, keep the information.

## 5. Sound: soft, rare, optional

Sound is a seasoning. Most interfaces need none.

- Off or behind a clear setting unless sound is the point of the product. Never autoplay on load.
- Only for meaningful, low-frequency events (success, completion, a deliberate toggle). Never for hover, scroll, typing or errors that can repeat.
- Short (under ~300ms), low in volume, rounded: soft attack and release envelope, mid-low pitch, no harsh high frequencies or clicks.
- One small family of sounds with a shared tone; pair every sound with a visual state change so it is never the only signal.
- Respect system mute, and cap simultaneous playback at one.

## 6. Education and math flavor

For learning, exam and math-oriented products:

- Numbers and figures are content — give them room, tabular alignment and a consistent unit style. Never round for decoration.
- Diagrams are drawn on a grid with consistent stroke weight (one or two weights), labeled directly rather than through legends when possible.
- Show the work: prefer a step the reader can verify over a result they must trust.
- Calm color. One accent for "act here", one for "check this", neutrals for everything else. Reserve red for genuinely wrong.

## 7. Patterns that mark work as AI-default

Remove these on sight unless there is a stated reason:

- Gradient hero with a glowing blob; purple-to-blue everything.
- Cards nested in cards, each with its own shadow and border.
- Emoji as icons, or mixed icon libraries and stroke widths.
- Identical three-column feature grids with a centered icon above each.
- Centered everything. Left-align text; center only short, single-line moments.
- Generic copy ("Seamless", "Supercharge", "Unlock"). Write what the thing does.
- A solid 1px border where a soft, low-opacity shadow or a background shift would do.
- Placeholder data that looks too perfect. Test with long names, empty lists, huge numbers and one-character strings.

## Review checklist

- [ ] At least three references were consulted, and the shared convention is followed or knowingly broken
- [ ] No raw color/size/radius values where a token exists
- [ ] One type family; Korean text uses `keep-all`; numerals that change use `tabular-nums`
- [ ] Every animation uses the duration scale and the right easing, and animates only transform/opacity
- [ ] `prefers-reduced-motion` is handled
- [ ] Sound (if any) is optional, short, quiet, and never the only signal
- [ ] None of the section 7 patterns remain
