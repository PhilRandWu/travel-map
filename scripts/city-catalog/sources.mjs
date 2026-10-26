import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function readCachedJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function loadJsonSource(url, cacheDir, cacheName) {
  await mkdir(cacheDir, { recursive: true })
  const path = join(cacheDir, cacheName)
  const cached = await readCachedJson(path)
  if (cached) return cached

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`)
  const data = await response.json()
  await writeFile(path, JSON.stringify(data))
  return data
}
