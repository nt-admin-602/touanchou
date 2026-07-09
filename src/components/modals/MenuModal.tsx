import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

type Props = {
  onClose: () => void
}

export function MenuModal({ onClose }: Props) {
  const { designName, setDesignName, goToList, goToNew, saveCurrentDesign, exportJSON, exportPNG, importJSON } = useDesignStore()
  const [exportingPNG, setExportingPNG] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(designName)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameInput(designName)
  }, [designName])

  const handleRename = () => {
    const trimmed = nameInput.trim()
    if (trimmed) setDesignName(trimmed)
    setRenaming(false)
  }

  const handleSave = async () => {
    await saveCurrentDesign()
    onClose()
  }

  const handleExport = () => {
    exportJSON()
    onClose()
  }

  const handleExportPNG = async () => {
    setExportingPNG(true)
    try {
      await exportPNG()
      onClose()
    } finally {
      setExportingPNG(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const result = await importJSON(text)
    if (result.ok) {
      setImportError('')
      onClose()
    } else {
      setImportError(result.error ?? 'インポート失敗')
    }
    e.target.value = ''
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-gray-900 rounded-t-2xl pb-safe shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-700">
          <span className="text-white font-bold text-base">メニュー</span>
          <button onClick={onClose} className="text-gray-400 text-xl px-2">✕</button>
        </div>

        {/* 図案名 */}
        <div className="px-5 py-3 border-b border-gray-800">
          {renaming ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="図案名"
              />
              <button onClick={handleRename} className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-bold">確定</button>
              <button onClick={() => setRenaming(false)} className="text-gray-400 px-3 py-2 text-sm">キャンセル</button>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="flex items-center gap-2 text-left w-full"
            >
              <span className="text-white text-sm flex-1 truncate">{designName || '（未保存）'}</span>
              <span className="text-gray-400 text-sm">✏️ 名前変更</span>
            </button>
          )}
        </div>

        {/* メニュー項目 */}
        <div className="flex flex-col py-1">
          <MenuItem icon="💾" label="保存" onClick={handleSave} />
          <MenuItem icon="📋" label="図案一覧へ戻る" onClick={() => { goToList(); onClose() }} />
          <MenuItem icon="🆕" label="新規作成" onClick={() => { goToNew(); onClose() }} />
          <div className="border-t border-gray-800 my-1" />
          <MenuItem icon="🖼️" label={exportingPNG ? 'PNG書き出し中…' : 'PNGエクスポート'} onClick={handleExportPNG} />
          <MenuItem icon="📤" label="JSONエクスポート" onClick={handleExport} />
          <MenuItem icon="📥" label="JSONインポート" onClick={() => fileInputRef.current?.click()} />
          {importError && (
            <p className="text-red-400 text-xs px-5 pb-2">{importError}</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <div className="h-4" />
      </div>
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3.5 text-white active:bg-gray-800 text-left w-full"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
