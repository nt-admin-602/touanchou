import { useEffect, useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { CANVAS_TEMPLATES, CANVAS_LIMITS } from '../config/canvas'
import type { DraftBackup } from '../types'

export function NewDesignScreen() {
  const { goToEditor, goToList, checkDraft, restoreDraft, discardDraft } = useDesignStore()
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [error, setError] = useState('')
  const [draftBackup, setDraftBackup] = useState<DraftBackup | null>(null)

  useEffect(() => {
    checkDraft().then(backup => {
      if (backup) setDraftBackup(backup)
    })
  }, [checkDraft])

  function handleTemplate(widthMm: number, heightMm: number) {
    goToEditor(widthMm, heightMm)
  }

  function handleCustom() {
    const w = Number(customW)
    const h = Number(customH)
    const { minMm, maxMm } = CANVAS_LIMITS
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      setError('幅と高さを正の数値で入力してください')
      return
    }
    if (w < minMm || h < minMm) {
      setError(`最小値は ${minMm}mm です`)
      return
    }
    if (w > maxMm || h > maxMm) {
      setError(`最大値は ${maxMm}mm です`)
      return
    }
    setError('')
    goToEditor(w, h)
  }

  const S = CANVAS_TEMPLATES.S
  const M = CANVAS_TEMPLATES.M

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 gap-8">

      {/* ドラフト復元ダイアログ */}
      {draftBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-lg mb-2">前回の作業を復元しますか？</h2>
            <p className="text-gray-400 text-sm mb-1">
              「{draftBackup.document.name || '未保存の図案'}」
            </p>
            <p className="text-gray-500 text-xs mb-5">
              {new Date(draftBackup.updatedAt).toLocaleString('ja-JP')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => restoreDraft(draftBackup)}
                className="flex-1 py-3 bg-blue-600 rounded-xl font-bold active:bg-blue-700"
              >
                復元する
              </button>
              <button
                onClick={async () => { await discardDraft(); setDraftBackup(null) }}
                className="flex-1 py-3 bg-gray-700 rounded-xl active:bg-gray-600 text-gray-300"
              >
                破棄する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-widest mb-1">灯案帳</h1>
        <p className="text-gray-400 text-sm">トルコランプ図案作成</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-sm text-gray-400 text-center">キャンバスサイズを選択</p>

        <button
          onClick={() => handleTemplate(S.widthMm, S.heightMm)}
          className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-2xl text-left px-5 transition-colors border border-gray-700"
        >
          <span className="block font-bold text-lg">S サイズ</span>
          <span className="block text-gray-400 text-sm mt-0.5">{S.widthMm} × {S.heightMm} mm</span>
        </button>

        <button
          onClick={() => handleTemplate(M.widthMm, M.heightMm)}
          className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-2xl text-left px-5 transition-colors border border-gray-700"
        >
          <span className="block font-bold text-lg">M サイズ</span>
          <span className="block text-gray-400 text-sm mt-0.5">{M.widthMm} × {M.heightMm} mm</span>
        </button>

        <div className="bg-gray-800 rounded-2xl px-5 py-4 border border-gray-700">
          <span className="block font-bold text-lg mb-3">自由入力</span>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">幅 (mm)</label>
              <input
                type="number"
                inputMode="numeric"
                value={customW}
                onChange={e => setCustomW(e.target.value)}
                placeholder="例: 150"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-base border border-gray-600 focus:outline-none focus:border-blue-400"
              />
            </div>
            <span className="text-gray-500 mt-5">×</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">高さ (mm)</label>
              <input
                type="number"
                inputMode="numeric"
                value={customH}
                onChange={e => setCustomH(e.target.value)}
                placeholder="例: 100"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-base border border-gray-600 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button
            onClick={handleCustom}
            className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl font-medium transition-colors"
          >
            作成
          </button>
        </div>

        {/* 保存済み図案を開く */}
        <button
          onClick={goToList}
          className="w-full py-4 bg-transparent border border-gray-600 rounded-2xl text-gray-300 active:bg-gray-800 transition-colors text-sm font-medium"
        >
          保存済み図案を開く
        </button>
      </div>
    </div>
  )
}
