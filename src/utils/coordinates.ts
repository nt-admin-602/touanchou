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

// キャンバスサイズが実質無制限（大きい固定値）のとき、縦幅合わせで
// ズームがガラス片を扱えないほど小さくならないようにする下限
const MIN_INITIAL_ZOOM = 6

/**
 * キャンバスを縦幅合わせ・左端揃えで表示する初期 viewport を計算する。
 * screenH は CanvasRoot コンテナ自身の高さ（ツールバー・パレットを除いた
 * 実際の描画可能領域）がすでに渡される前提。ここで再度差し引かない。
 * キャンバスが実質無制限の大きな値の場合、縦幅合わせのズームは使い物に
 * ならないほど小さくなるため、下限（MIN_INITIAL_ZOOM）でクランプする。
 */
export function calcInitialViewport(
  _canvasWidthMm: number,
  canvasHeightMm: number,
  _screenW: number,
  screenH: number,
  paddingPx = 16,
): Viewport {
  const availH = screenH - paddingPx * 2
  // 縦幅合わせ（下限あり）
  const zoom = Math.max(MIN_INITIAL_ZOOM, availH / canvasHeightMm)
  // 左端を paddingPx に揃える
  const panX = paddingPx
  const panY = 48 + paddingPx
  return { zoom, panX, panY }
}

/**
 * 現在ディスプレイに表示されている範囲（ツールバー・パレットを除く描画領域）を、
 * キャンバス境界内にクランプした mm 座標の矩形として返す。
 */
function getVisibleCanvasRectMm(
  vp: Viewport,
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW: number,
  screenH: number,
): { left: number; right: number; top: number; bottom: number } {
  const p1 = screenToMm(0, VIEWPORT_TOOLBAR_H, vp)
  const p2 = screenToMm(screenW, screenH - VIEWPORT_PALETTE_H, vp)
  const clampX = (v: number) => Math.min(canvasWidthMm, Math.max(0, v))
  const clampY = (v: number) => Math.min(canvasHeightMm, Math.max(0, v))
  return {
    left:   clampX(Math.min(p1.x, p2.x)),
    right:  clampX(Math.max(p1.x, p2.x)),
    top:    clampY(Math.min(p1.y, p2.y)),
    bottom: clampY(Math.max(p1.y, p2.y)),
  }
}

/**
 * 現在ディスプレイに表示されている範囲（キャンバスのうち今画面に映っている部分）の
 * 中心を mm 座標で返す。鏡像配置の反転基準線の初期位置に使う。
 */
export function getVisibleCenterMm(
  vp: Viewport,
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW = window.innerWidth,
  screenH = window.innerHeight,
): { x: number; y: number } {
  const rect = getVisibleCanvasRectMm(vp, canvasWidthMm, canvasHeightMm, screenW, screenH)
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  }
}

/**
 * 放射対称配置・鏡像配置の初期中心点を計算する。
 * 選択ガラス（群）の頂点のうち、今画面に表示されている範囲内で最も空いている方向
 * （上下左右のうち表示範囲の端までの距離が最大の方向）にある頂点を中心点にする。
 * ひし形6枚の星型配置のように、頂点同士をきっちり合わせたい用途を想定している。
 */
export function getRadialDefaultCenterMm(
  selectionVerticesMm: { x: number; y: number }[],
  vp: Viewport,
  canvasWidthMm: number,
  canvasHeightMm: number,
  screenW = window.innerWidth,
  screenH = window.innerHeight,
): { x: number; y: number } {
  if (selectionVerticesMm.length === 0) {
    return { x: canvasWidthMm / 2, y: canvasHeightMm / 2 }
  }

  const rect = getVisibleCanvasRectMm(vp, canvasWidthMm, canvasHeightMm, screenW, screenH)

  let cx = 0, cy = 0
  for (const v of selectionVerticesMm) { cx += v.x; cy += v.y }
  cx /= selectionVerticesMm.length
  cy /= selectionVerticesMm.length

  const spaceUp = cy - rect.top
  const spaceDown = rect.bottom - cy
  const spaceLeft = cx - rect.left
  const spaceRight = rect.right - cx
  const maxSpace = Math.max(spaceUp, spaceDown, spaceLeft, spaceRight)

  // 表示範囲内で最も空いている方向にある頂点（極値）を選ぶ
  let best = selectionVerticesMm[0]
  if (maxSpace === spaceDown) {
    for (const v of selectionVerticesMm) if (v.y > best.y) best = v
  } else if (maxSpace === spaceUp) {
    for (const v of selectionVerticesMm) if (v.y < best.y) best = v
  } else if (maxSpace === spaceRight) {
    for (const v of selectionVerticesMm) if (v.x > best.x) best = v
  } else {
    for (const v of selectionVerticesMm) if (v.x < best.x) best = v
  }

  return {
    x: Math.min(canvasWidthMm, Math.max(0, best.x)),
    y: Math.min(canvasHeightMm, Math.max(0, best.y)),
  }
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
