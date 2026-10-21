import { describe, expect, it } from 'vitest'
import {
  collectSelectedPhotos,
  readPhotoCapturedAt,
} from '@/lib/photoFiles'

function exifJpeg(dateTime: string): Uint8Array {
  const tiff = new ArrayBuffer(64)
  const view = new DataView(tiff)
  const wrote = new Uint8Array(tiff)
  wrote.set([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00])
  view.setUint16(8, 1, true)
  view.setUint16(10, 0x8769, true)
  view.setUint16(12, 4, true)
  view.setUint32(14, 1, true)
  view.setUint32(18, 26, true)
  view.setUint32(22, 0, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 0x9003, true)
  view.setUint16(30, 2, true)
  view.setUint32(32, 20, true)
  view.setUint32(36, 44, true)
  view.setUint32(40, 0, true)
  wrote.set(new TextEncoder().encode(`${dateTime}\0`), 44)

  const payload = new Uint8Array(6 + tiff.byteLength)
  payload.set(new TextEncoder().encode('Exif\0\0'), 0)
  payload.set(new Uint8Array(tiff), 6)
  const jpeg = new Uint8Array(4 + 2 + payload.byteLength + 2)
  jpeg.set([0xff, 0xd8, 0xff, 0xe1], 0)
  new DataView(jpeg.buffer).setUint16(4, payload.byteLength + 2, false)
  jpeg.set(payload, 6)
  jpeg.set([0xff, 0xd9], jpeg.length - 2)
  return jpeg
}

describe('readPhotoCapturedAt', () => {
  it('读取 DateTimeOriginal 并保留本地时间', async () => {
    const bytes = exifJpeg('2025:05:02 09:30:00')
    const file = new File(
      [bytes.buffer as ArrayBuffer],
      '西湖.jpg',
      { type: 'image/jpeg' },
    )

    expect(await readPhotoCapturedAt(file)).toBe('2025-05-02 09:30:00')
  })

  it('没有 EXIF 或不是图片时安全返回 null', async () => {
    const file = new File(['plain text'], 'note.txt', { type: 'text/plain' })
    expect(await readPhotoCapturedAt(file)).toBeNull()
  })
})

describe('collectSelectedPhotos', () => {
  it('只保留图片文件', () => {
    const image = new File(['image'], 'photo.png', { type: 'image/png' })
    const text = new File(['text'], 'note.txt', { type: 'text/plain' })
    const photos = collectSelectedPhotos([image, text])

    expect(photos).toHaveLength(1)
    expect(photos[0].sourcePath).toBe('photo.png')
  })
})
