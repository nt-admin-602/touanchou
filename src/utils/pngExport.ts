import type { GlassItem } from '../types'
import { getShapeVertices, rotateVertices, verticesToPoints } from './geometry'
import { getColor } from '../config/colors'

const TARGET_MAX_PX = 1800
const MIN_PX_PER_MM = 2
const MAX_PX_PER_MM = 8

/** 背景透過・グリッドなしの図案 SVG 文字列を組み立てる（spec §21.2） */
function buildExportSvgString(items: GlassItem[], widthMm: number, heightMm: number): string {
  const glassContent = items.map(item => {
    const color = getColor(item.colorId)
    const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
    const points = verticesToPoints(verts)
    const isMirror = color.isMirror === true
    const fillOpacity = isMirror ? 1 : color.opacity

    if (isMirror) {
      const gradId = `mirror-${item.id}`
      return `<g transform="translate(${item.xMm},${item.yMm})">` +
        `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="#e8f0f8" stop-opacity="0.95"/>` +
        `<stop offset="40%" stop-color="#c0d8f0" stop-opacity="0.80"/>` +
        `<stop offset="70%" stop-color="#f0f8ff" stop-opacity="0.90"/>` +
        `<stop offset="100%" stop-color="#a8c8e8" stop-opacity="0.75"/>` +
        `</linearGradient></defs>` +
        `<polygon points="${points}" fill="url(#${gradId})" fill-opacity="${fillOpacity}" stroke="#00000030" stroke-width="0.2"/>` +
        `</g>`
    }
    return `<g transform="translate(${item.xMm},${item.yMm})">` +
      `<polygon points="${points}" fill="${color.fill}" fill-opacity="${fillOpacity}" stroke="#00000030" stroke-width="0.2"/>` +
      `</g>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}" height="${heightMm}">${glassContent}</svg>`
}

/** 図案を透過PNGのDataURLに変換する（spec §21） */
export async function renderDesignPNG(items: GlassItem[], widthMm: number, heightMm: number): Promise<string> {
  const pxPerMm = Math.max(MIN_PX_PER_MM, Math.min(MAX_PX_PER_MM, TARGET_MAX_PX / Math.max(widthMm, heightMm)))
  const pxWidth = Math.round(widthMm * pxPerMm)
  const pxHeight = Math.round(heightMm * pxPerMm)

  const svgStr = buildExportSvgString(items, widthMm, heightMm)

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
export async function downloadDesignPNG(items: GlassItem[], widthMm: number, heightMm: number, name: string): Promise<void> {
  const dataUrl = await renderDesignPNG(items, widthMm, heightMm)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${name}.png`
  a.click()
}
