import { openDB } from 'idb'
import type { DesignDocument, DesignMeta, DraftBackup, GlassItem } from '../types'

export type StoredDesign = DesignDocument & { thumbnail: string }

const DB_NAME = 'touanchou'
const DB_VERSION = 1

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('designs')) {
      db.createObjectStore('designs', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('draft')) {
      db.createObjectStore('draft', { keyPath: 'id' })
    }
  },
})

export async function saveDesign(doc: StoredDesign): Promise<void> {
  const db = await dbPromise
  await db.put('designs', doc)
}

export async function getDesign(id: string): Promise<StoredDesign | undefined> {
  const db = await dbPromise
  return db.get('designs', id)
}

export async function deleteDesign(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('designs', id)
}

export async function getAllDesigns(): Promise<StoredDesign[]> {
  const db = await dbPromise
  const all = await db.getAll('designs')
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listDesignMetas(): Promise<DesignMeta[]> {
  const all = await getAllDesigns()
  return all.map(({ id, name, thumbnail, canvasWidthMm, canvasHeightMm, createdAt, updatedAt }) => ({
    id, name, thumbnail, canvasWidthMm, canvasHeightMm, createdAt, updatedAt,
  }))
}

export async function duplicateDesign(id: string): Promise<StoredDesign | undefined> {
  const db = await dbPromise
  const original = await db.get('designs', id) as StoredDesign | undefined
  if (!original) return undefined
  const now = new Date().toISOString()
  const copy: StoredDesign = {
    ...original,
    id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${original.name} のコピー`,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('designs', copy)
  return copy
}

export async function renameDesign(id: string, name: string): Promise<void> {
  const db = await dbPromise
  const doc = await db.get('designs', id) as StoredDesign | undefined
  if (!doc) return
  await db.put('designs', { ...doc, name, updatedAt: new Date().toISOString() })
}

// ドラフトバックアップ（undoStack / redoStack を含む）
type StoredDraft = DraftBackup & {
  id: 'current'
  undoStack: GlassItem[][]
  redoStack: GlassItem[][]
}

export async function saveDraft(backup: DraftBackup): Promise<void> {
  const db = await dbPromise
  await db.put('draft', { id: 'current', ...backup })
}

export async function loadDraft(): Promise<DraftBackup | undefined> {
  const db = await dbPromise
  const entry = await db.get('draft', 'current') as StoredDraft | undefined
  if (!entry) return undefined
  const { id: _id, ...backup } = entry
  return backup as DraftBackup
}

export async function clearDraft(): Promise<void> {
  const db = await dbPromise
  await db.delete('draft', 'current')
}
