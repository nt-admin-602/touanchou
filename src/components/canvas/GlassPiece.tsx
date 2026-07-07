import type { GlassItem } from '../../types'
import { getColor } from '../../config/colors'
import { getShapeVertices, rotateVertices, verticesToPoints } from '../../utils/geometry'

type Props = {
  item: GlassItem
  isSelected: boolean
}

export function GlassPiece({ item, isSelected }: Props) {
  const color = getColor(item.colorId)
  const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
  const points = verticesToPoints(verts)

  // 鏡ガラスのグラデーション定義
  const isMirror = color.isMirror === true

  return (
    <g
      transform={`translate(${item.xMm}, ${item.yMm})`}
      style={{ cursor: 'pointer' }}
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
        fillOpacity={isMirror ? 1 : color.opacity}
        stroke={isSelected ? '#2563eb' : '#00000030'}
        strokeWidth={isSelected ? 0.4 : 0.2}
        vectorEffect="non-scaling-stroke"
      />
      {isSelected && (
        <polygon
          points={points}
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
