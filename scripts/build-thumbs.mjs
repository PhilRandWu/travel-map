#!/usr/bin/env node

import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = join(projectRoot, 'src/data/trips.json')
const photosRoot = join(projectRoot, 'public/photos')
const thumbsRoot = join(projectRoot, 'public/thumbs')
const thumbWidth = 480
const webpQuality = 78

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
        errors.push(`visit:${visit.id} 的照片文件名非法：${JSON.stringify(photo?.file)}`)
        continue
      }
      const input = join(photosRoot, visit.id, photo.file)
      jobs.push({
        input,
        output: join(thumbsRoot, visit.id, `${photo.file}.webp`),
        label: relative(projectRoot, input),
      })
    }
  }
  return { jobs, errors }
}

async function buildThumb(job) {
  try {
    await access(job.input)
  } catch {
    throw new Error(`缺少照片文件：${job.label}`)
  }

  await mkdir(dirname(job.output), { recursive: true })
  try {
    await sharp(job.input, { failOn: 'error' })
      .rotate()
      .resize({ width: thumbWidth, withoutEnlargement: true })
      .webp({ quality: webpQuality, effort: 5 })
      .toFile(job.output)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`不支持的图片或处理失败：${job.label}（${message}）`)
  }
}

async function main() {
  let data
  try {
    data = JSON.parse(await readFile(dataFile, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`无法读取 ${relative(projectRoot, dataFile)}：${message}`)
  }
  const { jobs, errors } = collectJobs(data)

  await rm(thumbsRoot, { recursive: true, force: true })
  await mkdir(thumbsRoot, { recursive: true })

  for (const job of jobs) {
    try {
      await buildThumb(job)
    } catch (error) {
      errors.push(error.message)
    }
  }

  if (errors.length > 0) {
    console.error(`✕ 缩略图生成失败：${errors.length} 个问题`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  console.log(`✓ 已生成 ${jobs.length} 张 WebP 缩略图（宽 ≤ ${thumbWidth}px）`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`✕ 缩略图生成失败：${message}`)
  process.exitCode = 1
})
