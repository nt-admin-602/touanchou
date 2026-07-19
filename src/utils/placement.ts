import type { GlassItem, MirrorAxis, PatternDirection } from '../types'
import { getShapeVertices, rotateVertices } from './geometry'

let _previewCounter = 0
function previewId(base: string, idx: number): string {
  return `pv-${++_previewCounter}-${idx}-${base}`
}

// ── 複製 ──────────────────────────────────────────────────────────────────────

export function computeDuplicateItems(
  sourceItems: GlassItem[],
  offsetX: number,
  offsetY: number,
): GlassItem[] {
  return sourceItems.map((item, i) => ({
    ...item,
    id: previewId(item.id, i),
    xMm: item.xMm + offsetX,
    yMm: item.yMm + offsetY,
  }))
}

// ── 鏡像配置 ─────────────────────────────────────────────────────────────────

export function computeMirrorItems(
  sourceItems: GlassItem[],
  axis: MirrorAxis,
  cx: number,
  cy: number,
): GlassItem[] {
  return sourceItems.map((item, i) => {
    const { xMm: x, yMm: y, rotationDeg: r } = item
    let nx: number, ny: number, nr: number

    switch (axis) {
      case 'horizontal':   // 上下反転（水平線 y=cy で反射）
        nx = x;             ny = 2 * cy - y;  nr = -r;       break
      case 'vertical':     // 左右反転（垂直線 x=cx で反射）
        nx = 2 * cx - x;   ny = y;            nr = 180 - r;  break
      case 'diagonal-fwd': // ↗↙ (/) 軸
        nx = cx + cy - y;  ny = cx + cy - x;  nr = -r - 90;  break
      case 'diagonal-bwd': // ↘↖ (\) 軸
        nx = cx - cy + y;  ny = -cx + cy + x; nr = 90 - r;   break
    }

    return {
      ...item,
      id: previewId(item.id, i),
      xMm: nx,
      yMm: ny,
      rotationDeg: ((nr % 360) + 360) % 360,
    }
  })
}

// ── 放射対称配置 ──────────────────────────────────────────────────────────────

export function computeRadialItems(
  sourceItems: GlassItem[],
  count: number,
  cx: number,
  cy: number,
): GlassItem[] {
  const result: GlassItem[] = []
  for (let step = 1; step < count; step++) {
    const angleDeg = (360 / count) * step
    const rad = angleDeg * (Math.PI / 180)
    const cosA = Math.cos(rad), sinA = Math.sin(rad)
    for (const item of sourceItems) {
      const dx = item.xMm - cx, dy = item.yMm - cy
      result.push({
        ...item,
        id: previewId(item.id, step * 1000 + result.length),
        xMm: cx + dx * cosA - dy * sinA,
        yMm: cy + dx * sinA + dy * cosA,
        rotationDeg: ((item.rotationDeg + angleDeg) % 360 + 360) % 360,
      })
    }
  }
  return result
}

// ── パターン連続配置 ──────────────────────────────────────────────────────────

/** 連続配置の各方向の単位ベクトル（キャンバス外接矩形へのドラッグ投影に使用） */
export const PATTERN_DIRECTION_UNIT: Record<PatternDirection, { x: number; y: number }> = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
  ul:    { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  ur:    { x: Math.SQRT1_2,  y: -Math.SQRT1_2 },
  ll:    { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  lr:    { x: Math.SQRT1_2,  y: Math.SQRT1_2 },
}

export function computePatternItems(
  sourceItems: GlassItem[],
  direction: PatternDirection,
  repeatCount: number,
  groutGapMm: number,
): GlassItem[] {
  // ソースアイテムのバウンディングボックスを計算
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const item of sourceItems) {
    for (const v of rotateVertices(getShapeVertices(item.shape), item.rotationDeg)) {
      const wx = v.x + item.xMm, wy = v.y + item.yMm
      if (wx < minX) minX = wx
      if (wx > maxX) maxX = wx
      if (wy < minY) minY = wy
      if (wy > maxY) maxY = wy
    }
  }
  const pw = maxX - minX + groutGapMm
  const ph = maxY - minY + groutGapMm

  const dirMap: Record<PatternDirection, [number, number]> = {
    up:    [0,  -ph], down:  [0,   ph],
    left:  [-pw,  0], right: [ pw,  0],
    ul:    [-pw, -ph], ur: [ pw, -ph],
    ll:    [-pw,  ph], lr: [ pw,  ph],
  }
  const [odx, ody] = dirMap[direction]

  const result: GlassItem[] = []
  for (let i = 1; i <= repeatCount; i++) {
    for (const item of sourceItems) {
      result.push({
        ...item,
        id: previewId(item.id, i * 1000 + result.length),
        xMm: item.xMm + odx * i,
        yMm: item.yMm + ody * i,
      })
    }
  }
  return result
}
