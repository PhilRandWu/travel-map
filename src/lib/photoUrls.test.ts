import { describe, expect, it } from 'vitest'
import { photoThumbUrl, photoUrl } from '@/lib/derive'

describe('photo URLs', () => {
  it('原图保留在 photos 目录', () => {
    expect(photoUrl('v001', '01.jpg')).toBe('/photos/v001/01.jpg')
  })

  it('缩略图使用追加 .webp 的生成路径', () => {
    expect(photoThumbUrl('v001', '01.jpg')).toBe('/thumbs/v001/01.jpg.webp')
  })
})
