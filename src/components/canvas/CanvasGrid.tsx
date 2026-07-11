type Props = {
  widthMm: number
  heightMm: number
  zoom: number  // px/mm — グリッド密度判定のため
  // 現在画面に表示されている範囲（mm、キャンバス境界内にクランプ済み）。
  // キャンバス全体ではなくこの範囲だけ線を引く（大きなキャンバスでの描画負荷対策）。
  visibleMinX: number
  visibleMaxX: number
  visibleMinY: number
  visibleMaxY: number
}

export function CanvasGrid({
  widthMm, heightMm, zoom,
  visibleMinX, visibleMaxX, visibleMinY, visibleMaxY,
}: Props) {
  // ズームが低い場合は細かいグリッドを省略（spec §5.2）
  const showFineGrid = zoom >= 2.5
  const majorInterval = zoom < 1.5 ? 10 : 5

  const lines: React.ReactNode[] = []

  const xStart = Math.max(0, Math.floor(visibleMinX))
  const xEnd = Math.min(widthMm, Math.ceil(visibleMaxX))
  const yStart = Math.max(0, Math.floor(visibleMinY))
  const yEnd = Math.min(heightMm, Math.ceil(visibleMaxY))

  // 細グリッド（1mm）
  if (showFineGrid) {
    for (let x = xStart; x <= xEnd; x++) {
      lines.push(
        <line
          key={`vf${x}`}
          x1={x} y1={yStart} x2={x} y2={yEnd}
          stroke="#d1d5db"
          strokeWidth={0.08}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    for (let y = yStart; y <= yEnd; y++) {
      lines.push(
        <line
          key={`hf${y}`}
          x1={xStart} y1={y} x2={xEnd} y2={y}
          stroke="#d1d5db"
          strokeWidth={0.08}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
  }

  // 太グリッド（5mm or 10mm）
  const xMajorStart = Math.ceil(xStart / majorInterval) * majorInterval
  const yMajorStart = Math.ceil(yStart / majorInterval) * majorInterval
  for (let x = xMajorStart; x <= xEnd; x += majorInterval) {
    lines.push(
      <line
        key={`vm${x}`}
        x1={x} y1={yStart} x2={x} y2={yEnd}
        stroke="#9ca3af"
        strokeWidth={showFineGrid ? 0.15 : 0.1}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  for (let y = yMajorStart; y <= yEnd; y += majorInterval) {
    lines.push(
      <line
        key={`hm${y}`}
        x1={xStart} y1={y} x2={xEnd} y2={y}
        stroke="#9ca3af"
        strokeWidth={showFineGrid ? 0.15 : 0.1}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  // キャンバス境界線（見えている範囲のみ意味を持つため常に描画してよい: 1要素のみで軽い）
  lines.push(
    <rect
      key="border"
      x={0} y={0}
      width={widthMm} height={heightMm}
      fill="none"
      stroke="#6b7280"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
    />
  )

  return <g pointerEvents="none">{lines}</g>
}
