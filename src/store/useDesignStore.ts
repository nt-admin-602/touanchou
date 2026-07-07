import { create } from 'zustand'
import type { GlassItem, ShapeType, Viewport, Screen } from '../types'
import { DEFAULT_COLOR_ID } from '../config/colors'
import { calcInitialViewport, snapMm } from '../utils/coordinates'

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
  selectedId: string | null

  // パレット選択
  pendingShape: ShapeType
  pendingColorId: string

  // ビューポート
  viewport: Viewport

  // アクション
  goToEditor: (widthMm: number, heightMm: number) => void
  setViewport: (vp: Viewport) => void
  initViewport: (screenW: number, screenH: number) => void

  placeGlass: (xMm: number, yMm: number) => void
  selectGlass: (id: string | null) => void
  moveGlass: (id: string, xMm: number, yMm: number) => void
  rotateGlass: (id: string, rotationDeg: number) => void

  setPendingShape: (shape: ShapeType) => void
  setPendingColor: (colorId: string) => void
}

export const useDesignStore = create<DesignState>((set, get) => ({
  screen: 'new',
  canvasWidthMm: 100,
  canvasHeightMm: 100,
  items: [],
  selectedId: null,
  pendingShape: 'diamond',
  pendingColorId: DEFAULT_COLOR_ID,
  viewport: { zoom: 3, panX: 0, panY: 0 },

  goToEditor: (widthMm, heightMm) => {
    set({ screen: 'editor', canvasWidthMm: widthMm, canvasHeightMm: heightMm, items: [], selectedId: null })
  },

  setViewport: (vp) => set({ viewport: vp }),

  initViewport: (screenW, screenH) => {
    const { canvasWidthMm, canvasHeightMm } = get()
    const vp = calcInitialViewport(canvasWidthMm, canvasHeightMm, screenW, screenH)
    set({ viewport: vp })
  },

  placeGlass: (xMm, yMm) => {
    const { pendingShape, pendingColorId, canvasWidthMm, canvasHeightMm, items } = get()
    const snappedX = snapMm(xMm)
    const snappedY = snapMm(yMm)
    // 中心点がキャンバス内かチェック（spec §5.4）
    if (snappedX < 0 || snappedX > canvasWidthMm || snappedY < 0 || snappedY > canvasHeightMm) return
    const newItem: GlassItem = {
      id: genId(),
      shape: pendingShape,
      colorId: pendingColorId,
      xMm: snappedX,
      yMm: snappedY,
      rotationDeg: 0,
    }
    set({ items: [...items, newItem], selectedId: newItem.id })
  },

  selectGlass: (id) => set({ selectedId: id }),

  moveGlass: (id, xMm, yMm) => {
    const { canvasWidthMm, canvasHeightMm, items } = get()
    const snappedX = snapMm(xMm)
    const snappedY = snapMm(yMm)
    if (snappedX < 0 || snappedX > canvasWidthMm || snappedY < 0 || snappedY > canvasHeightMm) return
    set({
      items: items.map(item =>
        item.id === id ? { ...item, xMm: snappedX, yMm: snappedY } : item
      ),
    })
  },

  rotateGlass: (id, rotationDeg) => {
    set(state => ({
      items: state.items.map(item =>
        item.id === id ? { ...item, rotationDeg } : item
      ),
    }))
  },

  setPendingShape: (shape) => set({ pendingShape: shape }),
  setPendingColor: (colorId) => set({ pendingColorId: colorId }),
}))
