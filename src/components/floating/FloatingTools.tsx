import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { getShapeVertices, rotateVertices } from '../../utils/geometry'

const TOOLBAR_H = 48
const PALETTE_H = 120
const TOOL_W = 44
const TOOL_H = 44

export function FloatingTools() {
  const {
    selectedIds, multiSelectMode, items, viewport,
    deleteSelected, setMultiSelectMode,
  } = useDesignStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (selectedIds.length === 0) return

    // 選択グループのスクリーン空間バウンディングボックスを計算
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id)
      if (!item) continue
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      for (const v of verts) {
        const sx = (v.x + item.xMm) * viewport.zoom + viewport.panX
        const sy = (v.y + item.yMm) * viewport.zoom + viewport.panY
        if (sx < minX) minX = sx
        if (sx > maxX) maxX = sx
        if (sy < minY) minY = sy
        if (sy > maxY) maxY = sy
      }
    }
    const cx = (minX + maxX) / 2
    const topY = minY

    // ボタン数に応じてパネル幅を計算
    const btnCount = multiSelectMode ? 3 : 2  // multi-select: ⊞ + 🗑; normal: ⊞ + 🗑
    const PANEL_W = btnCount * TOOL_W + 8
    const PANEL_H = TOOL_H + 8
    const sw = window.innerWidth
    const sh = window.innerHeight

    let x = cx - PANEL_W / 2
    let y = topY - 60

    x = Math.max(4, Math.min(sw - PANEL_W - 4, x))
    y = Math.max(TOOLBAR_H + 4, Math.min(sh - PALETTE_H - PANEL_H - 8, y))

    setPos({ x, y })
  }, [selectedIds, items, viewport, multiSelectMode])

  if (selectedIds.length === 0) return null

  return (
    <div
      ref={panelRef}
      className="absolute z-20 flex gap-1 bg-gray-800 rounded-xl px-1 py-1 shadow-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Phase 4 で有効化するボタン（仮表示） */}
      <button disabled title="複製" className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-white opacity-40">⧉</button>
      <button disabled title="鏡像配置" className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-white opacity-40">⇋</button>
      <button disabled title="連続配置" className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-white opacity-40">⋯</button>
      <button disabled title="放射対称" className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-white opacity-40">✳</button>

      {/* 複数選択トグル */}
      <button
        title={multiSelectMode ? '複数選択モード解除' : '複数選択モード'}
        onClick={() => setMultiSelectMode(!multiSelectMode)}
        className={[
          'w-11 h-11 flex items-center justify-center rounded-lg text-xl',
          multiSelectMode
            ? 'bg-blue-500 text-white'
            : 'text-white opacity-70 active:opacity-100',
        ].join(' ')}
      >
        ⊞
      </button>

      {/* 削除 */}
      <button
        title="削除"
        onClick={deleteSelected}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-red-400 active:text-red-300"
      >
        🗑
      </button>
    </div>
  )
}
