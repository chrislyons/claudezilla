# CLZ006 Watermark Visual Effects Reference

**Created:** 2026-01-06
**Status:** Locked - Do not modify coordinates without testing

## Overview

The Claudezilla watermark badge appears in the lower-left corner of pages controlled by the extension. It displays an animated monster character with orbiting electrons that activate when Claude is working.

## Shadow DOM Isolation (v0.4.8)

The watermark uses **Shadow DOM** to prevent page CSS from corrupting SVG transforms and element positioning.

**Why Shadow DOM:**
- Page CSS resets (`* { box-sizing: border-box }`) were overriding SVG transforms
- Flexbox/centering rules on pages affected absolutely positioned elements
- Different sites caused intermittent positioning bugs

**Implementation:**
```javascript
watermarkShadow = watermarkElement.attachShadow({ mode: 'closed' });
```

The closed shadow root prevents external JavaScript from accessing internal elements while providing complete CSS isolation.

## SVG Transform Pattern

**Critical - DO NOT CHANGE:**

The master SVG group uses a translate-scale-translate pattern for center-based scaling:
```svg
<g id="claudezilla-breathe" transform="translate(32, 32) scale(1.20) translate(-32, -32)">
```

**Why this pattern:**
- CSS `transform-origin: center` with `transform-box: fill-box` does NOT work reliably on nested SVG groups in Firefox
- The SVG viewBox is 64x64, so center is (32, 32)
- Pattern: translate to center → scale → translate back

**Do NOT use CSS transforms on SVG groups:**
```svg
<!-- WRONG - breaks in Firefox -->
<g style="transform-origin: center; transform-box: fill-box; transform: scale(1.20);">

<!-- CORRECT - pure SVG approach -->
<g transform="translate(32, 32) scale(1.20) translate(-32, -32)">
```

## Speech Bubble Positioning

**LOCKED COORDINATES - Calibrated 2026-01-06:**

```css
.speech-bubble {
  position: absolute !important;
  top: 36px !important;
  right: 32px !important;
  left: auto !important;
  bottom: auto !important;
  margin: 0 !important;
}
```

These values place the music note bubble near the monster's mouth within a 100x100px container with 12px padding.

**Coordinate system:**
- Container: 100x100px (`.watermark-inner`)
- Padding: 12px (SVG renders in 76x76 content area)
- Speech bubble: 8x8px
- Position: top-right of eye/mouth area

**If recalibration needed:**
1. Change shadow mode to `'open'` temporarily
2. Use browser DevTools to inspect computed styles
3. Adjust `top` and `right` values
4. Change shadow mode back to `'closed'`
5. Update this document with new values

## File Reference

**Primary file:** `extension/content.js`

Key sections:
- `CLAUDE_LOGO_SVG` constant (~line 28-147) - SVG markup with gradients and animations
- `initWatermark()` function (~line 154-294) - Shadow DOM setup and styles
- `triggerElectrons()` function (~line 446-462) - Activates animation on commands

## Animation States

**Passive state:**
- Tesseract frame visible
- Monster character centered
- Glow behind character
- Electrons hidden (opacity: 0)
- Speech bubble hidden (opacity: 0, scale: 0)

**Active state (triggered by MCP commands):**
- Electrons animate along tesseract edges
- Arms wave (animateTransform)
- Speech bubble appears with pop animation
- Auto-reverts to passive after 5s idle

## Troubleshooting

**Symptom:** Orange vertical bar appears during active state
**Cause:** CSS override of SVG group transforms
**Fix:** Ensure Shadow DOM isolation is working

**Symptom:** Speech bubble centered on monster body
**Cause:** Page CSS affecting absolute positioning
**Fix:** Shadow DOM isolation + explicit `left: auto; bottom: auto`

**Symptom:** Elements invisible or outside container
**Cause:** Transform coordinates wrong
**Fix:** Verify translate-scale-translate pattern uses correct center (32, 32)

## Change History

| Date | Change | Coordinates |
|------|--------|-------------|
| 2026-01-06 | Shadow DOM isolation, recalibrated | top: 36px, right: 32px |
| Previous | Original implementation | top: 48px, right: 45px |
