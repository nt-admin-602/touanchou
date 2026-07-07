import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

// フローティングツールのボタン定義（Phase 1 は仮表示のみ）
const TOOLS = [
  { icon: '⧉', label: '複製' },
  { icon: '↻', label: '回転固定' },
  { icon: '⇋', label: '鏡像配置' },
  { icon: '⋯', label: '連続配置' },
  { icon: '✳', label: '放射対称' },
  { icon: '🗑', label: '削除' },
] as const

const TOOLBAR_H = 48
const PALETTE_H = 120
const TOOL_W = 44
const TOOL_H = 44
const PANEL_W = TOOLS.length * TOOL_W + 8
const PANEL_H = TOOL_H + 8

export function FloatingTools() {
  const { selectedId, items, viewport } = useDesignStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!selectedId) return
    const item = items.find(i => i.id === selectedId)
    if (!item) return

    // アイテムの中心をスクリーン座標に変換
    const cx = item.xMm * viewport.zoom + viewport.panX
    const cy = item.yMm * viewport.zoom + viewport.panY

    const sw = window.innerWidth
    const sh = window.innerHeight

    // ガラスの上に表示。はみ出さないようにクランプ
    let x = cx - PANEL_W / 2
    let y = cy - 60

    x = Math.max(4, Math.min(sw - PANEL_W - 4, x))
    y = Math.max(TOOLBAR_H + 4, Math.min(sh - PALETTE_H - PANEL_H - 8, y))

    setPos({ x, y })
  }, [selectedId, items, viewport])

  if (!selectedId) return null

  return (
    <div
      ref={panelRef}
      className="absolute z-20 flex gap-1 bg-gray-800 rounded-xl px-1 py-1 shadow-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      {TOOLS.map(tool => (
        <button
          key={tool.label}
          title={tool.label}
          disabled
          className="w-11 h-11 flex items-center justify-center rounded-lg text-xl text-white opacity-40"
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}
