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

/** キャンバスを縦幅に合わせて拡大した初期 viewport を計算する */
export function calcInitialViewport(
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW: number,
  screenH: number,
  paddingPx = 16,
  paletteHeightPx = 120,
): Viewport {
  const availH = screenH - paletteHeightPx - paddingPx * 2 - 48 // toolbar
  // 縦幅合わせ：キャンバス高さを利用可能高さにフィット
  const zoom = availH / canvasHeightMm
  const panX = (screenW - canvasWidthMm * zoom) / 2
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
