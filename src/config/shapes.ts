import type { ShapeType } from '../types'

// 形状設定（spec §7.6）— 仮値。後からコード上で調整可能
export const SHAPE_CONFIG = {
  diamond: {
    type: 'rhombus' as const,
    sideLengthMm: 10,   // 仮値
    acuteAngleDeg: 60,
  },
  triangle: {
    type: 'equilateralTriangle' as const,
    sideLengthMm: 10,   // diamond と共通想定。仮値
  },
  square: {
    type: 'square' as const,
    sideLengthMm: 7,
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
