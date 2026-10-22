import type { PhotoVariant } from '@/types'

const VARIANT_FILES: Record<PhotoVariant, string> = {
  blur: 'blur.webp',
  sm: 'thumb-sm.webp',
  md: 'thumb-md.webp',
  preview: 'preview.webp',
}

const segment = (value: string) => encodeURIComponent(value)

export function photoVariantUrl(
  visitId: string,
  file: string,
  variant: PhotoVariant,
): string {
  const base = import.meta.env.BASE_URL
  return `${base}media/${segment(visitId)}/${segment(file)}/${VARIANT_FILES[variant]}`
}

export function photoOriginalUrl(visitId: string, file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}photos/${segment(visitId)}/${segment(file)}`
}

export function photoObjectPosition(
  focalPoint?: { x: number; y: number },
): string {
  if (!focalPoint) return '50% 50%'
  return `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
}
