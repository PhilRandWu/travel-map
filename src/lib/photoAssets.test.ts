import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'

const root = fileURLToPath(new URL('../..', import.meta.url))
const mediaRoot = join(root, 'public/media')
const data = JSON.parse(
  readFileSync(join(root, 'src/data/trips.json'), 'utf8'),
) as TravelData

describe('build:media', () => {
  it('generates blur, sm, md and preview variants', async () => {
    rmSync(mediaRoot, { recursive: true, force: true })
    mkdirSync(mediaRoot, { recursive: true })
    const stale = join(mediaRoot, 'stale.webp')
    writeFileSync(stale, '')

    execFileSync('node', ['scripts/build-photo-assets.mjs'], {
      cwd: root,
      stdio: 'pipe',
    })

    expect(existsSync(stale)).toBe(false)
    for (const visit of data.visits) {
      for (const photo of visit.photos) {
        const directory = join(mediaRoot, visit.id, photo.file)
        const widths = {
          blur: 32,
          'thumb-sm': 160,
          'thumb-md': 640,
          preview: 1600,
        } as const
        for (const [name, maxWidth] of Object.entries(widths)) {
          const output = join(directory, `${name}.webp`)
          expect(existsSync(output), output).toBe(true)
          const metadata = await sharp(output).metadata()
          expect(metadata.format).toBe('webp')
          expect(metadata.width).toBeGreaterThan(0)
          expect(metadata.width).toBeLessThanOrEqual(maxWidth)
        }
      }
    }
  }, 30_000)
})
