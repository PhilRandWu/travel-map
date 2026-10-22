import { describe, expect, it } from 'vitest'
import {
  photoObjectPosition,
  photoOriginalUrl,
  photoVariantUrl,
} from '@/lib/photoUrls'

describe('photo URLs', () => {
  it('映射全部派生资产到 media 目录', () => {
    expect(photoVariantUrl('v001', '01 西湖.svg', 'sm'))
      .toBe('/media/v001/01%20%E8%A5%BF%E6%B9%96.svg/thumb-sm.webp')
    expect(photoVariantUrl('v001', '01.svg', 'md'))
      .toBe('/media/v001/01.svg/thumb-md.webp')
    expect(photoVariantUrl('v001', '01.svg', 'preview'))
      .toBe('/media/v001/01.svg/preview.webp')
    expect(photoVariantUrl('v001', '01.svg', 'blur'))
      .toBe('/media/v001/01.svg/blur.webp')
  })

  it('原图仍保留在 photos 目录', () => {
    expect(photoOriginalUrl('v001', '01.svg')).toBe('/photos/v001/01.svg')
  })

  it('焦点坐标转换为 object-position', () => {
    expect(photoObjectPosition({ x: 0.25, y: 0.75 })).toBe('25% 75%')
    expect(photoObjectPosition(undefined)).toBe('50% 50%')
  })
})
