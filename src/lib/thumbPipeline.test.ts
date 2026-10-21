import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'

const root = fileURLToPath(new URL('../..', import.meta.url))
const thumbsRoot = join(root, 'public/thumbs')
const data = JSON.parse(
  readFileSync(join(root, 'src/data/trips.json'), 'utf8'),
) as TravelData

describe('build:thumbs', () => {
  it('清理旧产物并为全部照片生成 WebP 缩略图', async () => {
    rmSync(thumbsRoot, { recursive: true, force: true })
    mkdirSync(thumbsRoot, { recursive: true })
    const staleFile = join(thumbsRoot, 'stale.webp')
    writeFileSync(staleFile, '')

    execFileSync('node', ['scripts/build-thumbs.mjs'], {
      cwd: root,
      stdio: 'pipe',
    })

    expect(existsSync(staleFile)).toBe(false)
    for (const visit of data.visits) {
      for (const photo of visit.photos) {
        const output = join(thumbsRoot, visit.id, `${photo.file}.webp`)
        expect(existsSync(output), output).toBe(true)
        const metadata = await sharp(output).metadata()
        expect(metadata.format).toBe('webp')
        expect(metadata.width).toBeLessThanOrEqual(480)
      }
    }
  })
})
