import type { GlassItem } from '../types'
import { getShapeVertices, rotateVertices, verticesToPoints } from './geometry'
import { getColor } from '../config/colors'

const THUMB_MAX_PX = 240

/** デザインのサムネイル PNG を base64 で返す */
export async function generateThumbnail(
  items: GlassItem[],
  widthMm: number,
  heightMm: number,
): Promise<string> {
  const aspect = widthMm / heightMm
  const tw = aspect >= 1 ? THUMB_MAX_PX : Math.round(THUMB_MAX_PX * aspect)
  const th = aspect >= 1 ? Math.round(THUMB_MAX_PX / aspect) : THUMB_MAX_PX

  const glassContent = items.map(item => {
    const color = getColor(item.colorId)
    const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
    const pts = verticesToPoints(verts)
    const fill = color.isMirror ? '#c8d8e8' : color.fill
    return `<g transform="translate(${item.xMm},${item.yMm})"><polygon points="${pts}" fill="${fill}" fill-opacity="${color.opacity}"/></g>`
  }).join('')

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${tw}" height="${th}"><rect width="${widthMm}" height="${heightMm}" fill="white"/>${glassContent}</svg>`

  return new Promise(resolve => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); resolve(''); return }
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, tw, th)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}
