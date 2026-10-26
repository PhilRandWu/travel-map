import type { TravelData } from '@/types'
import {
  registerLocalPhotoDraft,
  unregisterLocalPhotoDraft,
} from '@/lib/localPhotoDrafts'

const DB_NAME = 'travel-map-editor'
const DB_VERSION = 1
const STORE_NAME = 'photos'

interface StoredPhoto {
  key: string
  visitId: string
  file: string
  blob: Blob
  updatedAt: number
}

let databasePromise: Promise<IDBDatabase | null> | null = null

const photoKey = (visitId: string, file: string) => `${visitId}/${file}`

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return databasePromise
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function readAllPhotos(database: IDBDatabase): Promise<StoredPhoto[]> {
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const done = transactionDone(transaction)
    const request = transaction.objectStore(STORE_NAME).getAll()
    const rows = await new Promise<StoredPhoto[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredPhoto[])
      request.onerror = () => reject(request.error)
    })
    await done
    return rows
  } catch {
    return []
  }
}

/** 照片本体存 IndexedDB；JSON 只保留文件名，刷新时再恢复为对象 URL。 */
export async function storeLocalPhoto(
  visitId: string,
  file: string,
  blob: Blob,
): Promise<boolean> {
  const database = await openDatabase()
  if (!database) return false

  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({
      key: photoKey(visitId, file),
      visitId,
      file,
      blob,
      updatedAt: Date.now(),
    } satisfies StoredPhoto)
    await transactionDone(transaction)
    return true
  } catch {
    return false
  }
}

export async function hydrateStoredPhotos(): Promise<number> {
  const database = await openDatabase()
  if (!database) return 0

  const photos = await readAllPhotos(database)
  for (const photo of photos) {
    registerLocalPhotoDraft(photo.visitId, photo.file, photo.blob)
  }
  return photos.length
}

/** 删除已不在旅行数据中的浏览器照片，避免 IndexedDB 长期堆积。 */
export async function pruneStoredPhotos(data: TravelData): Promise<number> {
  const database = await openDatabase()
  if (!database) return 0

  const keep = new Set(
    data.visits.flatMap((visit) => visit.photos.map((photo) => photoKey(visit.id, photo.file))),
  )
  const photos = await readAllPhotos(database)
  const orphans = photos.filter((photo) => !keep.has(photo.key))
  if (orphans.length === 0) return 0

  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    for (const photo of orphans) store.delete(photo.key)
    await transactionDone(transaction)
    for (const photo of orphans) {
      unregisterLocalPhotoDraft(photo.visitId, photo.file)
    }
    return orphans.length
  } catch {
    return 0
  }
}
