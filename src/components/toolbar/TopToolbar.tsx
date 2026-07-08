import { useDesignStore } from '../../store/useDesignStore'

export function TopToolbar() {
  const { undo, redo, undoStack, redoStack } = useDesignStore()

  return (
    <div className="flex items-center justify-between px-3 h-12 bg-gray-900 text-white shrink-0">
      <span className="text-base font-bold tracking-wide">灯案帳</span>
      <div className="flex gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-2 rounded text-lg disabled:opacity-30 active:bg-gray-700"
          title="Undo"
        >↩</button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-2 rounded text-lg disabled:opacity-30 active:bg-gray-700"
          title="Redo"
        >↪</button>
        {/* Phase 3 で有効化 */}
        <button disabled className="p-2 rounded opacity-30 text-lg" title="保存">💾</button>
        <button disabled className="p-2 rounded opacity-30 text-lg" title="メニュー">☰</button>
      </div>
    </div>
  )
}
