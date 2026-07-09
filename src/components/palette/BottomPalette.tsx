import { GLASS_COLORS } from '../../config/colors'
import { useDesignStore } from '../../store/useDesignStore'
import type { ShapeType } from '../../types'

const SHAPES: ShapeType[] = ['diamond', 'triangle', 'square']

export function BottomPalette() {
  const {
    selectedIds, items,
    pendingShape, pendingColorId,
    setPendingShape, setPendingColor,
    changeSelectedColor, changeSelectedShape,
    selectMode, setSelectMode,
  } = useDesignStore()

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
      {/* 形状パレット */}
      <div className="flex gap-2 px-3 pt-2 pb-1">
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
        {/* 選択モードトグル */}
        <button
          onClick={() => setSelectMode(!selectMode)}
          title={selectMode ? '配置モードに切替' : '選択モードに切替'}
          className={[
            'px-3 py-2 rounded-lg border transition-colors text-xl',
            selectMode
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-gray-700 border-gray-600 text-gray-200 active:bg-gray-600',
          ].join(' ')}
        >
          ☝
        </button>
      </div>

      {/* 色パレット（横スクロール）*/}
      <div className="flex gap-2 px-3 pt-1 pb-3 overflow-x-auto no-scrollbar">
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
