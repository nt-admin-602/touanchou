import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { getShapeVertices, rotateVertices } from '../../utils/geometry'

const TOOLBAR_H = 48
const PALETTE_H = 120
const TOOL_W = 44
// 3列 × 44px + gap2 × 4px + padding2 × 4px = 148px
const PANEL_W = 3 * TOOL_W + 2 * 4 + 2 * 4
// 2行 × 44px + gap1 × 4px + padding2 × 4px = 100px
const PANEL_H = 2 * TOOL_W + 1 * 4 + 2 * 4

export function FloatingTools() {
  const {
    selectedIds, multiSelectMode, items, viewport,
    activeTool, previewItems, radialCenterMm, mirrorOriginMm,
    deleteSelected, setMultiSelectMode,
    startDuplicate, startMirror, startRadial, startPattern,
  } = useDesignStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (selectedIds.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const includePoint = (xMm: number, yMm: number) => {
      const sx = xMm * viewport.zoom + viewport.panX
      const sy = yMm * viewport.zoom + viewport.panY - 48  // コンテナ補正
      if (sx < minX) minX = sx
      if (sx > maxX) maxX = sx
      if (sy < minY) minY = sy
      if (sy > maxY) maxY = sy
    }

    for (const id of selectedIds) {
      const item = items.find(i => i.id === id)
      if (!item) continue
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      for (const v of verts) includePoint(v.x + item.xMm, v.y + item.yMm)
    }

    // 仮配置中は中心点・軸・展開プレビューにも被らないようにする
    if (activeTool === 'radial') includePoint(radialCenterMm.x, radialCenterMm.y)
    if (activeTool === 'mirror') includePoint(mirrorOriginMm.x, mirrorOriginMm.y)
    for (const item of previewItems) {
      const verts = rotateVertices(getShapeVertices(item.shape), item.rotationDeg)
      for (const v of verts) includePoint(v.x + item.xMm, v.y + item.yMm)
    }

    const cx = (minX + maxX) / 2
    const topY = minY
    const bottomY = maxY

    const sw = window.innerWidth
    const sh = window.innerHeight

    let x = Math.max(4, Math.min(sw - PANEL_W - 4, cx - PANEL_W / 2))
    // まず上に配置を試みる
    let y = topY - PANEL_H - 12
    if (y < TOOLBAR_H + 4) {
      // 上に収まらなければ下に
      y = bottomY + 12
      if (y + PANEL_H > sh - PALETTE_H - 4) {
        // 下にも収まらない → 上のうち最善位置へ
        y = Math.max(TOOLBAR_H + 4, topY - PANEL_H - 12)
      }
    }

    setPos({ x, y })
  }, [selectedIds, items, viewport, activeTool, previewItems, radialCenterMm, mirrorOriginMm])

  if (selectedIds.length === 0) return null

  return (
    <div
      ref={panelRef}
      className="absolute z-20 bg-gray-800 rounded-xl shadow-xl"
      style={{
        left: pos.x,
        top: pos.y,
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${TOOL_W}px)`,
        gap: '4px',
        padding: '4px',
      }}
    >
      {/* 有効なボタンを先頭に（画面端でも見える位置） */}
      <ToolBtn
        icon="⊞"
        label={multiSelectMode ? '複数選択解除' : '複数選択'}
        active={multiSelectMode}
        onClick={() => setMultiSelectMode(!multiSelectMode)}
      />
      <ToolBtn icon="🗑" label="削除" danger onClick={deleteSelected} />

      {/* Phase 4 布置補助 */}
      <ToolBtn icon="⧉" label="複製"       onClick={startDuplicate} />
      <ToolBtn icon="⇋" label="鏡像配置"   onClick={startMirror} />
      <ToolBtn icon="⋯" label="連続配置"   onClick={startPattern} />
      <ToolBtn icon="✳" label="放射対称" onClick={startRadial} />
    </div>
  )
}

function ToolBtn({
  icon, label, onClick, disabled, active, danger,
}: {
  icon: string
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'w-11 h-11 flex items-center justify-center rounded-lg text-xl',
        disabled ? 'text-white opacity-30' : '',
        active ? 'bg-blue-500 text-white' : '',
        danger && !disabled ? 'text-red-400 active:text-red-300' : '',
        !disabled && !active && !danger ? 'text-white opacity-80 active:opacity-100 active:bg-gray-700' : '',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}
