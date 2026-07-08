import { create } from 'zustand'
import type { GlassItem, ShapeType, Viewport, Screen, DesignDocument, DraftBackup, PlacementTool, MirrorAxis, PatternDirection } from '../types'
import { DEFAULT_COLOR_ID } from '../config/colors'
import { DEFAULT_GROUT_GAP_MM } from '../config/canvas'
import { calcInitialViewport, snapMm, snapDeg, clampViewport } from '../utils/coordinates'
import { findOverlappingIds } from '../utils/geometry'
import { saveDesign as saveDesignDB, getDesign, loadDraft, saveDraft, clearDraft } from '../utils/storage'
import { generateThumbnail } from '../utils/thumbnail'
import {
  computeDuplicateItems, computeMirrorItems, computeRadialItems,
  computePatternItems, getPreviewOverlapIds,
} from '../utils/placement'

const MAX_UNDO = 50

let nextId = 1
function genId() {
  return `g${Date.now()}-${nextId++}`
}

type DesignState = {
  // ナビゲーション
  screen: Screen

  // キャンバス
  canvasWidthMm: number
  canvasHeightMm: number

  // ガラス
  items: GlassItem[]
  selectedIds: string[]
  multiSelectMode: boolean
  overlappingIds: string[]

  // パレット選択
  pendingShape: ShapeType
  pendingColorId: string

  // ビューポート
  viewport: Viewport

  // Undo / Redo
  undoStack: GlassItem[][]
  redoStack: GlassItem[][]

  // 図案メタ
  designId: string | null     // null = 未保存
  designName: string
  isDirty: boolean            // 未保存の変更あり

  // ナビゲーション
  goToEditor: (widthMm: number, heightMm: number) => void
  goToList: () => void
  goToNew: () => void
  setViewport: (vp: Viewport) => void
  initViewport: (screenW: number, screenH: number) => void

  // 配置
  placeGlass: (xMm: number, yMm: number) => void

  // 選択
  selectGlass: (id: string | null) => void
  toggleSelectGlass: (id: string) => void
  clearSelection: () => void
  setMultiSelectMode: (on: boolean) => void

  // ライブ移動・回転（ドラッグ中, undo 不要）
  moveGlass: (id: string, xMm: number, yMm: number) => void
  batchMoveGlasses: (updates: { id: string; xMm: number; yMm: number }[]) => void
  rotateGlass: (id: string, rotationDeg: number) => void
  batchRotateGlasses: (updates: { id: string; rotationDeg: number }[]) => void

  // ドラッグ確定 / 元に戻す
  pushUndo: (snapshot: GlassItem[]) => void
  revertItems: (snapshot: GlassItem[]) => void

  // 確定アクション（自動で undo 積み）
  deleteSelected: () => void
  changeSelectedColor: (colorId: string) => void
  changeSelectedShape: (shape: ShapeType) => void

  // Undo / Redo
  undo: () => void
  redo: () => void

  // パレット
  setPendingShape: (shape: ShapeType) => void
  setPendingColor: (colorId: string) => void

  // 保存・管理（Phase 3）
  setDesignName: (name: string) => void
  saveCurrentDesign: () => Promise<void>
  openDesign: (doc: DesignDocument) => void
  checkDraft: () => Promise<DraftBackup | null>
  restoreDraft: (backup: DraftBackup) => void
  discardDraft: () => Promise<void>
  exportJSON: () => void
  importJSON: (jsonStr: string) => Promise<{ ok: boolean; error?: string }>

  // 仮配置ツール（Phase 4）
  activeTool: PlacementTool
  previewItems: GlassItem[]
  previewOverlapIds: string[]      // preview 内の重なり id

  mirrorAxis: MirrorAxis
  mirrorOriginMm: { x: number; y: number }

  radialCount: 2 | 4 | 8 | 16
  radialCenterMm: { x: number; y: number }

  patternDirection: PatternDirection
  patternRepeatCount: number

  duplicateOffsetMm: { x: number; y: number }

  startDuplicate: () => void
  startMirror: () => void
  startRadial: () => void
  startPattern: () => void
  setMirrorAxis: (axis: MirrorAxis) => void
  setMirrorOriginMm: (x: number, y: number) => void
  setRadialCount: (count: 2 | 4 | 8 | 16) => void
  setRadialCenterMm: (x: number, y: number) => void
  setPatternDirection: (dir: PatternDirection) => void
  setPatternRepeatCount: (n: number) => void
  moveDuplicateOffset: (x: number, y: number) => void
  confirmPlacement: () => void
  cancelPlacement: () => void
}

export const useDesignStore = create<DesignState>((set, get) => ({
  screen: 'new',
  canvasWidthMm: 100,
  canvasHeightMm: 100,
  items: [],
  selectedIds: [],
  multiSelectMode: false,
  overlappingIds: [],
  pendingShape: 'diamond',
  pendingColorId: DEFAULT_COLOR_ID,
  viewport: { zoom: 3, panX: 0, panY: 0 },
  undoStack: [],
  redoStack: [],
  designId: null,
  designName: '',
  isDirty: false,

  // Phase 4 仮配置
  activeTool: 'none' as PlacementTool,
  previewItems: [],
  previewOverlapIds: [],
  mirrorAxis: 'horizontal' as MirrorAxis,
  mirrorOriginMm: { x: 50, y: 50 },
  radialCount: 4 as (2 | 4 | 8 | 16),
  radialCenterMm: { x: 50, y: 50 },
  patternDirection: 'right' as PatternDirection,
  patternRepeatCount: 4,
  duplicateOffsetMm: { x: 10, y: 10 },

  goToEditor: (widthMm, heightMm) => {
    set({
      screen: 'editor',
      canvasWidthMm: widthMm,
      canvasHeightMm: heightMm,
      items: [],
      selectedIds: [],
      multiSelectMode: false,
      overlappingIds: [],
      undoStack: [],
      redoStack: [],
      designId: null,
      designName: '',
      isDirty: false,
    })
  },

  goToList: () => set({ screen: 'list', selectedIds: [], multiSelectMode: false }),

  goToNew: () => set({ screen: 'new' }),

  setViewport: (vp) => {
    const { canvasWidthMm, canvasHeightMm } = get()
    set({ viewport: clampViewport(vp, canvasWidthMm, canvasHeightMm, window.innerWidth, window.innerHeight) })
  },

  initViewport: (screenW, screenH) => {
    const { canvasWidthMm, canvasHeightMm } = get()
    const vp = calcInitialViewport(canvasWidthMm, canvasHeightMm, screenW, screenH)
    set({ viewport: vp })
  },

  placeGlass: (xMm, yMm) => {
    const { pendingShape, pendingColorId, canvasWidthMm, canvasHeightMm, items, undoStack } = get()
    const snappedX = snapMm(xMm)
    const snappedY = snapMm(yMm)
    if (snappedX < 0 || snappedX > canvasWidthMm || snappedY < 0 || snappedY > canvasHeightMm) return
    const newItem: GlassItem = {
      id: genId(),
      shape: pendingShape,
      colorId: pendingColorId,
      xMm: snappedX,
      yMm: snappedY,
      rotationDeg: 0,
    }
    const newItems = [...items, newItem]
    set({
      items: newItems,
      selectedIds: [newItem.id],
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      redoStack: [],
      overlappingIds: findOverlappingIds(newItems),
    })
  },

  selectGlass: (id) => {
    if (id === null) {
      set({ selectedIds: [], multiSelectMode: false })
    } else {
      set({ selectedIds: [id], multiSelectMode: false })
    }
  },

  toggleSelectGlass: (id) => {
    set(state => {
      const { selectedIds, multiSelectMode } = state
      if (selectedIds.includes(id)) {
        const newIds = selectedIds.filter(i => i !== id)
        return { selectedIds: newIds, multiSelectMode: newIds.length > 0 ? multiSelectMode : false }
      } else {
        return { selectedIds: [...selectedIds, id] }
      }
    })
  },

  clearSelection: () => set({ selectedIds: [], multiSelectMode: false }),

  setMultiSelectMode: (on) => set({ multiSelectMode: on }),

  moveGlass: (id, xMm, yMm) => {
    const { canvasWidthMm, canvasHeightMm, items } = get()
    const snappedX = snapMm(xMm)
    const snappedY = snapMm(yMm)
    if (snappedX < 0 || snappedX > canvasWidthMm || snappedY < 0 || snappedY > canvasHeightMm) return
    const newItems = items.map(item =>
      item.id === id ? { ...item, xMm: snappedX, yMm: snappedY } : item
    )
    set({ items: newItems, overlappingIds: findOverlappingIds(newItems) })
  },

  batchMoveGlasses: (updates) => {
    const { canvasWidthMm, canvasHeightMm, items } = get()
    // 全アイテムが境界内に収まるか確認
    for (const u of updates) {
      const sx = snapMm(u.xMm)
      const sy = snapMm(u.yMm)
      if (sx < 0 || sx > canvasWidthMm || sy < 0 || sy > canvasHeightMm) return
    }
    const updateMap = new Map(updates.map(u => [u.id, u]))
    const newItems = items.map(item => {
      const u = updateMap.get(item.id)
      if (!u) return item
      return { ...item, xMm: snapMm(u.xMm), yMm: snapMm(u.yMm) }
    })
    set({ items: newItems, overlappingIds: findOverlappingIds(newItems) })
  },

  rotateGlass: (id, rotationDeg) => {
    const { items } = get()
    const newItems = items.map(item =>
      item.id === id ? { ...item, rotationDeg: snapDeg(rotationDeg) } : item
    )
    set({ items: newItems, overlappingIds: findOverlappingIds(newItems) })
  },

  batchRotateGlasses: (updates) => {
    const { items } = get()
    const updateMap = new Map(updates.map(u => [u.id, u]))
    const newItems = items.map(item => {
      const u = updateMap.get(item.id)
      if (!u) return item
      return { ...item, rotationDeg: snapDeg(u.rotationDeg) }
    })
    set({ items: newItems, overlappingIds: findOverlappingIds(newItems) })
  },

  pushUndo: (snapshot) => {
    const { undoStack } = get()
    set({ undoStack: [...undoStack, snapshot].slice(-MAX_UNDO), redoStack: [] })
  },

  revertItems: (snapshot) => {
    set({ items: snapshot, overlappingIds: [] })
  },

  deleteSelected: () => {
    const { items, selectedIds, undoStack } = get()
    if (selectedIds.length === 0) return
    const selectedSet = new Set(selectedIds)
    const newItems = items.filter(item => !selectedSet.has(item.id))
    set({
      items: newItems,
      selectedIds: [],
      multiSelectMode: false,
      overlappingIds: [],
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      redoStack: [],
    })
  },

  changeSelectedColor: (colorId) => {
    const { items, selectedIds, undoStack } = get()
    if (selectedIds.length === 0) return
    const selectedSet = new Set(selectedIds)
    const newItems = items.map(item =>
      selectedSet.has(item.id) ? { ...item, colorId } : item
    )
    set({
      items: newItems,
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      redoStack: [],
    })
  },

  changeSelectedShape: (shape) => {
    const { items, selectedIds, undoStack } = get()
    if (selectedIds.length === 0) return
    const selectedSet = new Set(selectedIds)
    const newItems = items.map(item =>
      selectedSet.has(item.id) ? { ...item, shape } : item
    )
    set({
      items: newItems,
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      redoStack: [],
    })
  },

  undo: () => {
    const { undoStack, redoStack, items } = get()
    if (undoStack.length === 0) return
    const prevItems = undoStack[undoStack.length - 1]
    set({
      items: prevItems,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, items].slice(-MAX_UNDO),
      selectedIds: [],
      overlappingIds: [],
    })
  },

  redo: () => {
    const { undoStack, redoStack, items } = get()
    if (redoStack.length === 0) return
    const nextItems = redoStack[redoStack.length - 1]
    set({
      items: nextItems,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      selectedIds: [],
      overlappingIds: [],
    })
  },

  setPendingShape: (shape) => set({ pendingShape: shape }),
  setPendingColor: (colorId) => set({ pendingColorId: colorId }),

  // ── Phase 4: 仮配置ツール ────────────────────────────────────────────────

  startDuplicate: () => {
    const { items, selectedIds, canvasWidthMm, canvasHeightMm } = get()
    if (selectedIds.length === 0) return
    const src = items.filter(i => selectedIds.includes(i.id))
    const offset = { x: 10, y: 10 }
    const preview = computeDuplicateItems(src, offset.x, offset.y)
    const overlapIds = getPreviewOverlapIds(items, preview)
    set({
      activeTool: 'duplicate', previewItems: preview, previewOverlapIds: overlapIds,
      duplicateOffsetMm: offset,
      mirrorOriginMm: { x: canvasWidthMm / 2, y: canvasHeightMm / 2 },
      radialCenterMm:  { x: canvasWidthMm / 2, y: canvasHeightMm / 2 },
    })
  },

  startMirror: () => {
    const { items, selectedIds, canvasWidthMm, canvasHeightMm, mirrorAxis } = get()
    if (selectedIds.length === 0) return
    const src = items.filter(i => selectedIds.includes(i.id))
    const origin = { x: canvasWidthMm / 2, y: canvasHeightMm / 2 }
    const preview = computeMirrorItems(src, mirrorAxis, origin.x, origin.y)
    set({
      activeTool: 'mirror', previewItems: preview,
      previewOverlapIds: getPreviewOverlapIds(items, preview),
      mirrorOriginMm: origin,
    })
  },

  startRadial: () => {
    const { items, selectedIds, canvasWidthMm, canvasHeightMm, radialCount } = get()
    if (selectedIds.length === 0) return
    const src = items.filter(i => selectedIds.includes(i.id))
    const center = { x: canvasWidthMm / 2, y: canvasHeightMm / 2 }
    const preview = computeRadialItems(src, radialCount, center.x, center.y)
    set({
      activeTool: 'radial', previewItems: preview,
      previewOverlapIds: getPreviewOverlapIds(items, preview),
      radialCenterMm: center,
    })
  },

  startPattern: () => {
    const { items, selectedIds, patternDirection, patternRepeatCount } = get()
    if (selectedIds.length === 0) return
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computePatternItems(src, patternDirection, patternRepeatCount, DEFAULT_GROUT_GAP_MM)
    set({
      activeTool: 'pattern', previewItems: preview,
      previewOverlapIds: getPreviewOverlapIds(items, preview),
    })
  },

  setMirrorAxis: (axis) => {
    const { items, selectedIds, mirrorOriginMm } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computeMirrorItems(src, axis, mirrorOriginMm.x, mirrorOriginMm.y)
    set({ mirrorAxis: axis, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  setMirrorOriginMm: (x, y) => {
    const { items, selectedIds, mirrorAxis } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computeMirrorItems(src, mirrorAxis, x, y)
    set({ mirrorOriginMm: { x, y }, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  setRadialCount: (count) => {
    const { items, selectedIds, radialCenterMm } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computeRadialItems(src, count, radialCenterMm.x, radialCenterMm.y)
    set({ radialCount: count, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  setRadialCenterMm: (x, y) => {
    const { items, selectedIds, radialCount } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computeRadialItems(src, radialCount, x, y)
    set({ radialCenterMm: { x, y }, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  setPatternDirection: (dir) => {
    const { items, selectedIds, patternRepeatCount } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computePatternItems(src, dir, patternRepeatCount, DEFAULT_GROUT_GAP_MM)
    set({ patternDirection: dir, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  setPatternRepeatCount: (n) => {
    const clamped = Math.max(1, Math.min(16, n))
    const { items, selectedIds, patternDirection } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computePatternItems(src, patternDirection, clamped, DEFAULT_GROUT_GAP_MM)
    set({ patternRepeatCount: clamped, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  moveDuplicateOffset: (x, y) => {
    const { items, selectedIds } = get()
    const src = items.filter(i => selectedIds.includes(i.id))
    const preview = computeDuplicateItems(src, x, y)
    set({ duplicateOffsetMm: { x, y }, previewItems: preview, previewOverlapIds: getPreviewOverlapIds(items, preview) })
  },

  confirmPlacement: () => {
    const { items, previewItems, previewOverlapIds, undoStack } = get()
    if (previewOverlapIds.length > 0) return
    const newItems = [...items, ...previewItems]
    const selected = previewItems.map(p => p.id)
    set({
      items: newItems,
      selectedIds: selected,
      activeTool: 'none',
      previewItems: [],
      previewOverlapIds: [],
      overlappingIds: [],
      undoStack: [...undoStack, items].slice(-MAX_UNDO),
      redoStack: [],
    })
  },

  cancelPlacement: () => {
    set({ activeTool: 'none', previewItems: [], previewOverlapIds: [] })
  },

  setDesignName: (name) => set({ designName: name }),

  saveCurrentDesign: async () => {
    const state = get()
    const now = new Date().toISOString()
    const id = state.designId ?? `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const name = state.designName || generateDesignName()
    const doc: DesignDocument = {
      id,
      name,
      createdAt: state.designId ? (await getDesign(id))?.createdAt ?? now : now,
      updatedAt: now,
      canvasWidthMm: state.canvasWidthMm,
      canvasHeightMm: state.canvasHeightMm,
      groutGapMm: DEFAULT_GROUT_GAP_MM,
      items: state.items,
      dataVersion: 1,
    }
    const thumbnail = await generateThumbnail(state.items, state.canvasWidthMm, state.canvasHeightMm)
    await saveDesignDB({ ...doc, thumbnail })
    await clearDraft()
    set({
      designId: id,
      designName: name,
      isDirty: false,
      undoStack: [],
      redoStack: [],
    })
  },

  openDesign: (doc) => {
    set({
      screen: 'editor',
      canvasWidthMm: doc.canvasWidthMm,
      canvasHeightMm: doc.canvasHeightMm,
      items: doc.items,
      selectedIds: [],
      multiSelectMode: false,
      overlappingIds: [],
      undoStack: [],
      redoStack: [],
      designId: doc.id,
      designName: doc.name,
      isDirty: false,
    })
  },

  checkDraft: async () => {
    const backup = await loadDraft()
    return backup ?? null
  },

  restoreDraft: (backup) => {
    const doc = backup.document
    set({
      screen: 'editor',
      canvasWidthMm: doc.canvasWidthMm,
      canvasHeightMm: doc.canvasHeightMm,
      items: doc.items,
      selectedIds: [],
      multiSelectMode: false,
      overlappingIds: [],
      undoStack: backup.undoStack,
      redoStack: backup.redoStack,
      designId: doc.id.startsWith('unsaved-') ? null : doc.id,
      designName: doc.name,
      isDirty: true,
    })
  },

  discardDraft: async () => {
    await clearDraft()
  },

  exportJSON: () => {
    const state = get()
    const doc: DesignDocument = {
      id: state.designId ?? `design-${Date.now()}`,
      name: state.designName || '図案',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvasWidthMm: state.canvasWidthMm,
      canvasHeightMm: state.canvasHeightMm,
      groutGapMm: DEFAULT_GROUT_GAP_MM,
      items: state.items,
      dataVersion: 1,
    }
    const json = JSON.stringify(doc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  importJSON: async (jsonStr) => {
    try {
      const raw = JSON.parse(jsonStr)
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) {
        return { ok: false, error: 'JSONの形式が正しくありません' }
      }
      const now = new Date().toISOString()
      const doc: DesignDocument = {
        id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(raw.name ?? '読み込み図案'),
        createdAt: now,
        updatedAt: now,
        canvasWidthMm: Number(raw.canvasWidthMm) || 100,
        canvasHeightMm: Number(raw.canvasHeightMm) || 100,
        groutGapMm: Number(raw.groutGapMm) || DEFAULT_GROUT_GAP_MM,
        items: raw.items,
        dataVersion: Number(raw.dataVersion) || 1,
      }
      const thumbnail = await generateThumbnail(doc.items, doc.canvasWidthMm, doc.canvasHeightMm)
      await saveDesignDB({ ...doc, thumbnail })
      return { ok: true }
    } catch {
      return { ok: false, error: 'JSONの解析に失敗しました' }
    }
  },
}))

// ── 図案名の自動生成 ──────────────────────────────────────────
function generateDesignName(): string {
  const now = new Date()
  const y = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  return `新しい図案 ${y}-${mo}-${d} ${h}:${mi}`
}

// ── 自動バックアップ（最後の変更から 1.5 秒後に保存）────────
let _backupTimer: ReturnType<typeof setTimeout> | null = null

useDesignStore.subscribe((state, prevState) => {
  if (state.screen !== 'editor') return
  const changed =
    state.items !== prevState.items ||
    state.undoStack !== prevState.undoStack ||
    state.redoStack !== prevState.redoStack
  if (!changed) return

  // isDirty を立てる
  if (!state.isDirty) {
    useDesignStore.setState({ isDirty: true })
  }

  if (_backupTimer) clearTimeout(_backupTimer)
  _backupTimer = setTimeout(async () => {
    const s = useDesignStore.getState()
    if (s.screen !== 'editor') return
    const now = new Date().toISOString()
    const backup: import('../types').DraftBackup = {
      document: {
        id: s.designId ?? `unsaved-${Date.now()}`,
        name: s.designName,
        createdAt: now,
        updatedAt: now,
        canvasWidthMm: s.canvasWidthMm,
        canvasHeightMm: s.canvasHeightMm,
        groutGapMm: DEFAULT_GROUT_GAP_MM,
        items: s.items,
        dataVersion: 1,
      },
      undoStack: s.undoStack,
      redoStack: s.redoStack,
      updatedAt: now,
    }
    await saveDraft(backup)
  }, 1500)
})

