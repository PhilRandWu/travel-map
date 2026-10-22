#!/usr/bin/env node

import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = join(projectRoot, 'src/data/trips.json')
const photosRoot = join(projectRoot, 'public/photos')
const mediaRoot = join(projectRoot, 'public/media')

const VARIANTS = [
  { name: 'blur', width: 32, quality: 50 },
  { name: 'thumb-sm', width: 160, quality: 72 },
  { name: 'thumb-md', width: 640, quality: 78 },
  { name: 'preview', width: 1600, quality: 82 },
]

const isSafeSegment = (value) =>
  value.length > 0
  && value !== '.'
  && value !== '..'
  && !/[\\/]/.test(value)
  && !value.includes('\0')

function collectJobs(data) {
  if (!data || !Array.isArray(data.visits)) {
    throw new Error('trips.json 缺少 visits 数组')
  }

  const jobs = []
  const errors = []
  for (const visit of data.visits) {
    if (typeof visit?.id !== 'string' || !isSafeSegment(visit.id)) {
      errors.push(`到访 id 非法：${JSON.stringify(visit?.id)}`)
      continue
    }
    if (!Array.isArray(visit.photos)) {
      errors.push(`visit:${visit.id} 缺少 photos 数组`)
      continue
    }
    for (const photo of visit.photos) {
      if (typeof photo?.file !== 'string' || !isSafeSegment(photo.file)) {
        errors.push(`visit:${visit.id} 照片文件名非法：${JSON.stringify(photo?.file)}`)
        continue
      }
      const input = join(photosRoot, visit.id, photo.file)
      jobs.push({
        input,
        outputDirectory: join(mediaRoot, visit.id, photo.file),
        label: relative(projectRoot, input),
      })
    }
  }
  return { jobs, errors }
}

async function buildVariants(job) {
  try {
    await access(job.input)
  } catch {
    throw new Error(`缺少照片文件：${job.label}`)
  }

  await mkdir(job.outputDirectory, { recursive: true })
  for (const variant of VARIANTS) {
    const output = join(job.outputDirectory, `${variant.name}.webp`)
    try {
      await sharp(job.input, { failOn: 'error' })
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: variant.quality, effort: 5 })
        .toFile(output)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`处理失败：${job.label} → ${variant.name}（${message}）`)
    }
  }
}

async function main() {
  const data = JSON.parse(await readFile(dataFile, 'utf8'))
  const { jobs, errors } = collectJobs(data)

  await rm(mediaRoot, { recursive: true, force: true })
  await mkdir(mediaRoot, { recursive: true })

  for (const job of jobs) {
    try {
      await buildVariants(job)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (errors.length > 0) {
    console.error(`✕ 照片资产生成失败：${errors.length} 个问题`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  console.log(`✓ 已生成 ${jobs.length * VARIANTS.length} 个照片派生资产`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`✕ 照片资产生成失败：${message}`)
  process.exitCode = 1
})
