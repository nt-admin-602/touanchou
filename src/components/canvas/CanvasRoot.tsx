import { useRef, useEffect, useCallback } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { CanvasGrid } from './CanvasGrid'
import { GlassPiece } from './GlassPiece'
import { SelectionOverlay } from './SelectionOverlay'
import { screenToMm } from '../../utils/coordinates'
import { applyPinchZoom } from '../../utils/coordinates'
import { getShapeVertices, rotateVertices, pointInPolygon } from '../../utils/geometry'

const DRAG_THRESHOLD_PX = 6

type PointerInfo = { x: number; y: number; startX: number; startY: number }

export function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    canvasWidthMm, canvasHeightMm,
    items, selectedId,
    viewport, setViewport, initViewport,
    placeGlass, selectGlass, moveGlass, rotateGlass,
  } = useDesignStore()

  // 初期ビューポート
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    initViewport(width, height)
  }, [initViewport, canvasWidthMm, canvasHeightMm])

  // ポインター追跡
  const pointers = useRef<Map<number, PointerInfo>>(new Map())
  // ドラッグ状態
  const dragState = useRef<{
    mode: 'idle' | 'drag-glass' | 'rotate-glass' | 'viewport'
    glassId: string
    startGlassX: number
    startGlassY: number
    startAngleDeg: number
    startRotationDeg: number
    prevPinchDist: number
    prevPinchMidX: number
    prevPinchMidY: number
    isDragging: boolean
  }>({
    mode: 'idle', glassId: '', startGlassX: 0, startGlassY: 0,
    startAngleDeg: 0, startRotationDeg: 0,
    prevPinchDist: 0, prevPinchMidX: 0, prevPinchMidY: 0,
    isDragging: false,
  })

  /** スクリーン座標でヒットテスト */
  const hitTest = useCallback((sx: number, sy: number): string | null => {
    const mm = screenToMm(sx, sy, viewport)
    // 上に積まれているものから探す（後のものが上）
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      const local = { x: mm.x - item.xMm, y: mm.y - item.yMm }
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      if (pointInPolygon(local.x, local.y, verts)) return item.id
    }
    return null
  }, [items, viewport])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })

    const count = pointers.current.size

    if (count === 1) {
      dragState.current.isDragging = false
      dragState.current.mode = 'idle'
    }
    if (count === 2) {
      // 2本指 → ビューポート操作へ移行
      dragState.current.mode = 'viewport'
      dragState.current.isDragging = false
      const pts = [...pointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      dragState.current.prevPinchDist = Math.hypot(dx, dy)
      dragState.current.prevPinchMidX = (pts[0].x + pts[1].x) / 2
      dragState.current.prevPinchMidY = (pts[0].y + pts[1].y) / 2
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointers.current.get(e.pointerId)
    if (!info) return
    info.x = e.clientX
    info.y = e.clientY

    const ds = dragState.current
    const count = pointers.current.size

    if (count >= 2) {
      // ピンチズーム + パン
      const pts = [...pointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy)
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2

      const scaleRatio = dist / ds.prevPinchDist
      const panDeltaX = midX - ds.prevPinchMidX
      const panDeltaY = midY - ds.prevPinchMidY

      const base = applyPinchZoom(viewport, scaleRatio, midX, midY)
      setViewport({ zoom: base.zoom, panX: base.panX + panDeltaX, panY: base.panY + panDeltaY })

      ds.prevPinchDist = dist
      ds.prevPinchMidX = midX
      ds.prevPinchMidY = midY
      return
    }

    // 1本指
    const dx = e.clientX - info.startX
    const dy = e.clientY - info.startY

    if (!ds.isDragging) {
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        ds.isDragging = true
        // ドラッグ対象を決定
        const hitId = hitTest(info.startX, info.startY)
        if (hitId) {
          if (ds.mode !== 'rotate-glass') {
            const item = items.find(i => i.id === hitId)!
            ds.mode = 'drag-glass'
            ds.glassId = hitId
            ds.startGlassX = item.xMm
            ds.startGlassY = item.yMm
            selectGlass(hitId)
          }
        }
      }
    }

    if (ds.isDragging) {
      if (ds.mode === 'drag-glass' && ds.glassId) {
        const startMm = screenToMm(info.startX, info.startY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        const newX = ds.startGlassX + (currMm.x - startMm.x)
        const newY = ds.startGlassY + (currMm.y - startMm.y)
        moveGlass(ds.glassId, newX, newY)
      }
      if (ds.mode === 'rotate-glass' && ds.glassId) {
        const item = items.find(i => i.id === ds.glassId)
        if (!item) return
        const centerScreen = {
          x: item.xMm * viewport.zoom + viewport.panX,
          y: item.yMm * viewport.zoom + viewport.panY,
        }
        const angle = Math.atan2(
          e.clientY - centerScreen.y,
          e.clientX - centerScreen.x,
        ) * (180 / Math.PI)
        const newRot = ds.startRotationDeg + (angle - ds.startAngleDeg)
        rotateGlass(ds.glassId, newRot)
      }
    }
  }, [viewport, setViewport, hitTest, items, selectGlass, moveGlass, rotateGlass])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)

    const ds = dragState.current

    if (!ds.isDragging && info) {
      // タップ判定
      const hitId = hitTest(info.startX, info.startY)
      if (hitId) {
        // 既に選択中なら選択解除、そうでなければ選択（spec §11.2）
        selectGlass(hitId === selectedId ? null : hitId)
      } else {
        if (selectedId) {
          // 空白タップ → 選択解除
          selectGlass(null)
        } else {
          // ガラス配置
          const mm = screenToMm(info.startX, info.startY, viewport)
          placeGlass(mm.x, mm.y)
        }
      }
    }

    ds.mode = 'idle'
    ds.isDragging = false
    ds.glassId = ''

    // 残りのポインターが2本になったらピンチ状態を再初期化
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      ds.prevPinchDist = Math.hypot(dx, dy)
      ds.prevPinchMidX = (pts[0].x + pts[1].x) / 2
      ds.prevPinchMidY = (pts[0].y + pts[1].y) / 2
    }
  }, [hitTest, selectedId, selectGlass, viewport, placeGlass])

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    dragState.current.mode = 'idle'
    dragState.current.isDragging = false
  }, [])

  /** 回転ハンドルの pointerDown ハンドラー（CanvasRoot に委譲） */
  const onRotateHandlePointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
    e.stopPropagation()
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const centerScreen = {
      x: item.xMm * viewport.zoom + viewport.panX,
      y: item.yMm * viewport.zoom + viewport.panY,
    }
    const startAngle = Math.atan2(
      e.clientY - centerScreen.y,
      e.clientX - centerScreen.x,
    ) * (180 / Math.PI)

    dragState.current.mode = 'rotate-glass'
    dragState.current.glassId = itemId
    dragState.current.startAngleDeg = startAngle
    dragState.current.startRotationDeg = item.rotationDeg
    dragState.current.isDragging = true

    // ポインターをコンテナにキャプチャ
    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })
  }, [items, viewport])

  // 選択ガラスを最前面に並び替えて描画
  const sortedItems = selectedId
    ? [...items.filter(i => i.id !== selectedId), ...items.filter(i => i.id === selectedId)]
    : items

  const { zoom, panX, panY } = viewport

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-100 relative"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={`0 0 ${canvasWidthMm} ${canvasHeightMm}`}
          width={canvasWidthMm}
          height={canvasHeightMm}
          style={{ overflow: 'visible', backgroundColor: 'white', display: 'block' }}
        >
          <CanvasGrid widthMm={canvasWidthMm} heightMm={canvasHeightMm} zoom={zoom} />

          {sortedItems.map(item => (
            <GlassPiece
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
            />
          ))}

          {selectedId && (() => {
            const item = items.find(i => i.id === selectedId)
            if (!item) return null
            return (
              <SelectionOverlay
                item={item}
                onRotateHandlePointerDown={(e) => onRotateHandlePointerDown(e, selectedId)}
              />
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
