import type { ShapeType } from '../types'

// ひし形の一辺（mm単位、整数）。
// 60°/120°のロゼンジ型: 短対角線は辺長と一致し、短対角線で半分に切ると正三角形になる。
// 6枚で星型にぴったり閉じる。
const DIAMOND_SIDE_MM = 12

// 三角形の一辺（mm単位、整数）。ひし形より2mm大きくする。
const TRIANGLE_SIDE_MM = DIAMOND_SIDE_MM + 2

// 形状設定（spec §7.6）
export const SHAPE_CONFIG = {
  diamond: {
    type: 'rhombus' as const,
    sideLengthMm: DIAMOND_SIDE_MM,
    shortDiagonalMm: DIAMOND_SIDE_MM,                    // 縦置き時の横方向（= 辺長）
    longDiagonalMm: DIAMOND_SIDE_MM * Math.sqrt(3),      // 縦置き時の縦方向
  },
  triangle: {
    type: 'equilateralTriangle' as const,
    sideLengthMm: TRIANGLE_SIDE_MM,
  },
  square: {
    type: 'square' as const,
    sideLengthMm: 10,
  },
} satisfies Record<ShapeType, unknown>

// 初期回転（spec §11.1）
export const SHAPE_INITIAL_ROTATION: Record<ShapeType, number> = {
  diamond:  0,   // 縦長
  triangle: 0,   // 頂点が上
  square:   0,   // 傾きなし
}

export const SHAPE_LABELS: Record<ShapeType, string> = {
  diamond:  'ひし形',
  triangle: '三角形',
  square:   '正方形',
}
