import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { CanvasGrid } from './CanvasGrid'
import { GlassPiece } from './GlassPiece'
import { SelectionOverlay } from './SelectionOverlay'
import { PlacementOverlay } from './PlacementOverlay'
import { screenToMm } from '../../utils/coordinates'
import { applyPinchZoom } from '../../utils/coordinates'
import {
  getShapeVertices, rotateVertices, pointInPolygon, getShapeBounds,
} from '../../utils/geometry'
import type { GlassItem } from '../../types'

const DRAG_THRESHOLD_PX = 6

type PointerInfo = { x: number; y: number; startX: number; startY: number }
type DragMode = 'idle' | 'drag-glass' | 'drag-group' | 'rotate-glass' | 'rotate-group' | 'viewport'

export function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    canvasWidthMm, canvasHeightMm,
    items, selectedIds, multiSelectMode, overlappingIds,
    previewItems, previewOverlapIds, activeTool,
    viewport, setViewport, initViewport,
    placeGlass, selectGlass, toggleSelectGlass, clearSelection,
    moveGlass, batchMoveGlasses, rotateGlass, batchRotateGlasses,
    pushUndo, revertItems,
    moveDuplicateOffset, duplicateOffsetMm,
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
    mode: DragMode
    // 単体移動
    glassId: string
    startGlassX: number
    startGlassY: number
    // 単体回転
    startAngleDeg: number
    startRotationDeg: number
    // グループ移動
    startPositions: Map<string, { xMm: number; yMm: number }>
    // グループ回転
    rotationCenterX: number
    rotationCenterY: number
    startRotations: Map<string, number>
    // revert 用スナップショット
    preDragItems: GlassItem[]
    // PointerDown 時のガラス先取り検出（ドラッグ閾値を下げる）
    pendingGlassId: string | null
    // 複製ドラッグ
    dupStartOffsetX: number
    dupStartOffsetY: number
    // ピンチ状態
    prevPinchDist: number
    prevPinchMidX: number
    prevPinchMidY: number
    isDragging: boolean
  }>({
    mode: 'idle', glassId: '', startGlassX: 0, startGlassY: 0,
    startAngleDeg: 0, startRotationDeg: 0,
    startPositions: new Map(),
    rotationCenterX: 0, rotationCenterY: 0, startRotations: new Map(),
    preDragItems: [],
    prevPinchDist: 0, prevPinchMidX: 0, prevPinchMidY: 0,
    isDragging: false,
    pendingGlassId: null as string | null,
    // 複製ドラッグ用
    dupStartOffsetX: 0,
    dupStartOffsetY: 0,
  })

  /** スクリーン座標でヒットテスト（選択中を最前面で判定） */
  const hitTest = useCallback((sx: number, sy: number): string | null => {
    const mm = screenToMm(sx, sy, viewport)
    const selectedSet = new Set(selectedIds)
    const ordered = [
      ...items.filter(i => !selectedSet.has(i.id)),
      ...items.filter(i => selectedSet.has(i.id)),
    ]
    for (let i = ordered.length - 1; i >= 0; i--) {
      const item = ordered[i]
      const local = { x: mm.x - item.xMm, y: mm.y - item.yMm }
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      if (pointInPolygon(local.x, local.y, verts)) return item.id
    }
    return null
  }, [items, viewport, selectedIds])

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
      if (activeTool === 'duplicate') {
        // 複製モード: ドラッグ開始時のオフセットを記録
        dragState.current.dupStartOffsetX = duplicateOffsetMm.x
        dragState.current.dupStartOffsetY = duplicateOffsetMm.y
        dragState.current.pendingGlassId = 'duplicate'  // 常にドラッグ開始できる
      } else {
        dragState.current.pendingGlassId = hitTest(e.clientX, e.clientY)
      }
    }
    if (count === 2) {
      dragState.current.mode = 'viewport'
      dragState.current.isDragging = false
      dragState.current.pendingGlassId = null
      const pts = [...pointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      dragState.current.prevPinchDist = Math.hypot(dx, dy)
      dragState.current.prevPinchMidX = (pts[0].x + pts[1].x) / 2
      dragState.current.prevPinchMidY = (pts[0].y + pts[1].y) / 2
    }
  }, [hitTest, activeTool, duplicateOffsetMm])

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

    // 複製ドラッグモード
    if (activeTool === 'duplicate') {
      if (Math.hypot(dx, dy) > 2) {
        const startMm = screenToMm(info.startX, info.startY, viewport)
        const currMm  = screenToMm(e.clientX, e.clientY, viewport)
        moveDuplicateOffset(
          ds.dupStartOffsetX + (currMm.x - startMm.x),
          ds.dupStartOffsetY + (currMm.y - startMm.y),
        )
      }
      return
    }

    if (!ds.isDragging) {
      // ガラスを先取り検出済みなら閾値を下げる（2px）
      const threshold = ds.pendingGlassId ? 2 : DRAG_THRESHOLD_PX
      if (Math.hypot(dx, dy) > threshold) {
        ds.isDragging = true
        const isRotating = ds.mode === 'rotate-glass' || ds.mode === 'rotate-group'
        if (!isRotating) {
          const hitId = ds.pendingGlassId ?? hitTest(info.startX, info.startY)
          if (hitId) {
            ds.preDragItems = [...items]
            if (selectedIds.includes(hitId) && selectedIds.length > 1) {
              // グループドラッグ
              ds.mode = 'drag-group'
              ds.startPositions = new Map(
                items
                  .filter(item => selectedIds.includes(item.id))
                  .map(item => [item.id, { xMm: item.xMm, yMm: item.yMm }])
              )
            } else {
              // 単体ドラッグ
              const item = items.find(i => i.id === hitId)!
              ds.mode = 'drag-glass'
              ds.glassId = hitId
              ds.startGlassX = item.xMm
              ds.startGlassY = item.yMm
              if (!selectedIds.includes(hitId)) {
                selectGlass(hitId)
              }
            }
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
      if (ds.mode === 'drag-group') {
        const startMm = screenToMm(info.startX, info.startY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        const dxMm = currMm.x - startMm.x
        const dyMm = currMm.y - startMm.y
        const updates = [...ds.startPositions.entries()].map(([id, pos]) => ({
          id,
          xMm: pos.xMm + dxMm,
          yMm: pos.yMm + dyMm,
        }))
        batchMoveGlasses(updates)
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
      if (ds.mode === 'rotate-group') {
        const centerScreen = {
          x: ds.rotationCenterX * viewport.zoom + viewport.panX,
          y: ds.rotationCenterY * viewport.zoom + viewport.panY,
        }
        const angle = Math.atan2(
          e.clientY - centerScreen.y,
          e.clientX - centerScreen.x,
        ) * (180 / Math.PI)
        const delta = angle - ds.startAngleDeg
        const updates = [...ds.startRotations.entries()].map(([id, startRot]) => ({
          id,
          rotationDeg: startRot + delta,
        }))
        batchRotateGlasses(updates)
      }
    }
  }, [viewport, setViewport, hitTest, items, selectedIds, selectGlass, moveGlass, batchMoveGlasses, rotateGlass, batchRotateGlasses, activeTool, moveDuplicateOffset])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)

    const ds = dragState.current

    // 仮配置モード中はタップ判定・配置をスキップ
    const inPlacementMode = activeTool !== 'none'

    if (ds.isDragging) {
      const isDragOrRotate =
        ds.mode === 'drag-glass' || ds.mode === 'drag-group' ||
        ds.mode === 'rotate-glass' || ds.mode === 'rotate-group'
      if (isDragOrRotate && !inPlacementMode) {
        pushUndo(ds.preDragItems)
      }
    } else if (info && !inPlacementMode) {
      // タップ判定
      const hitId = hitTest(info.startX, info.startY)
      if (hitId) {
        if (multiSelectMode) {
          toggleSelectGlass(hitId)
        } else {
          const isSoleSelected = selectedIds.length === 1 && selectedIds[0] === hitId
          selectGlass(isSoleSelected ? null : hitId)
        }
      } else {
        if (selectedIds.length > 0) {
          clearSelection()
        } else {
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
  }, [hitTest, selectedIds, multiSelectMode, selectGlass, toggleSelectGlass, clearSelection, viewport, placeGlass, revertItems, pushUndo, activeTool])

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    dragState.current.mode = 'idle'
    dragState.current.isDragging = false
  }, [])

  /** 回転ハンドルの pointerDown（centerXMm/centerYMm は回転中心・角度計算に使用） */
  const onRotateHandlePointerDown = useCallback((
    e: React.PointerEvent,
    centerXMm: number,
    centerYMm: number,
  ) => {
    e.stopPropagation()
    const centerScreen = {
      x: centerXMm * viewport.zoom + viewport.panX,
      y: centerYMm * viewport.zoom + viewport.panY,
    }
    const startAngle = Math.atan2(
      e.clientY - centerScreen.y,
      e.clientX - centerScreen.x,
    ) * (180 / Math.PI)

    dragState.current.preDragItems = [...items]
    dragState.current.startAngleDeg = startAngle
    dragState.current.isDragging = true

    if (selectedIds.length === 1) {
      const item = items.find(i => i.id === selectedIds[0])
      if (!item) return
      dragState.current.mode = 'rotate-glass'
      dragState.current.glassId = selectedIds[0]
      dragState.current.startRotationDeg = item.rotationDeg
    } else {
      dragState.current.mode = 'rotate-group'
      dragState.current.rotationCenterX = centerXMm
      dragState.current.rotationCenterY = centerYMm
      dragState.current.startRotations = new Map(
        selectedIds.map(id => {
          const item = items.find(i => i.id === id)
          return [id, item?.rotationDeg ?? 0]
        })
      )
    }

    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })
  }, [items, viewport, selectedIds])

  // 選択ガラスを最前面に並び替えて描画
  const overlappingSet = useMemo(() => new Set(overlappingIds), [overlappingIds])
  const previewOverlapSet = useMemo(() => new Set(previewOverlapIds), [previewOverlapIds])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const sortedItems = useMemo(() => [
    ...items.filter(i => !selectedSet.has(i.id)),
    ...items.filter(i => selectedSet.has(i.id)),
  ], [items, selectedSet])

  // SelectionOverlay 用パラメータ
  const selectionOverlayProps = useMemo(() => {
    if (selectedIds.length === 0) return null
    if (selectedIds.length === 1) {
      const item = items.find(i => i.id === selectedIds[0])
      if (!item) return null
      const bounds = getShapeBounds(item.shape, item.rotationDeg)
      return {
        centerXMm: item.xMm,
        topYMm: item.yMm + bounds.minY,
        rotCenterX: item.xMm,
        rotCenterY: item.yMm,
      }
    }
    // 複数選択: グループバウンディングボックス
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id)
      if (!item) continue
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      for (const v of verts) {
        const wx = v.x + item.xMm, wy = v.y + item.yMm
        if (wx < minX) minX = wx
        if (wx > maxX) maxX = wx
        if (wy < minY) minY = wy
        if (wy > maxY) maxY = wy
      }
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    return { centerXMm: cx, topYMm: minY, rotCenterX: cx, rotCenterY: cy }
  }, [selectedIds, items])

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
              isSelected={selectedSet.has(item.id)}
              isOverlapping={overlappingSet.has(item.id)}
            />
          ))}

          {/* 仮配置アイテム */}
          {previewItems.map(item => (
            <GlassPiece
              key={item.id}
              item={item}
              isSelected={false}
              isPreview={!previewOverlapSet.has(item.id)}
              isPreviewError={previewOverlapSet.has(item.id)}
            />
          ))}

          {/* 鏡像軸・放射中心オーバーレイ */}
          <PlacementOverlay />

          {selectionOverlayProps && activeTool === 'none' && (
            <SelectionOverlay
              centerXMm={selectionOverlayProps.centerXMm}
              topYMm={selectionOverlayProps.topYMm}
              onRotateHandlePointerDown={(e) =>
                onRotateHandlePointerDown(
                  e,
                  selectionOverlayProps.rotCenterX,
                  selectionOverlayProps.rotCenterY,
                )
              }
            />
          )}
        </svg>
      </div>
    </div>
  )
}
