import { GLASS_COLORS } from '../../config/colors'
import { useDesignStore } from '../../store/useDesignStore'
import { useDragScroll } from '../../utils/useDragScroll'
import type { ShapeType } from '../../types'

const SHAPES: ShapeType[] = ['diamond', 'triangle', 'square']

export function BottomPalette() {
  const {
    selectedIds, items,
    pendingShape, pendingColorId,
    setPendingShape, setPendingColor,
    changeSelectedColor, changeSelectedShape,
    selectMode, setSelectMode,
    snapEnabled, setSnapEnabled,
    deleteSelected, startDuplicate, startMirror, startPattern, startRadial,
  } = useDesignStore()

  const toolRowDrag = useDragScroll<HTMLDivElement>()
  const colorRowDrag = useDragScroll<HTMLDivElement>()

  const hasSelection = selectedIds.length > 0
  const firstSelected = hasSelection ? items.find(i => i.id === selectedIds[0]) : undefined
  const activeColorId = firstSelected?.colorId ?? pendingColorId
  const activeShape = firstSelected?.shape ?? pendingShape

  const handleColorTap = (colorId: string) => {
    if (hasSelection) changeSelectedColor(colorId)
    setPendingColor(colorId)
  }

  const handleShapeTap = (shape: ShapeType) => {
    if (hasSelection) {
      changeSelectedShape(shape)
    } else {
      setPendingShape(shape)
      setSelectMode(false)  // 形状選択時は配置モードに戻す
    }
  }

  return (
    <div className="shrink-0 bg-gray-900 pb-safe">
      {/* 1段目: 選択モード + 編集ツール + 削除（横スクロール、PCはマウスドラッグでも可） */}
      <div
        ref={toolRowDrag.ref}
        onPointerDown={toolRowDrag.onPointerDown}
        onPointerMove={toolRowDrag.onPointerMove}
        onPointerUp={toolRowDrag.onPointerUp}
        onPointerLeave={toolRowDrag.onPointerLeave}
        onPointerCancel={toolRowDrag.onPointerCancel}
        onClickCapture={toolRowDrag.onClickCapture}
        className="flex items-center gap-2 px-3 pt-2 pb-1 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {/* 選択モードトグル */}
        <button
          onClick={() => setSelectMode(!selectMode)}
          title={selectMode ? '配置モードに切替' : '選択モードに切替'}
          className={[
            'shrink-0 px-3 py-2 rounded-lg border transition-colors text-xl',
            selectMode
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-gray-700 border-gray-600 text-gray-200 active:bg-gray-600',
          ].join(' ')}
        >
          ☝
        </button>

        {/* 1mmグリッド吸着トグル */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          title={snapEnabled ? '1mm吸着オフに切替' : '1mm吸着オンに切替'}
          className={[
            'shrink-0 px-3 py-2 rounded-lg border transition-colors text-xl',
            snapEnabled
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-gray-700 border-gray-600 text-gray-200 active:bg-gray-600',
          ].join(' ')}
        >
          🧲
        </button>

        <div className="w-px self-stretch bg-gray-700 shrink-0" />

        {/* 編集ツール（ガラス選択時のみ有効） */}
        <ToolBtn icon="⧉" label="複製" disabled={!hasSelection} onClick={startDuplicate} />
        <ToolBtn icon="⇋" label="鏡像配置" disabled={!hasSelection} onClick={startMirror} />
        <ToolBtn icon="⋯" label="連続配置" disabled={!hasSelection} onClick={startPattern} />
        <ToolBtn icon="✳" label="放射対称" disabled={!hasSelection} onClick={startRadial} />

        <div className="w-px self-stretch bg-gray-700 shrink-0" />

        {/* 削除は誤操作しにくいよう右端に配置 */}
        <ToolBtn icon="🗑" label="削除" danger disabled={!hasSelection} onClick={deleteSelected} />
      </div>

      {/* 2段目: 形状パレット */}
      <div className="flex gap-2 px-3 pt-1 pb-1">
        {SHAPES.map(shape => (
          <button
            key={shape}
            onClick={() => handleShapeTap(shape)}
            className={[
              'flex-1 py-2 rounded-lg border transition-colors',
              activeShape === shape && !selectMode
                ? 'bg-blue-500 border-blue-400 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-200 active:bg-gray-600',
            ].join(' ')}
          >
            <ShapeIcon shape={shape} selected={activeShape === shape && !selectMode} />
          </button>
        ))}
      </div>

      {/* 3段目: 色パレット（横スクロール、PCはマウスドラッグでも可） */}
      <div
        ref={colorRowDrag.ref}
        onPointerDown={colorRowDrag.onPointerDown}
        onPointerMove={colorRowDrag.onPointerMove}
        onPointerUp={colorRowDrag.onPointerUp}
        onPointerLeave={colorRowDrag.onPointerLeave}
        onPointerCancel={colorRowDrag.onPointerCancel}
        onClickCapture={colorRowDrag.onClickCapture}
        className="flex gap-2 px-3 pt-1 pb-3 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {GLASS_COLORS.map(color => (
          <button
            key={color.id}
            onClick={() => handleColorTap(color.id)}
            title={color.label}
            className={[
              'shrink-0 w-9 h-9 rounded-full border-2 transition-transform active:scale-90',
              activeColorId === color.id
                ? 'border-white scale-110 shadow-lg'
                : 'border-gray-600',
            ].join(' ')}
            style={{
              background: color.isMirror
                ? 'linear-gradient(135deg, #e8f0f8 0%, #c0d0e8 40%, #f0f8ff 70%, #a8c0d8 100%)'
                : color.fill,
              opacity: color.opacity < 0.4 ? 0.6 : 1,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ShapeIcon({ shape, selected }: { shape: ShapeType; selected: boolean }) {
  const fill = selected ? 'white' : '#9ca3af'
  const size = 28

  switch (shape) {
    case 'diamond':
      return (
        <svg viewBox="-1 -1 2 2" width={size} height={size} className="mx-auto">
          <polygon points="0,-0.85 0.6,0 0,0.85 -0.6,0" fill={fill} />
        </svg>
      )
    case 'triangle':
      return (
        <svg viewBox="-1 -1 2 2" width={size} height={size} className="mx-auto">
          <polygon points="0,-0.85 0.75,0.6 -0.75,0.6" fill={fill} />
        </svg>
      )
    case 'square':
      return (
        <svg viewBox="-1 -1 2 2" width={size} height={size} className="mx-auto">
          <rect x="-0.7" y="-0.7" width="1.4" height="1.4" fill={fill} />
        </svg>
      )
  }
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
        'shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-xl border transition-colors',
        disabled ? 'opacity-30 bg-gray-800 border-gray-700 text-gray-400' : '',
        !disabled && active ? 'bg-blue-500 border-blue-400 text-white' : '',
        !disabled && !active && danger ? 'bg-gray-700 border-gray-600 text-red-400 active:bg-gray-600' : '',
        !disabled && !active && !danger ? 'bg-gray-700 border-gray-600 text-gray-200 active:bg-gray-600' : '',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}
