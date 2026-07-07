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

/** キャンバスをスクリーンに収める初期 viewport を計算する */
export function calcInitialViewport(
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW: number,
  screenH: number,
  paddingPx = 16,
  paletteHeightPx = 120,
): Viewport {
  const availW = screenW - paddingPx * 2
  const availH = screenH - paletteHeightPx - paddingPx * 2 - 48 // toolbar
  const zoom = Math.min(availW / canvasWidthMm, availH / canvasHeightMm)
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
