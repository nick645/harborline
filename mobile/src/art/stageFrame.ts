// Shared by Stage and the scenes that lay tap targets over it.

/**
 * How a scene sits in its frame. Scale up until the scene's height fits (cropping a little off
 * the sides), never cropping more than a fifth of the width; past that the sky extends above.
 * Overlays (tap targets) use this to land on the drawing: screen x = (sceneX − cropX) · s,
 * screen y = (sceneY + above) · s.
 */
export function stageFrame(width: number, height: number | undefined, W: number, H: number) {
  const fit = width / W
  const cover = height ? Math.min(height / H, fit * 1.25) : fit
  const s = Math.max(fit, cover)
  const visibleW = width / s
  const cropX = (W - visibleW) / 2
  const want = height ? height / s : H
  const extra = Math.max(0, want - H)
  // Most of the extra goes above, so the action stays near the bottom of the frame like a stage.
  const above = extra * 0.7
  const below = extra - above
  return { s, visibleW, cropX, above, below, total: H + extra }
}
