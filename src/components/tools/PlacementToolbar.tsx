import { useDesignStore } from '../../store/useDesignStore'
import type { MirrorAxis, PatternDirection } from '../../types'

const AXIS_LABELS: Record<MirrorAxis, string> = {
  'horizontal':    '上下',
  'vertical':      '左右',
  'diagonal-fwd':  '↗↙',
  'diagonal-bwd':  '↘↖',
}

const DIR_GRID: (PatternDirection | null)[][] = [
  ['ul', 'up',   'ur'],
  ['left', null, 'right'],
  ['ll', 'down', 'lr'],
]
const DIR_ICONS: Record<PatternDirection, string> = {
  ul: '↖', up: '↑', ur: '↗',
  left: '←', right: '→',
  ll: '↙', down: '↓', lr: '↘',
}

export function PlacementToolbar() {
  const {
    activeTool,
    mirrorAxis, setMirrorAxis,
    radialCount, setRadialCount,
    patternDirection, setPatternDirection,
    patternRepeatCount, setPatternRepeatCount,
    patternGapMm, setPatternGapMm,
    confirmPlacement, cancelPlacement,
  } = useDesignStore()

  if (activeTool === 'none') return null

  const TITLE: Record<string, string> = {
    duplicate: '複製', mirror: '鏡像配置', radial: '放射対称', pattern: '連続配置',
  }

  return (
    <div className="shrink-0 bg-gray-950 border-t border-gray-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-white font-bold text-sm">{TITLE[activeTool] ?? ''}</span>
      </div>

      {/* ツール固有コントロール */}
      <div className="px-3 pb-2">
        {/* 複製: キャンバスをドラッグして位置調整 */}
        {activeTool === 'duplicate' && (
          <p className="text-gray-400 text-xs text-center py-1">
            キャンバスをドラッグして位置を調整
          </p>
        )}

        {/* 鏡像: 軸選択 */}
        {activeTool === 'mirror' && (
          <div className="flex gap-2">
            {(Object.keys(AXIS_LABELS) as MirrorAxis[]).map(axis => (
              <button
                key={axis}
                onClick={() => setMirrorAxis(axis)}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-medium border',
                  mirrorAxis === axis
                    ? 'bg-blue-500 border-blue-400 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-300 active:bg-gray-700',
                ].join(' ')}
              >
                {AXIS_LABELS[axis]}
              </button>
            ))}
          </div>
        )}

        {/* 放射対称: 展開数 */}
        {activeTool === 'radial' && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-400 text-xs">展開数</span>
            <div className="flex items-center gap-2">
              <button
                data-sound="step"
                onClick={() => setRadialCount(radialCount - 1)}
                className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
              >−</button>
              <span className="w-8 text-white text-center font-bold">{radialCount}</span>
              <button
                data-sound="step"
                onClick={() => setRadialCount(radialCount + 1)}
                className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
              >＋</button>
            </div>
          </div>
        )}

        {/* 連続配置: 方向パッド + 繰り返し数 + マージン */}
        {activeTool === 'pattern' && (
          <div className="flex flex-wrap items-center gap-4">
            {/* 方向パッド */}
            <div className="grid grid-cols-3 gap-1">
              {DIR_GRID.map((row, ri) =>
                row.map((dir, ci) =>
                  dir ? (
                    <button
                      key={dir}
                      onClick={() => setPatternDirection(dir)}
                      className={[
                        'w-10 h-10 rounded-lg text-lg font-bold border',
                        patternDirection === dir
                          ? 'bg-blue-500 border-blue-400 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-300 active:bg-gray-700',
                      ].join(' ')}
                    >
                      {DIR_ICONS[dir]}
                    </button>
                  ) : (
                    <div key={`empty-${ri}-${ci}`} className="w-10 h-10" />
                  )
                )
              )}
            </div>
            {/* 繰り返し数 */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-400 text-xs">繰り返し</span>
              <div className="flex items-center gap-2">
                <button
                  data-sound="step"
                  onClick={() => setPatternRepeatCount(patternRepeatCount - 1)}
                  className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
                >−</button>
                <span className="w-6 text-white text-center font-bold">{patternRepeatCount}</span>
                <button
                  data-sound="step"
                  onClick={() => setPatternRepeatCount(patternRepeatCount + 1)}
                  className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
                >＋</button>
              </div>
            </div>
            {/* マージン（目地幅） */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-400 text-xs">マージン(mm)</span>
              <div className="flex items-center gap-2">
                <button
                  data-sound="step"
                  onClick={() => setPatternGapMm(patternGapMm - 1)}
                  className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
                >−</button>
                <span className="w-6 text-white text-center font-bold">{patternGapMm}</span>
                <button
                  data-sound="step"
                  onClick={() => setPatternGapMm(patternGapMm + 1)}
                  className="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold border border-gray-600 active:bg-gray-700"
                >＋</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 確定 / キャンセル */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={cancelPlacement}
          className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-200 font-medium active:bg-gray-600"
        >
          キャンセル
        </button>
        <button
          onClick={confirmPlacement}
          className="flex-1 py-3 rounded-xl font-bold bg-blue-500 text-white active:bg-blue-400"
        >
          確定
        </button>
      </div>
    </div>
  )
}
