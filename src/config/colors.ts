import type { GlassColor } from '../types'

// 24色パレット（spec §9.2）
export const GLASS_COLORS: GlassColor[] = [
  { id: 'transparent',      label: '透明',              fill: '#e8f4f8', opacity: 0.25 },
  { id: 'mirror',           label: '鏡',                fill: '#c8d8e8', opacity: 0.85, isMirror: true },
  { id: 'red',              label: '赤',                fill: '#e03030', opacity: 0.75 },
  { id: 'orange',           label: 'オレンジ',           fill: '#f07020', opacity: 0.80 },
  { id: 'yellow',           label: '黄色',              fill: '#f5d020', opacity: 0.80 },
  { id: 'yellow-semi',      label: '半透明黄色',         fill: '#f5e060', opacity: 0.50 },
  { id: 'yellow-green',     label: '黄緑',              fill: '#90c030', opacity: 0.80 },
  { id: 'emerald-semi',     label: '半透明エメラルドグリーン', fill: '#40c890', opacity: 0.50 },
  { id: 'turquoise',        label: 'ターコイズ',         fill: '#00b8b0', opacity: 0.80 },
  { id: 'light-blue',       label: '水色',              fill: '#60b8e8', opacity: 0.80 },
  { id: 'light-blue-semi',  label: '半透明水色',         fill: '#80d0f0', opacity: 0.50 },
  { id: 'sky-blue-semi',    label: '半透明スカイブルー', fill: '#a0e0ff', opacity: 0.45 },
  { id: 'blue',             label: '青',                fill: '#1848c8', opacity: 0.80 },
  { id: 'navy',             label: '紺',                fill: '#102070', opacity: 0.85 },
  { id: 'green',            label: '緑',                fill: '#208040', opacity: 0.80 },
  { id: 'beige',            label: 'ベージュ',           fill: '#d4b896', opacity: 0.80 },
  { id: 'brown',            label: '茶色',              fill: '#8b4a1a', opacity: 0.80 },
  { id: 'wine',             label: 'ワインレッド',       fill: '#8b1a3a', opacity: 0.80 },
  { id: 'purple',           label: '紫',                fill: '#8030c0', opacity: 0.80 },
  { id: 'lavender-semi',    label: '半透明ラベンダー',   fill: '#c080e0', opacity: 0.50 },
  { id: 'pink-semi',        label: '半透明ピンク',       fill: '#f090b0', opacity: 0.50 },
  { id: 'gray',             label: 'グレー',             fill: '#909090', opacity: 0.80 },
  { id: 'clear-black',      label: 'クリアブラック',     fill: '#404040', opacity: 0.60 },
  { id: 'black',            label: 'ブラック',           fill: '#181818', opacity: 0.90 },
]

export const DEFAULT_COLOR_ID = 'red'

export function getColor(id: string): GlassColor {
  return GLASS_COLORS.find(c => c.id === id) ?? GLASS_COLORS[0]
}
