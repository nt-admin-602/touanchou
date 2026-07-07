import { useMemo } from 'react'
import type { GlassItem } from '../../types'
import { getShapeBounds } from '../../utils/geometry'

const HANDLE_OFFSET_MM = 6    // ハンドルをバウンディングボックス上端から離す距離
const HANDLE_RADIUS_MM = 3    // タップしやすいサイズ

type Props = {
  item: GlassItem
  onRotateHandlePointerDown: (e: React.PointerEvent) => void
}

export function SelectionOverlay({ item, onRotateHandlePointerDown }: Props) {
  const bounds = useMemo(
    () => getShapeBounds(item.shape, item.rotationDeg),
    [item.shape, item.rotationDeg]
  )

  const handleX = 0
  const handleY = bounds.minY - HANDLE_OFFSET_MM

  return (
    <g transform={`translate(${item.xMm}, ${item.yMm})`} pointerEvents="none">
      {/* ハンドルと中心を結ぶ線 */}
      <line
        x1={0} y1={bounds.minY}
        x2={handleX} y2={handleY}
        stroke="#2563eb"
        strokeWidth={0.3}
        strokeDasharray="1,0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 回転ハンドル（pointerEvents を有効にする）*/}
      <circle
        cx={handleX}
        cy={handleY}
        r={HANDLE_RADIUS_MM}
        fill="#2563eb"
        fillOpacity={0.9}
        stroke="white"
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: 'grab', pointerEvents: 'all' }}
        onPointerDown={onRotateHandlePointerDown}
      />
      {/* 回転アイコン（↻ 近似） */}
      <text
        x={handleX}
        y={handleY + 0.6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={3.5}
        fill="white"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        ↻
      </text>
    </g>
  )
}
