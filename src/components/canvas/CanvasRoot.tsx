import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { CanvasGrid } from './CanvasGrid'
import { GlassPiece } from './GlassPiece'
import { SelectionOverlay } from './SelectionOverlay'
import { PlacementOverlay } from './PlacementOverlay'
import { screenToMm, snapDeg, snapMm } from '../../utils/coordinates'
import { applyPinchZoom } from '../../utils/coordinates'
import {
  getShapeVertices, rotateVertices, pointInPolygon, getShapeBounds,
  getItemWorldVertices, polygonsOverlap,
} from '../../utils/geometry'
import { PATTERN_DIRECTION_UNIT } from '../../utils/placement'
import { playTapSound, playStepSound } from '../../utils/sound'
import type { GlassItem } from '../../types'

const DRAG_THRESHOLD_PX = 6
const ROTATION_SNAP_DEG = 5 // coordinates.ts の snapDeg と同じ刻み（吸着音のタイミング用）

type PointerInfo = { x: number; y: number; startX: number; startY: number }
type DragMode =
  | 'idle' | 'drag-glass' | 'drag-group' | 'rotate-glass' | 'rotate-group'
  | 'viewport' | 'viewport-mouse' | 'range-select'
  | 'drag-radial-center' | 'drag-mirror-origin' | 'drag-pattern-gap'

export function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    canvasWidthMm, canvasHeightMm,
    items, selectedIds,
    previewItems, activeTool,
    pendingShape, pendingColorId, selectMode, snapEnabled,
    viewport, setViewport, initViewport,
    placeGlass, selectGlass, toggleSelectGlass, clearSelection, replaceSelection,
    moveGlass, batchMoveGlasses, rotateGlass, batchRotateGroup,
    pushUndo, revertItems,
    moveDuplicateOffset, duplicateOffsetMm,
    radialCenterMm, setRadialCenterMm, mirrorOriginMm, setMirrorOriginMm,
    patternDirection, patternGapMm, setPatternGapMm,
  } = useDesignStore()

  // 範囲選択ボックス（mm座標）
  const [rangeBox, setRangeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // 初期ビューポート
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    initViewport(width, height)
  }, [initViewport, canvasWidthMm, canvasHeightMm])

  // 最新 viewport を ref で追跡（ッールバック内で潜在的な古い値対策）
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  // ホイールズーム（非パッシブ登録で preventDefault を有効化）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const scaleRatio = Math.pow(0.998, e.deltaY)
      const vp = viewportRef.current
      setViewport(applyPinchZoom(vp, scaleRatio, e.clientX, e.clientY))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [setViewport])

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
    // マウスパン
    viewportStartPanX: number
    viewportStartPanY: number
    // 範囲選択（mm）
    rangeStartX: number
    rangeStartY: number
    // ピンチ状態
    prevPinchDist: number
    prevPinchMidX: number
    prevPinchMidY: number
    isDragging: boolean
    // 放射対称中心点・鏡像基準点ドラッグ（mm）
    centerDragStartX: number
    centerDragStartY: number
    centerDragStartOx: number
    centerDragStartOy: number
    // 連続配置マージンドラッグ
    patternGapDragStartX: number
    patternGapDragStartY: number
    patternGapDragStartGap: number
    // スナップ吸着音: 直近に鳴らした「何段階目か」（ドラッグ開始でリセット）
    lastSnapStepIndex: number | null
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
    // マウスパン用
    viewportStartPanX: 0,
    viewportStartPanY: 0,
    // 範囲選択用
    rangeStartX: 0,
    rangeStartY: 0,
    // 中心点/基準点ドラッグ用
    centerDragStartX: 0,
    centerDragStartY: 0,
    centerDragStartOx: 0,
    centerDragStartOy: 0,
    // 連続配置マージンドラッグ用
    patternGapDragStartX: 0,
    patternGapDragStartY: 0,
    patternGapDragStartGap: 0,
    lastSnapStepIndex: null,
  })

  /** value を step 単位で丸めた「何段階目か」が前回と変わっていたら吸着音を鳴らす */
  const tickSnapSound = useCallback((value: number, step: number) => {
    const idx = Math.round(value / step)
    if (dragState.current.lastSnapStepIndex !== idx) {
      dragState.current.lastSnapStepIndex = idx
      playStepSound()
    }
  }, [])

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
      if (e.button === 1 || e.button === 2) {
        // 中ボタン / 右ボタン → マウスパン
        dragState.current.mode = 'viewport-mouse'
        dragState.current.pendingGlassId = null
        dragState.current.viewportStartPanX = viewportRef.current.panX
        dragState.current.viewportStartPanY = viewportRef.current.panY
        dragState.current.isDragging = true
      } else {
        dragState.current.mode = 'idle'
        if (activeTool === 'duplicate') {
          dragState.current.dupStartOffsetX = duplicateOffsetMm.x
          dragState.current.dupStartOffsetY = duplicateOffsetMm.y
          dragState.current.pendingGlassId = 'duplicate'
        } else {
          dragState.current.pendingGlassId = hitTest(e.clientX, e.clientY)
        }
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

    // 1本指 / マウス
    const dx = e.clientX - info.startX
    const dy = e.clientY - info.startY

    // マウス右/中ボタンパン
    if (ds.mode === 'viewport-mouse') {
      setViewport({
        zoom: viewportRef.current.zoom,
        panX: ds.viewportStartPanX + (e.clientX - info.startX),
        panY: ds.viewportStartPanY + (e.clientY - info.startY),
      })
      return
    }

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
        ds.lastSnapStepIndex = null
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
          } else if (selectMode) {
            // selectMode でガラスなし → 範囲選択開始
            ds.mode = 'range-select'
            const startMm = screenToMm(info.startX, info.startY, viewport)
            ds.rangeStartX = startMm.x
            ds.rangeStartY = startMm.y
          }
        }
      }
    }

    if (ds.isDragging) {
      // 範囲選択: ボックスをリアルタイム更新
      if (ds.mode === 'range-select') {
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        setRangeBox({ x1: ds.rangeStartX, y1: ds.rangeStartY, x2: currMm.x, y2: currMm.y })
      }
      if (ds.mode === 'drag-glass' && ds.glassId) {
        const startMm = screenToMm(info.startX, info.startY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        const newX = ds.startGlassX + (currMm.x - startMm.x)
        const newY = ds.startGlassY + (currMm.y - startMm.y)
        moveGlass(ds.glassId, newX, newY)
        if (snapEnabled) tickSnapSound(Math.hypot(newX - ds.startGlassX, newY - ds.startGlassY), 1)
      }
      if (ds.mode === 'drag-group') {
        const startMm = screenToMm(info.startX, info.startY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        // snapEnabled が ON の場合のみデルタを1mm単位にスナップする。
        // 各アイテムを個別にスナップすると相対位置＝マージンが崩れるため、
        // 必ずデルタ側でスナップしてから全アイテムへ同じ量を加える。
        const dxMm = snapEnabled ? snapMm(currMm.x - startMm.x) : currMm.x - startMm.x
        const dyMm = snapEnabled ? snapMm(currMm.y - startMm.y) : currMm.y - startMm.y
        const updates = [...ds.startPositions.entries()].map(([id, pos]) => ({
          id,
          xMm: pos.xMm + dxMm,
          yMm: pos.yMm + dyMm,
        }))
        batchMoveGlasses(updates)
        if (snapEnabled) tickSnapSound(Math.hypot(dxMm, dyMm), 1)
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
        tickSnapSound(angle - ds.startAngleDeg, ROTATION_SNAP_DEG)
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
        // デルタを5度単位にスナップ（理由は drag-group と同様）。
        // 選択範囲の外接中心を軸に、位置・向きの両方を含めて選択全体を1つの
        // かたまりとして回転させる（各ガラスがその場で自転するのではない）。
        const delta = snapDeg(angle - ds.startAngleDeg)
        const rad = (delta * Math.PI) / 180
        const cos = Math.cos(rad), sin = Math.sin(rad)
        const updates = [...ds.startRotations.entries()].map(([id, startRot]) => {
          const pos = ds.startPositions.get(id)
          const dx = (pos?.xMm ?? ds.rotationCenterX) - ds.rotationCenterX
          const dy = (pos?.yMm ?? ds.rotationCenterY) - ds.rotationCenterY
          return {
            id,
            xMm: ds.rotationCenterX + dx * cos - dy * sin,
            yMm: ds.rotationCenterY + dx * sin + dy * cos,
            rotationDeg: startRot + delta,
          }
        })
        batchRotateGroup(updates)
        tickSnapSound(angle - ds.startAngleDeg, ROTATION_SNAP_DEG)
      }
      if (ds.mode === 'drag-radial-center' || ds.mode === 'drag-mirror-origin') {
        const startMm = screenToMm(ds.centerDragStartX, ds.centerDragStartY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        const newX = ds.centerDragStartOx + (currMm.x - startMm.x)
        const newY = ds.centerDragStartOy + (currMm.y - startMm.y)
        if (snapEnabled) tickSnapSound(Math.hypot(currMm.x - startMm.x, currMm.y - startMm.y), 1)
        if (ds.mode === 'drag-radial-center') {
          setRadialCenterMm(newX, newY)
        } else {
          setMirrorOriginMm(newX, newY)
        }
      }
      if (ds.mode === 'drag-pattern-gap') {
        const startMm = screenToMm(ds.patternGapDragStartX, ds.patternGapDragStartY, viewport)
        const currMm = screenToMm(e.clientX, e.clientY, viewport)
        const unit = PATTERN_DIRECTION_UNIT[patternDirection]
        // ドラッグ移動量を配置方向の単位ベクトルへ投影した分だけマージンを増減する
        const delta = (currMm.x - startMm.x) * unit.x + (currMm.y - startMm.y) * unit.y
        const newGap = ds.patternGapDragStartGap + delta
        setPatternGapMm(snapEnabled ? Math.round(newGap) : newGap)
        if (snapEnabled) tickSnapSound(delta, 1)
      }
    }
  }, [viewport, setViewport, hitTest, items, selectedIds, selectGlass, moveGlass, batchMoveGlasses, rotateGlass, batchRotateGroup, activeTool, moveDuplicateOffset, selectMode, setRadialCenterMm, setMirrorOriginMm, patternDirection, setPatternGapMm, snapEnabled, tickSnapSound])

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
      // 範囲選択確定
      if (ds.mode === 'range-select' && rangeBox) {
        const minXMm = Math.min(rangeBox.x1, rangeBox.x2)
        const maxXMm = Math.max(rangeBox.x1, rangeBox.x2)
        const minYMm = Math.min(rangeBox.y1, rangeBox.y2)
        const maxYMm = Math.max(rangeBox.y1, rangeBox.y2)
        const inside = items
          .filter(item => item.xMm >= minXMm && item.xMm <= maxXMm && item.yMm >= minYMm && item.yMm <= maxYMm)
          .map(item => item.id)
        replaceSelection(inside)
      }
      // 範囲選択ボックスをクリア
      setRangeBox(null)
    } else if (info && !inPlacementMode) {
      // タップ判定
      const hitId = hitTest(info.startX, info.startY)
      if (hitId) {
        playTapSound()
        if (selectMode) {
          toggleSelectGlass(hitId)
        } else {
          const isSoleSelected = selectedIds.length === 1 && selectedIds[0] === hitId
          selectGlass(isSoleSelected ? null : hitId)
        }
      } else {
        // 空白タップ
        if (selectedIds.length > 0) {
          clearSelection()
        } else if (!selectMode) {
          // 配置モード: 置こうとした位置が既存ガラスと重なる場合は選択に切替
          const mm = screenToMm(info.startX, info.startY, viewport)
          const snappedX = Math.round(mm.x), snappedY = Math.round(mm.y)
          if (items.length > 0) {
            const tempGlass = {
              id: '__tmp__', shape: pendingShape, colorId: pendingColorId,
              xMm: snappedX, yMm: snappedY, rotationDeg: 0,
            } as import('../../types').GlassItem
            const tempVerts = getItemWorldVertices(tempGlass)
            const overlapItem = items.find(item =>
              polygonsOverlap(tempVerts, getItemWorldVertices(item))
            )
            if (overlapItem) {
              playTapSound()
              selectGlass(overlapItem.id)
            } else {
              playTapSound()
              placeGlass(mm.x, mm.y)
            }
          } else {
            playTapSound()
            placeGlass(mm.x, mm.y)
          }
        }
        // selectMode ON + 空白タップ → 何もしない（または deselect は上で処理済み）
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
  }, [hitTest, selectedIds, selectGlass, toggleSelectGlass, clearSelection, replaceSelection, viewport, placeGlass, revertItems, pushUndo, activeTool, selectMode, items, pendingShape, pendingColorId, rangeBox])

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
    dragState.current.lastSnapStepIndex = null

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
      dragState.current.startPositions = new Map(
        selectedIds.map(id => {
          const item = items.find(i => i.id === id)
          return [id, { xMm: item?.xMm ?? centerXMm, yMm: item?.yMm ?? centerYMm }]
        })
      )
    }

    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })
  }, [items, viewport, selectedIds])

  /**
   * 放射対称の中心点・鏡像配置の反転基準点のドラッグ開始。
   * 回転ハンドルと同様にコンテナ側でポインターを捕捉し、独自の
   * pointermove/up は持たせない（小さいハンドルを掴み損ねると
   * キャンバス側のパン/範囲選択に奪われ、ハンドルが「逃げる」ように見えるため）。
   */
  const onCenterHandlePointerDown = useCallback((
    e: React.PointerEvent,
    mode: 'drag-radial-center' | 'drag-mirror-origin',
    originXMm: number,
    originYMm: number,
  ) => {
    e.stopPropagation()
    dragState.current.mode = mode
    dragState.current.isDragging = true
    dragState.current.lastSnapStepIndex = null
    dragState.current.centerDragStartX = e.clientX
    dragState.current.centerDragStartY = e.clientY
    dragState.current.centerDragStartOx = originXMm
    dragState.current.centerDragStartOy = originYMm

    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })
  }, [])

  /** 連続配置マージンハンドルの pointerDown（onCenterHandlePointerDown と同じ理由で統合） */
  const onPatternGapPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    dragState.current.mode = 'drag-pattern-gap'
    dragState.current.isDragging = true
    dragState.current.lastSnapStepIndex = null
    dragState.current.patternGapDragStartX = e.clientX
    dragState.current.patternGapDragStartY = e.clientY
    dragState.current.patternGapDragStartGap = patternGapMm

    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    })
  }, [patternGapMm])

  // 選択ガラスを最前面に並び替えて描画
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

  // 連続配置マージンハンドルの表示位置（最初のコピー群の重心）
  const patternGapHandleMm = useMemo(() => {
    if (activeTool !== 'pattern' || selectedIds.length === 0 || previewItems.length === 0) return null
    const firstCopy = previewItems.slice(0, selectedIds.length)
    if (firstCopy.length === 0) return null
    const cx = firstCopy.reduce((sum, i) => sum + i.xMm, 0) / firstCopy.length
    const cy = firstCopy.reduce((sum, i) => sum + i.yMm, 0) / firstCopy.length
    return { x: cx, y: cy }
  }, [activeTool, selectedIds, previewItems])

  const { zoom, panX, panY } = viewport

  // グリッド描画範囲（表示範囲＋余白、キャンバス境界内にクランプ）。
  // キャンバス全体ではなくこの範囲だけ描画することで、大きなキャンバスでも
  // グリッド線の数を抑える。
  const gridVisibleRect = useMemo(() => {
    const marginMm = 30
    const p1 = screenToMm(0, 48, viewport)
    const p2 = screenToMm(window.innerWidth, window.innerHeight, viewport)
    return {
      minX: Math.max(0, Math.min(p1.x, p2.x) - marginMm),
      maxX: Math.min(canvasWidthMm, Math.max(p1.x, p2.x) + marginMm),
      minY: Math.max(0, Math.min(p1.y, p2.y) - marginMm),
      maxY: Math.min(canvasHeightMm, Math.max(p1.y, p2.y) + marginMm),
    }
  }, [viewport, canvasWidthMm, canvasHeightMm])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-100 relative"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        style={{
          // panY はウィンドウ絶対値だが CSS transform はコンテナ相対値
          // コンテナはツールバー (48px) の下から始まるため 48px を引く
          transform: `translate(${panX}px, ${panY - 48}px) scale(${zoom})`,
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
          <CanvasGrid
            widthMm={canvasWidthMm} heightMm={canvasHeightMm} zoom={zoom}
            visibleMinX={gridVisibleRect.minX} visibleMaxX={gridVisibleRect.maxX}
            visibleMinY={gridVisibleRect.minY} visibleMaxY={gridVisibleRect.maxY}
          />

          {sortedItems.map(item => (
            <GlassPiece
              key={item.id}
              item={item}
              isSelected={selectedSet.has(item.id)}
            />
          ))}

          {/* 仮配置アイテム */}
          {previewItems.map(item => (
            <GlassPiece
              key={item.id}
              item={item}
              isSelected={false}
              isPreview
            />
          ))}

          {/* 鏡像軸・放射中心・連続配置マージンオーバーレイ */}
          <PlacementOverlay
            onRadialCenterPointerDown={(e) => onCenterHandlePointerDown(e, 'drag-radial-center', radialCenterMm.x, radialCenterMm.y)}
            onMirrorOriginPointerDown={(e) => onCenterHandlePointerDown(e, 'drag-mirror-origin', mirrorOriginMm.x, mirrorOriginMm.y)}
            patternGapHandleMm={patternGapHandleMm}
            onPatternGapPointerDown={onPatternGapPointerDown}
          />

          {/* 範囲選択ボックス */}
          {rangeBox && (
            <rect
              x={Math.min(rangeBox.x1, rangeBox.x2)}
              y={Math.min(rangeBox.y1, rangeBox.y2)}
              width={Math.abs(rangeBox.x2 - rangeBox.x1)}
              height={Math.abs(rangeBox.y2 - rangeBox.y1)}
              fill="rgba(59,130,246,0.1)"
              stroke="#3b82f6"
              strokeWidth={0.5}
              strokeDasharray="2,1.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

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
