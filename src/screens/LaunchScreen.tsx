import { useEffect, useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { UNLIMITED_CANVAS_MM } from '../config/canvas'
import type { DraftBackup } from '../types'

/**
 * アプリ起動時のゲート画面。
 * 未保存の自動バックアップがあれば復元確認を出し、なければ
 * キャンバスサイズを聞かずにそのまま編集画面（実質無制限サイズ）へ進む。
 */
export function LaunchScreen() {
  const { goToEditor, checkDraft, restoreDraft, discardDraft } = useDesignStore()
  const [draftBackup, setDraftBackup] = useState<DraftBackup | null>(null)

  useEffect(() => {
    checkDraft().then(backup => {
      if (backup) {
        setDraftBackup(backup)
      } else {
        goToEditor(UNLIMITED_CANVAS_MM, UNLIMITED_CANVAS_MM)
      }
    })
  }, [checkDraft, goToEditor])

  if (!draftBackup) {
    return <div className="min-h-screen bg-gray-950" />
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
          <h2 className="font-bold text-lg mb-2 text-white">前回の作業を復元しますか？</h2>
          <p className="text-gray-400 text-sm mb-1">
            「{draftBackup.document.name || '未保存の図案'}」
          </p>
          <p className="text-gray-500 text-xs mb-5">
            {new Date(draftBackup.updatedAt).toLocaleString('ja-JP')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => restoreDraft(draftBackup)}
              className="flex-1 py-3 bg-blue-600 rounded-xl font-bold active:bg-blue-700 text-white"
            >
              復元する
            </button>
            <button
              onClick={async () => {
                await discardDraft()
                setDraftBackup(null)
                goToEditor(UNLIMITED_CANVAS_MM, UNLIMITED_CANVAS_MM)
              }}
              className="flex-1 py-3 bg-gray-700 rounded-xl active:bg-gray-600 text-gray-300"
            >
              破棄する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
