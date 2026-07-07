import { SHAPE_CONFIG } from './shapes'

// 目地幅（spec §8.1）
export const DEFAULT_GROUT_GAP_MM = 2

// キャンバステンプレート（spec §6.3）
// Mサイズ: diamond縦置き7個分の高さ × 横30個分の幅
function calcMSize() {
  const d = SHAPE_CONFIG.diamond
  const side = d.sideLengthMm
  const halfAngleRad = (d.acuteAngleDeg / 2) * (Math.PI / 180)
  // diamond の縦方向高さ = 2 * side * sin(acuteAngle/2)
  const diamondH = 2 * side * Math.sin(halfAngleRad)
  // diamond の横方向幅 = 2 * side * cos(acuteAngle/2)
  const diamondW = 2 * side * Math.cos(halfAngleRad)
  const w = Math.round(diamondW * 30 + DEFAULT_GROUT_GAP_MM * 31)
  const h = Math.round(diamondH * 7  + DEFAULT_GROUT_GAP_MM * 8)
  return { widthMm: w, heightMm: h }
}

export const CANVAS_TEMPLATES = {
  M: calcMSize(),
  get S() {
    return {
      widthMm:  Math.round(CANVAS_TEMPLATES.M.widthMm  * 0.75),
      heightMm: Math.round(CANVAS_TEMPLATES.M.heightMm * 0.75),
    }
  },
}

export const CANVAS_LIMITS = {
  minMm:  20,
  maxMm: 800,
}
