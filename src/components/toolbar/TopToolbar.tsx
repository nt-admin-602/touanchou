export function TopToolbar() {
  return (
    <div className="flex items-center justify-between px-3 h-12 bg-gray-900 text-white shrink-0">
      <span className="text-base font-bold tracking-wide">灯案帳</span>
      <div className="flex gap-1">
        {/* Phase 2以降で有効化 */}
        <button disabled className="p-2 rounded opacity-30 text-lg" title="Undo">↩</button>
        <button disabled className="p-2 rounded opacity-30 text-lg" title="Redo">↪</button>
        <button disabled className="p-2 rounded opacity-30 text-lg" title="保存">💾</button>
        <button disabled className="p-2 rounded opacity-30 text-lg" title="メニュー">☰</button>
      </div>
    </div>
  )
}
