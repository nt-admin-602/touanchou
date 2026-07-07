type Props = {
  widthMm: number
  heightMm: number
  zoom: number  // px/mm — グリッド密度判定のため
}

export function CanvasGrid({ widthMm, heightMm, zoom }: Props) {
  // ズームが低い場合は細かいグリッドを省略（spec §5.2）
  const showFineGrid = zoom >= 2.5
  const majorInterval = zoom < 1.5 ? 10 : 5

  const lines: React.ReactNode[] = []

  // 細グリッド（1mm）
  if (showFineGrid) {
    for (let x = 0; x <= widthMm; x++) {
      lines.push(
        <line
          key={`vf${x}`}
          x1={x} y1={0} x2={x} y2={heightMm}
          stroke="#d1d5db"
          strokeWidth={0.08}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    for (let y = 0; y <= heightMm; y++) {
      lines.push(
        <line
          key={`hf${y}`}
          x1={0} y1={y} x2={widthMm} y2={y}
          stroke="#d1d5db"
          strokeWidth={0.08}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
  }

  // 太グリッド（5mm or 10mm）
  for (let x = 0; x <= widthMm; x += majorInterval) {
    lines.push(
      <line
        key={`vm${x}`}
        x1={x} y1={0} x2={x} y2={heightMm}
        stroke="#9ca3af"
        strokeWidth={showFineGrid ? 0.15 : 0.1}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  for (let y = 0; y <= heightMm; y += majorInterval) {
    lines.push(
      <line
        key={`hm${y}`}
        x1={0} y1={y} x2={widthMm} y2={y}
        stroke="#9ca3af"
        strokeWidth={showFineGrid ? 0.15 : 0.1}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  // キャンバス境界線
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
