import type { GlassItem } from '../../types'
import { getColor } from '../../config/colors'
import { getShapeVertices, rotateVertices, verticesToPoints } from '../../utils/geometry'

type Props = {
  item: GlassItem
  isSelected: boolean
  isOverlapping?: boolean
  isPreview?: boolean        // 仮配置（半透明・点線枠）
  isPreviewError?: boolean   // 仮配置 + 重なりエラー（赤枠）
}

export function GlassPiece({ item, isSelected, isOverlapping, isPreview, isPreviewError }: Props) {
  const color = getColor(item.colorId)
  const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
  const points = verticesToPoints(verts)

  const isMirror = color.isMirror === true
  const baseOpacity = isPreview || isPreviewError ? 0.45 : (isMirror ? 1 : color.opacity)

  const strokeColor = isPreviewError ? '#ef4444'
    : isOverlapping ? '#ef4444'
    : isSelected ? '#2563eb'
    : '#00000030'
  const strokeWidth = (isPreviewError || isOverlapping || isSelected) ? 0.4 : 0.2

  return (
    <g
      transform={`translate(${item.xMm}, ${item.yMm})`}
      style={{ cursor: isPreview || isPreviewError ? 'default' : 'pointer' }}
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
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {/* 仮配置: 点線枠 */}
      {(isPreview || isPreviewError) && (
        <polygon
          points={points}
          fill="none"
          stroke={isPreviewError ? '#ef4444' : '#94a3b8'}
          strokeWidth={1.5}
          strokeDasharray="2,1.5"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {/* 選択枠 */}
      {isSelected && !isOverlapping && !isPreview && !isPreviewError && (
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
      {/* 重なりエラー枠 */}
      {isOverlapping && !isPreview && !isPreviewError && (
        <polygon
          points={points}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  )
}