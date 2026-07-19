import type { GlassItem } from '../../types'
import { getColor } from '../../config/colors'
import { getShapeVertices, rotateVertices, verticesToPoints } from '../../utils/geometry'

type Props = {
  item: GlassItem
  isSelected: boolean
  isPreview?: boolean        // 仮配置（半透明・点線枠）
}

// 選択枠を図形の内側に収める縮小率（隣接ガラスとぴったり接している場合に、
// 枠線が図形の外へはみ出して隣のガラスにかぶらないようにする）
const SELECTION_OUTLINE_SCALE = 0.85

export function GlassPiece({ item, isSelected, isPreview }: Props) {
  const color = getColor(item.colorId)
  const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
  const points = verticesToPoints(verts)

  const isMirror = color.isMirror === true
  const baseOpacity = isPreview ? 0.45 : (isMirror ? 1 : color.opacity)

  const selectionPoints = isSelected
    ? verticesToPoints(verts.map(v => ({ x: v.x * SELECTION_OUTLINE_SCALE, y: v.y * SELECTION_OUTLINE_SCALE })))
    : ''

  return (
    <g
      transform={`translate(${item.xMm}, ${item.yMm})`}
      style={{ cursor: isPreview ? 'default' : 'pointer' }}
    >
      {isMirror && (
        <defs>
          <linearGradient id={`mirror-${item.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#e8f0f8" stopOpacity="0.95" />
            <stop offset="40%"  stopColor="#c0d8f0" stopOpacity="0.80" />
            <stop offset="70%"  stopColor="#f0f8ff" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#a8c8e8" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      )}
      <polygon
        points={points}
        fill={isMirror ? `url(#mirror-${item.id})` : color.fill}
        fillOpacity={baseOpacity}
      />
      {/* 仮配置: 点線枠 */}
      {isPreview && (
        <polygon
          points={points}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="2,1.5"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {/* 選択枠（図形からはみ出さないよう内側に縮小して描画） */}
      {isSelected && !isPreview && (
        <polygon
          points={selectionPoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="2,1.5"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  )
}