import type { ShapeType } from '../types'
import { SHAPE_CONFIG } from '../config/shapes'

/** 各形状の頂点（中心=原点、回転なし、mm単位）*/
export function getShapeVertices(shape: ShapeType): Array<{ x: number; y: number }> {
  switch (shape) {
    case 'diamond': {
      const { sideLengthMm, acuteAngleDeg } = SHAPE_CONFIG.diamond
      const halfAngleRad = (acuteAngleDeg / 2) * (Math.PI / 180)
      const halfW = sideLengthMm * Math.cos(halfAngleRad) // 横半幅
      const halfH = sideLengthMm * Math.sin(halfAngleRad) // 縦半幅
      return [
        { x: 0,      y: -halfH }, // 上
        { x: halfW,  y: 0      }, // 右
        { x: 0,      y: halfH  }, // 下
        { x: -halfW, y: 0      }, // 左
      ]
    }
    case 'triangle': {
      const s = SHAPE_CONFIG.triangle.sideLengthMm
      const h = (Math.sqrt(3) / 2) * s  // 正三角形の高さ
      return [
        { x: 0,        y: -(h * 2) / 3 }, // 頂点（上）重心基準
        { x:  s / 2,   y:  h / 3       }, // 右下
        { x: -s / 2,   y:  h / 3       }, // 左下
      ]
    }
    case 'square': {
      const half = SHAPE_CONFIG.square.sideLengthMm / 2
      return [
        { x: -half, y: -half },
        { x:  half, y: -half },
        { x:  half, y:  half },
        { x: -half, y:  half },
      ]
    }
  }
}

/** 頂点リストをSVG polygon の points 文字列に変換 */
export function verticesToPoints(vertices: Array<{ x: number; y: number }>): string {
  return vertices.map(v => `${v.x},${v.y}`).join(' ')
}

/** 回転を適用した頂点リストを返す（中心=原点） */
export function rotateVertices(
  vertices: Array<{ x: number; y: number }>,
  angleDeg: number,
): Array<{ x: number; y: number }> {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return vertices.map(v => ({
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  }))
}

/** 形状のバウンディングボックス（中心=原点, mm単位、回転後）*/
export function getShapeBounds(shape: ShapeType, rotationDeg: number) {
  const verts = rotateVertices(getShapeVertices(shape), rotationDeg)
  const xs = verts.map(v => v.x)
  const ys = verts.map(v => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

/** 点が凸多角形の内側かどうか（符号付き面積法）*/
export function pointInPolygon(
  px: number,
  py: number,
  vertices: Array<{ x: number; y: number }>,
): boolean {
  const n = vertices.length
  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y
    const xj = vertices[j].x, yj = vertices[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
