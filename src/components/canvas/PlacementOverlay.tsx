import { useDesignStore } from '../../store/useDesignStore'

const HIT_RADIUS_MM = 8    // 掴みやすさ優先の当たり判定（見た目より大きい）
const VISIBLE_RADIUS_MM = 4 // 見た目の円の大きさ

type Props = {
  onRadialCenterPointerDown: (e: React.PointerEvent) => void
  onMirrorOriginPointerDown: (e: React.PointerEvent) => void
}

/**
 * キャンバス内 SVG に重ねる仮配置ツール用オーバーレイ
 * - 鏡像軸の線とドラッグハンドル
 * - 放射対称の中心ポインターとドラッグハンドル
 *
 * ドラッグそのものは CanvasRoot 側の pointer capture に統合されている
 * （回転ハンドルと同じ方式）。ここでは pointerDown を親へ委譲するだけ。
 */
export function PlacementOverlay({ onRadialCenterPointerDown, onMirrorOriginPointerDown }: Props) {
  const {
    activeTool,
    mirrorAxis, mirrorOriginMm,
    radialCenterMm,
    canvasWidthMm, canvasHeightMm,
  } = useDesignStore()

  if (activeTool !== 'mirror' && activeTool !== 'radial') return null

  // ── 鏡像軸 ────────────────────────────────────────────────────────────────
  const MirrorAxisLine = () => {
    const { x: ox, y: oy } = mirrorOriginMm
    let x1: number, y1: number, x2: number, y2: number
    const pad = Math.max(canvasWidthMm, canvasHeightMm)

    switch (mirrorAxis) {
      case 'horizontal':
        x1 = -pad; y1 = oy; x2 = canvasWidthMm + pad; y2 = oy; break
      case 'vertical':
        x1 = ox; y1 = -pad; x2 = ox; y2 = canvasHeightMm + pad; break
      case 'diagonal-fwd':  // /
        x1 = ox - pad; y1 = oy + pad; x2 = ox + pad; y2 = oy - pad; break
      case 'diagonal-bwd':  // \
        x1 = ox - pad; y1 = oy - pad; x2 = ox + pad; y2 = oy + pad; break
    }

    return (
      <g>
        <line x1={x1!} y1={y1!} x2={x2!} y2={y2!}
          stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3,2"
          vectorEffect="non-scaling-stroke" pointerEvents="none" />
        {/* 当たり判定（見た目より大きい透明円） */}
        <circle cx={ox} cy={oy} r={HIT_RADIUS_MM}
          fill="transparent"
          vectorEffect="non-scaling-stroke"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onPointerDown={onMirrorOriginPointerDown}
        />
        {/* 見た目のドラッグハンドル */}
        <circle cx={ox} cy={oy} r={VISIBLE_RADIUS_MM}
          fill="#3b82f6" fillOpacity={0.9} stroke="white" strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      </g>
    )
  }

  // ── 放射中心 ─────────────────────────────────────────────────────────────
  const RadialCenter = () => {
    const { x: cx, y: cy } = radialCenterMm

    return (
      <g>
        {/* 十字 */}
        <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy}
          stroke="#3b82f6" strokeWidth={0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5}
          stroke="#3b82f6" strokeWidth={0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        {/* 当たり判定（見た目より大きい透明円） */}
        <circle cx={cx} cy={cy} r={HIT_RADIUS_MM}
          fill="transparent"
          vectorEffect="non-scaling-stroke"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onPointerDown={onRadialCenterPointerDown}
        />
        {/* 見た目のドラッグハンドル */}
        <circle cx={cx} cy={cy} r={VISIBLE_RADIUS_MM}
          fill="#3b82f6" fillOpacity={0.85} stroke="white" strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      </g>
    )
  }

  return (
    <>
      {activeTool === 'mirror' && <MirrorAxisLine />}
      {activeTool === 'radial' && <RadialCenter />}
    </>
  )
}
