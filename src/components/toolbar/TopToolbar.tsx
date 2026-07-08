import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { MenuModal } from '../modals/MenuModal'

export function TopToolbar() {
  const { undo, redo, undoStack, redoStack, saveCurrentDesign, isDirty, designName } = useDesignStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await saveCurrentDesign()
    setSaving(false)
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 h-12 bg-gray-900 text-white shrink-0">
        <button
          onClick={() => setMenuOpen(true)}
          className="text-base font-bold tracking-wide active:opacity-70"
        >
          灯案帳
        </button>
        <div className="flex items-center gap-1">
          {designName ? (
            <span className="text-xs text-gray-400 max-w-28 truncate mr-1">{designName}{isDirty ? ' *' : ''}</span>
          ) : null}
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded text-lg active:bg-gray-700 disabled:opacity-50"
            title="保存"
          >{saving ? '…' : '💾'}</button>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded text-lg active:bg-gray-700"
            title="メニュー"
          >☰</button>
        </div>
      </div>
      {menuOpen && <MenuModal onClose={() => setMenuOpen(false)} />}
    </>
  )
}
