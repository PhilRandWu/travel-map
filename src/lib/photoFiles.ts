export interface ImportedPhotoFile {
  file: File
  sourcePath: string
}

interface DirectoryReader {
  readEntries: (
    success: (entries: LegacyFileEntry[]) => void,
    error: (error: DOMException) => void,
  ) => void
}

interface LegacyFileEntry {
  isFile: boolean
  isDirectory: boolean
  name: string
  file: (
    success: (file: File) => void,
    error: (error: DOMException) => void,
  ) => void
  createReader: () => DirectoryReader
}

type DataTransferItemWithEntry = Omit<DataTransferItem, 'webkitGetAsEntry'> & {
  webkitGetAsEntry?: () => LegacyFileEntry | null
}

const IMAGE_EXTENSION = /\.(avif|gif|heic|heif|jpe?g|png|tiff?|webp)$/i

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSION.test(file.name)
}

function sourcePathOf(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string })
    .webkitRelativePath
  return relative || file.name
}

function filesFromList(list: FileList | File[]): ImportedPhotoFile[] {
  return Array.from(list)
    .filter(isImage)
    .map((file) => ({ file, sourcePath: sourcePathOf(file) }))
}

function readEntryFile(entry: LegacyFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

function readDirectoryBatch(reader: DirectoryReader): Promise<LegacyFileEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject))
}

async function walkEntry(entry: LegacyFileEntry): Promise<ImportedPhotoFile[]> {
  if (entry.isFile) {
    const file = await readEntryFile(entry)
    return isImage(file) ? [{ file, sourcePath: entry.name }] : []
  }
  if (!entry.isDirectory) return []

  const reader = entry.createReader()
  const nested: LegacyFileEntry[] = []
  while (true) {
    const batch = await readDirectoryBatch(reader)
    if (batch.length === 0) break
    nested.push(...batch)
  }
  const groups = await Promise.all(nested.map(walkEntry))
  return groups.flat()
}

function importKey(item: ImportedPhotoFile): string {
  const { file, sourcePath } = item
  return `${sourcePath}:${file.size}:${file.lastModified}`
}

function deduplicate(items: ImportedPhotoFile[]): ImportedPhotoFile[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = importKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 支持普通多选、目录选择与拖入文件夹；目录会递归扫描。 */
export async function collectDroppedPhotos(
  transfer: DataTransfer,
): Promise<ImportedPhotoFile[]> {
  const entries = Array.from(transfer.items)
    .map((item) => (item as DataTransferItemWithEntry).webkitGetAsEntry?.())
    .filter((entry): entry is LegacyFileEntry => entry !== null && entry !== undefined)

  if (entries.length === 0) return deduplicate(filesFromList(transfer.files))
  const groups = await Promise.all(entries.map(walkEntry))
  return deduplicate(groups.flat())
}

export function collectSelectedPhotos(
  files: FileList | File[],
): ImportedPhotoFile[] {
  return deduplicate(filesFromList(files))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localTimestamp(date: Date): string {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ')
}

/** 只读取元数据块，不让大图进入主线程解码流程。 */
export async function readPhotoCapturedAt(file: File): Promise<string | null> {
  try {
    const exifr = await import('exifr')
    // EXIF 位于文件头；只读首段，避免把超大原图整体载入内存。
    const header = await file.slice(0, 512 * 1024).arrayBuffer()
    const metadata = await exifr.parse(header, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
      reviveValues: true,
    })
    const value = metadata?.DateTimeOriginal
      ?? metadata?.CreateDate
      ?? metadata?.ModifyDate
    return value instanceof Date && !Number.isNaN(value.getTime())
      ? localTimestamp(value)
      : null
  } catch {
    return null
  }
}
