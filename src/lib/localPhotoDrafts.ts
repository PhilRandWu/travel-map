const drafts = new Map<string, string>()

function key(visitId: string, file: string): string {
  return `${visitId}/${file}`
}

/** 拖入编辑器的照片只在当前会话可预览，直到用户把它们放进 public/photos。 */
export function registerLocalPhotoDraft(
  visitId: string,
  file: string,
  source: Blob,
): string | undefined {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return undefined
  }

  const entryKey = key(visitId, file)
  const previous = drafts.get(entryKey)
  if (previous) URL.revokeObjectURL(previous)

  const url = URL.createObjectURL(source)
  drafts.set(entryKey, url)
  return url
}

export function localPhotoUrl(visitId: string, file: string): string | undefined {
  return drafts.get(key(visitId, file))
}

export function hasLocalPhotoDraft(visitId: string, file: string): boolean {
  return drafts.has(key(visitId, file))
}

export function unregisterLocalPhotoDraft(visitId: string, file: string): void {
  const entryKey = key(visitId, file)
  const previous = drafts.get(entryKey)
  if (!previous) return
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(previous)
  }
  drafts.delete(entryKey)
}
