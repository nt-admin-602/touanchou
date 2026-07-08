import { create } from 'zustand'
import type { GlassItem, ShapeType, Viewport, Screen } from '../types'
import { DEFAULT_COLOR_ID } from '../config/colors'
import { calcInitialViewport, snapMm, snapDeg } from '../utils/coordinates'
import { findOverlappingIds } from '../utils/geometry'

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

  // ナビゲーション
  goToEditor: (widthMm: number, heightMm: number) => void
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
    })
  },

  setViewport: (vp) => set({ viewport: vp }),

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
}))

