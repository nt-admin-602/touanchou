// 目地幅（spec §8.1）
export const DEFAULT_GROUT_GAP_MM = 2

// 新規作成時のキャンバスサイズ（spec §6）
// キャンバスサイズは指定せず、実質無制限の作業スペースとして扱う。
// 配置範囲の境界チェック用の内部値としてのみ使う（描画・エクスポート範囲には使わない）。
export const UNLIMITED_CANVAS_MM = 2000
