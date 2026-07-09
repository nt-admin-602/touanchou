import { useEffect, useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { listDesignMetas, deleteDesign, duplicateDesign, getDesign, renameDesign } from '../utils/storage'
import { downloadDesignPNG } from '../utils/pngExport'
import type { DesignMeta } from '../types'

export function DesignListScreen() {
  const { goToNew, openDesign, importJSON } = useDesignStore()
  const [designs, setDesigns] = useState<DesignMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [importError, setImportError] = useState('')
  const [exportingPNGId, setExportingPNGId] = useState<string | null>(null)

  const reload = async () => {
    const list = await listDesignMetas()
    setDesigns(list)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  const handleOpen = async (id: string) => {
    const doc = await getDesign(id)
    if (doc) openDesign(doc)
  }

  const handleDelete = async (id: string) => {
    await deleteDesign(id)
    setMenuId(null)
    reload()
  }

  const handleDuplicate = async (id: string) => {
    await duplicateDesign(id)
    setMenuId(null)
    reload()
  }

  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim()
    if (trimmed) await renameDesign(id, trimmed)
    setRenamingId(null)
    setMenuId(null)
    reload()
  }

  const handleExportFromList = async (id: string) => {
    const doc = await getDesign(id)
    if (!doc) return
    const { thumbnail: _t, ...exportDoc } = doc
    const json = JSON.stringify(exportDoc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMenuId(null)
  }

  const handleExportPNGFromList = async (id: string) => {
    const doc = await getDesign(id)
    if (!doc) return
    setExportingPNGId(id)
    try {
      await downloadDesignPNG(doc.items, doc.canvasWidthMm, doc.canvasHeightMm, doc.name)
    } finally {
      setExportingPNGId(null)
      setMenuId(null)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const result = await importJSON(text)
    if (result.ok) {
      setImportError('')
      reload()
    } else {
      setImportError(result.error ?? 'インポート失敗')
    }
    e.target.value = ''
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 h-12 bg-gray-900 shrink-0">
        <span className="font-bold text-base">図案一覧</span>
        <div className="flex gap-2">
          <label className="p-2 rounded text-xl active:bg-gray-700 cursor-pointer" title="JSONインポート">
            📥
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
          </label>
          <button onClick={goToNew} className="p-2 rounded text-xl active:bg-gray-700" title="新規作成">
            ＋
          </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-900 text-red-200 text-sm px-4 py-2">{importError}</div>
      )}

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">読み込み中…</div>
        ) : designs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-gray-400">
            <p className="text-sm">保存済み図案がありません</p>
            <button
              onClick={goToNew}
              className="bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-bold"
            >
              新規作成
            </button>
          </div>
        ) : (
          <ul>
            {designs.map(design => (
              <li key={design.id} className="border-b border-gray-800">
                {renamingId === design.id ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(design.id)}
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
                    />
                    <button onClick={() => handleRename(design.id)} className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-bold">確定</button>
                    <button onClick={() => setRenamingId(null)} className="text-gray-400 text-sm px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-800" onClick={() => handleOpen(design.id)}>
                    {/* サムネイル */}
                    <div className="shrink-0 w-16 h-16 bg-white rounded-lg overflow-hidden border border-gray-600 flex items-center justify-center">
                      {design.thumbnail ? (
                        <img src={design.thumbnail} alt={design.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-gray-300 text-xs">空</span>
                      )}
                    </div>
                    {/* 情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{design.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{design.canvasWidthMm} × {design.canvasHeightMm} mm</p>
                      <p className="text-gray-500 text-xs mt-0.5">{formatDate(design.updatedAt)}</p>
                    </div>
                    {/* メニューボタン */}
                    <button
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === design.id ? null : design.id) }}
                      className="p-2 text-gray-400 text-lg shrink-0"
                    >
                      ⋯
                    </button>
                  </div>
                )}

                {/* アクションメニュー */}
                {menuId === design.id && (
                  <div className="bg-gray-800 flex flex-wrap gap-1.5 px-4 py-2 border-t border-gray-700">
                    <ActionBtn label="開く" onClick={() => handleOpen(design.id)} />
                    <ActionBtn label="名前変更" onClick={() => { setRenamingId(design.id); setRenameValue(design.name) }} />
                    <ActionBtn label="複製" onClick={() => handleDuplicate(design.id)} />
                    <ActionBtn
                      label={exportingPNGId === design.id ? 'PNG書き出し中…' : 'PNG書き出し'}
                      onClick={() => handleExportPNGFromList(design.id)}
                    />
                    <ActionBtn label="JSON書き出し" onClick={() => handleExportFromList(design.id)} />
                    <ActionBtn label="削除" danger onClick={() => handleDelete(design.id)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 py-2 rounded-lg text-xs font-medium',
        danger ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-200',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
