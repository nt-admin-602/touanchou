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
      // FloatingTools は画面全体（root要素）基準の position: absolute のため、
      // window絶対座標である viewport.panY をそのまま使う
      // （CanvasRoot 内の -48 コンテナ補正はここでは不要かつ誤り）。
      const sx = xMm * viewport.zoom + viewport.panX
      const sy = yMm * viewport.zoom + viewport.panY
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
    const cy = (minY + maxY) / 2

    const sw = window.innerWidth
    const sh = window.innerHeight
    const screenLeft = 4
    const screenRight = sw - PANEL_W - 4
    const screenTop = TOOLBAR_H + 4
    const screenBottom = sh - PALETTE_H - 4
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

    // 対象範囲（選択ガラス＋仮配置プレビュー＋中心点/軸）の外側に候補位置を作り、
    // 画面内に完全に収まるものを優先的に選ぶ（上→下→右→左）。
    // 上下候補は Y 方向で、左右候補は X 方向で範囲の外に出るため、
    // 画面内に収まっている時点で対象範囲とは重ならないことが保証される。
    const candidates = [
      { x: clamp(cx - PANEL_W / 2, screenLeft, screenRight), y: minY - PANEL_H - 12 },
      { x: clamp(cx - PANEL_W / 2, screenLeft, screenRight), y: maxY + 12 },
      { x: maxX + 12, y: clamp(cy - PANEL_H / 2, screenTop, screenBottom) },
      { x: minX - PANEL_W - 12, y: clamp(cy - PANEL_H / 2, screenTop, screenBottom) },
    ]
    const fitsScreen = (p: { x: number; y: number }) =>
      p.x >= screenLeft && p.x <= screenRight && p.y >= screenTop && p.y <= screenBottom

    const best = candidates.find(fitsScreen) ?? {
      x: clamp(candidates[0].x, screenLeft, screenRight),
      y: clamp(candidates[0].y, screenTop, screenBottom),
    }

    setPos(best)
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
