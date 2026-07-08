const HANDLE_OFFSET_MM = 6    // ハンドルをバウンディングボックス上端から離す距離
const HANDLE_RADIUS_MM = 3    // タップしやすいサイズ

type Props = {
  centerXMm: number  // ハンドルの X 中心（mm）
  topYMm: number     // 選択範囲の上端 Y（mm）
  onRotateHandlePointerDown: (e: React.PointerEvent) => void
}

export function SelectionOverlay({ centerXMm, topYMm, onRotateHandlePointerDown }: Props) {
  const handleX = centerXMm
  const handleY = topYMm - HANDLE_OFFSET_MM

  return (
    <g pointerEvents="none">
      {/* ハンドルと上端を結ぶ線 */}
      <line
        x1={centerXMm} y1={topYMm}
        x2={handleX} y2={handleY}
        stroke="#2563eb"
        strokeWidth={0.3}
        strokeDasharray="1,0.8"
        vectorEffect="non-scaling-stroke"
      />
      {/* 回転ハンドル */}
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

