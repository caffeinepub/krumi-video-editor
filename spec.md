# Krumi Video Editor

## Current State
Fully implemented editor with video clips, audio tracks, text overlays (with drag, font size, color, bold), transitions stored in state but not visually applied during playback, and export.

## Requested Changes (Diff)

### Add
- **Video trimming**: Each clip in the timeline should have trim handles (start time / end time sliders). When a clip is active, a trim UI appears allowing the user to set in/out points. The video playback respects trimStart and trimEnd on the clip.
- **Font families**: In the Text panel, add a font family selector with at least 6 options (e.g. Sans-serif, Serif, Monospace, Cursive, Impact, Georgia). The selected font is applied to new overlays and rendered on the preview and export canvas.

### Modify
- **Fix transitions not showing during playback**: Currently transitions are stored in state but never applied visually. Fix this so that when playback advances from one clip to the next, the chosen transition (fade, slide-left, slide-right, zoom-in, zoom-out) is rendered as a CSS/canvas animation on the preview. The simplest approach: use a CSS class on the video element that changes when switching clips, applying the appropriate keyframe animation for ~0.5s. Also, the project name and clips should display correctly in the editor (the project name should show in the header from state.project.name).

### Remove
- Nothing

## Implementation Plan
1. Extend `Clip` type in App.tsx to include `trimStart?: number` and `trimEnd?: number`.
2. Add `UPDATE_CLIP` action to reducer that merges clip fields by id.
3. In EditorScreen, add a trim UI panel that appears when a clip is selected in timeline: two range sliders for trimStart and trimEnd within [0, clip.duration]. Display current trim values. Dispatch UPDATE_CLIP on change.
4. When setting videoRef.current.src or switching clips, apply trimStart as currentTime and add a `timeupdate` listener that pauses/advances at trimEnd.
5. Add FONT_FAMILIES array to EditorScreen. Add a font family state and selector buttons in the Text panel (similar to font size buttons). Store fontFamily on TextOverlay type. Apply fontFamily in preview overlay style and export canvas ctx.font.
6. Fix transition playback: track `transitionState` (idle | transitioning). When active clip index changes, trigger a CSS class (e.g. `clip-transition-fade`, `clip-transition-slide-left`) on the video wrapper div for 500ms then remove it. Define keyframes in index.css for each transition type.
