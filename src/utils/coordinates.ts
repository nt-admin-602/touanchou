import type { Viewport } from '../types'

/** mm → スクリーン px */
export function mmToScreen(
  xMm: number,
  yMm: number,
  vp: Viewport,
): { x: number; y: number } {
  return {
    x: xMm * vp.zoom + vp.panX,
    y: yMm * vp.zoom + vp.panY,
  }
}

/** スクリーン px → mm */
export function screenToMm(
  xPx: number,
  yPx: number,
  vp: Viewport,
): { x: number; y: number } {
  return {
    x: (xPx - vp.panX) / vp.zoom,
    y: (yPx - vp.panY) / vp.zoom,
  }
}

/** 1mm スナップ */
export function snapMm(mm: number): number {
  return Math.round(mm)
}

/** 回転スナップ（5度単位） */
const ROTATION_SNAP_DEG = 5
export function snapDeg(deg: number): number {
  return Math.round(deg / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG
}

/** ビューポートの pan をクランプし、すべての辺で同一の最低マージンを強制 */
const VIEWPORT_MARGIN_PX = 80
const VIEWPORT_TOOLBAR_H = 48
const VIEWPORT_PALETTE_H = 120

export function clampViewport(
  vp: Viewport,
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW: number,
  screenH: number,
): Viewport {
  const cw = canvasWidthMm * vp.zoom
  const ch = canvasHeightMm * vp.zoom
  const m = VIEWPORT_MARGIN_PX
  // 各辺に最低 m px のキャンバスが見えるように pan を制限
  return {
    zoom: vp.zoom,
    panX: Math.max(m - cw, Math.min(screenW - m, vp.panX)),
    panY: Math.max(VIEWPORT_TOOLBAR_H + m - ch, Math.min(screenH - VIEWPORT_PALETTE_H - m, vp.panY)),
  }
}

/** キャンバスを縦幅合わせ・左端揃えで表示する初期 viewport を計算する */
export function calcInitialViewport(
  _canvasWidthMm: number,
  canvasHeightMm: number,
  _screenW: number,
  screenH: number,
  paddingPx = 16,
  paletteHeightPx = 120,
): Viewport {
  const availH = screenH - paletteHeightPx - paddingPx * 2 - 48 // toolbar
  // 縦幅合わせ
  const zoom = availH / canvasHeightMm
  // 左端を paddingPx に揃える
  const panX = paddingPx
  const panY = 48 + paddingPx
  return { zoom, panX, panY }
}

/** ピンチズーム後の viewport を計算する（ピンチ中心を固定） */
export function applyPinchZoom(
  vp: Viewport,
  scaleRatio: number,
  pinchCenterX: number,
  pinchCenterY: number,
  minZoom = 0.1,
  maxZoom = 20,
): Viewport {
  const newZoom = Math.min(maxZoom, Math.max(minZoom, vp.zoom * scaleRatio))
  const ratio = newZoom / vp.zoom
  return {
    zoom: newZoom,
    panX: pinchCenterX - (pinchCenterX - vp.panX) * ratio,
    panY: pinchCenterY - (pinchCenterY - vp.panY) * ratio,
  }
}
