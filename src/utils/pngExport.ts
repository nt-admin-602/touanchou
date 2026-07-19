import type { GlassItem } from '../types'
import { getShapeVertices, rotateVertices, verticesToPoints, getItemsBoundsMm } from './geometry'
import { getColor } from '../config/colors'

const TARGET_MAX_PX = 1800
const MIN_PX_PER_MM = 2
const MAX_PX_PER_MM = 8
const EXPORT_PADDING_MM = 10
const FALLBACK_SIZE_MM = 20 // ガラス未配置時の書き出しサイズ

/** 背景透過・グリッドなしの図案 SVG 文字列を組み立てる（spec §21.2） */
function buildExportSvgString(
  items: GlassItem[],
  offsetXMm: number, offsetYMm: number,
  widthMm: number, heightMm: number,
): string {
  const glassContent = items.map(item => {
    const color = getColor(item.colorId)
    const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
    const points = verticesToPoints(verts)
    const isMirror = color.isMirror === true
    const fillOpacity = isMirror ? 1 : color.opacity
    const x = item.xMm - offsetXMm
    const y = item.yMm - offsetYMm

    if (isMirror) {
      const gradId = `mirror-${item.id}`
      return `<g transform="translate(${x},${y})">` +
        `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="#e8f0f8" stop-opacity="0.95"/>` +
        `<stop offset="40%" stop-color="#c0d8f0" stop-opacity="0.80"/>` +
        `<stop offset="70%" stop-color="#f0f8ff" stop-opacity="0.90"/>` +
        `<stop offset="100%" stop-color="#a8c8e8" stop-opacity="0.75"/>` +
        `</linearGradient></defs>` +
        `<polygon points="${points}" fill="url(#${gradId})" fill-opacity="${fillOpacity}"/>` +
        `</g>`
    }
    return `<g transform="translate(${x},${y})">` +
      `<polygon points="${points}" fill="${color.fill}" fill-opacity="${fillOpacity}"/>` +
      `</g>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}" height="${heightMm}">${glassContent}</svg>`
}

/** 配置済みガラスの外接矩形＋余白を出力範囲として返す */
function getExportRectMm(items: GlassItem[]) {
  const bounds = getItemsBoundsMm(items)
  if (!bounds) {
    return { offsetXMm: 0, offsetYMm: 0, widthMm: FALLBACK_SIZE_MM, heightMm: FALLBACK_SIZE_MM }
  }
  const offsetXMm = bounds.minX - EXPORT_PADDING_MM
  const offsetYMm = bounds.minY - EXPORT_PADDING_MM
  const widthMm = (bounds.maxX - bounds.minX) + EXPORT_PADDING_MM * 2
  const heightMm = (bounds.maxY - bounds.minY) + EXPORT_PADDING_MM * 2
  return { offsetXMm, offsetYMm, widthMm, heightMm }
}

/** 図案を透過PNGのDataURLに変換する（spec §21）。出力範囲は配置済みガラスの外接矩形＋余白 */
export async function renderDesignPNG(items: GlassItem[]): Promise<string> {
  const { offsetXMm, offsetYMm, widthMm, heightMm } = getExportRectMm(items)
  const pxPerMm = Math.max(MIN_PX_PER_MM, Math.min(MAX_PX_PER_MM, TARGET_MAX_PX / Math.max(widthMm, heightMm)))
  const pxWidth = Math.round(widthMm * pxPerMm)
  const pxHeight = Math.round(heightMm * pxPerMm)

  const svgStr = buildExportSvgString(items, offsetXMm, offsetYMm, widthMm, heightMm)

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pxWidth
      canvas.height = pxHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas context取得失敗')); return }
      ctx.drawImage(img, 0, 0, pxWidth, pxHeight)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG画像の読み込み失敗')) }
    img.src = url
  })
}

/** 図案をPNGファイルとしてダウンロードする */
export async function downloadDesignPNG(items: GlassItem[], name: string): Promise<void> {
  const dataUrl = await renderDesignPNG(items)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${name}.png`
  a.click()
}
