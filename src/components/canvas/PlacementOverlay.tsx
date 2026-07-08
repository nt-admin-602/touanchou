import { useRef } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { screenToMm } from '../../utils/coordinates'

/**
 * キャンバス内 SVG に重ねる仮配置ツール用オーバーレイ
 * - 鏡像軸の線とドラッグハンドル
 * - 放射対称の中心ポインターとドラッグハンドル
 */
export function PlacementOverlay() {
  const {
    activeTool,
    mirrorAxis, mirrorOriginMm, setMirrorOriginMm,
    radialCenterMm, setRadialCenterMm,
    canvasWidthMm, canvasHeightMm, viewport,
  } = useDesignStore()

  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null)

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

    const onHandleDown = (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: mirrorOriginMm.x, startOy: mirrorOriginMm.y }
    }
    const onHandleMove = (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const startMm = screenToMm(dragRef.current.startX, dragRef.current.startY, viewport)
      const currMm = screenToMm(e.clientX, e.clientY, viewport)
      setMirrorOriginMm(
        dragRef.current.startOx + (currMm.x - startMm.x),
        dragRef.current.startOy + (currMm.y - startMm.y),
      )
    }
    const onHandleUp = () => { dragRef.current = null }

    return (
      <g>
        <line x1={x1!} y1={y1!} x2={x2!} y2={y2!}
          stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3,2"
          vectorEffect="non-scaling-stroke" pointerEvents="none" />
        {/* ドラッグハンドル */}
        <circle cx={ox} cy={oy} r={4}
          fill="#3b82f6" fillOpacity={0.9} stroke="white" strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: 'move', pointerEvents: 'all' }}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
        />
      </g>
    )
  }

  // ── 放射中心 ─────────────────────────────────────────────────────────────
  const RadialCenter = () => {
    const { x: cx, y: cy } = radialCenterMm

    const onDown = (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId)
      dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: cx, startOy: cy }
    }
    const onMove = (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const startMm = screenToMm(dragRef.current.startX, dragRef.current.startY, viewport)
      const currMm = screenToMm(e.clientX, e.clientY, viewport)
      setRadialCenterMm(
        dragRef.current.startOx + (currMm.x - startMm.x),
        dragRef.current.startOy + (currMm.y - startMm.y),
      )
    }
    const onUp = () => { dragRef.current = null }

    return (
      <g>
        {/* 十字 */}
        <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy}
          stroke="#3b82f6" strokeWidth={0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5}
          stroke="#3b82f6" strokeWidth={0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        <circle cx={cx} cy={cy} r={4}
          fill="#3b82f6" fillOpacity={0.85} stroke="white" strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: 'move', pointerEvents: 'all' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
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
