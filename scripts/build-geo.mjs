/**
 * 离线边界数据构建脚本（运行一次，产物提交到 public/geo）
 *
 * 产物：
 *   public/geo/china-cities.topojson   中国地级市/直辖市边界（点中国境内反查城市名）
 *   public/geo/countries.topojson      世界国家边界（点境外反查国家名，含中文名）
 *
 * 数据源：
 *   中国 —— 阿里 DataV 行政区域（省 _full 内含地级市）
 *   世界 —— world-atlas 包（Natural Earth），中文名取自 world-countries 包
 *
 * 用法：node scripts/build-geo.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { quantize, feature } from 'topojson-client'
import { presimplify, simplify } from 'topojson-simplify'
import rewind from '@mapbox/geojson-rewind'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/geo')
const DATAV = 'https://geo.datav.aliyun.com/areas_v3/bound'

// 直辖市 / 港澳台：直接用省级多边形，不下钻到区县
const MUNICIPALITIES = new Set(['110000', '120000', '310000', '500000', '710000', '810000', '820000'])
// 其余省级行政区：下载 _full 获取地级市中心
const PROVINCES = [
  '130000', '140000', '150000', '210000', '220000', '230000',
  '320000', '330000', '340000', '350000', '360000', '370000',
  '410000', '420000', '430000', '440000', '450000', '460000',
  '510000', '520000', '530000', '540000', '610000', '620000',
  '630000', '640000', '650000',
]

async function fetchJson(url, label) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`)
  return res.json()
}

async function buildChina() {
  process.stdout.write('· 下载中国省级边界… ')
  const national = await fetchJson(`${DATAV}/100000_full.json`, '100000_full')
  const provinceFeatures = national.features
  const provinceName = new Map(provinceFeatures.map((f) => [String(f.properties.adcode), f.properties.name]))

  // 直辖市 / 港澳台：取省级 feature
  const merged = provinceFeatures
    .filter((f) => MUNICIPALITIES.has(String(f.properties.adcode)))
    .map((f) => ({
      type: 'Feature',
      properties: {
        adcode: f.properties.adcode,
        name: f.properties.name,
        province: f.properties.name,
        level: 'province',
      },
      geometry: f.geometry,
    }))

  // 省内地级市：限并发下载
  const queue = [...PROVINCES]
  const workers = await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const code = queue.shift()
        try {
          const data = await fetchJson(`${DATAV}/${code}_full.json`, code)
          for (const f of data.features) {
            merged.push({
              type: 'Feature',
              properties: {
                adcode: f.properties.adcode,
                name: f.properties.name,
                province: provinceName.get(code) ?? '',
                level: 'city',
              },
              geometry: f.geometry,
            })
          }
          process.stdout.write(`✓${code} `)
        } catch (err) {
          process.stdout.write(`✗${code}(${err.message}) `)
        }
      }
    }),
  )
  await Promise.all(workers)
  process.stdout.write('\n')

  const fc = { type: 'FeatureCollection', features: merged }
  // 注意：rewind 必须在 simplify 之后做 —— simplify 会翻转/破坏部分环方向
  let topo = simplify(presimplify(topology({ regions: fc })), 0.00035)
  const simpleFc = feature(topo, topo.objects.regions)
  // DataV 环方向与 GeoJSON 规范相反 + 修复 simplify 造成的方向问题，统一外环 CW
  simpleFc.features.forEach((f) => rewind(f, true))
  // 重新拓扑量化：移除 presimplify 注入的 z 权重并压缩坐标
  topo = quantize(topology({ regions: simpleFc }), 1e5)
  return topo
}

function buildCountries() {
  process.stdout.write('· 处理世界国家边界（world-atlas 110m）…\n')
  // 关键：必须用 110m 原始数据、不做 simplify/quantize/rewind。
  // 实测任何几何重处理（尤其 topology 往返与 quantize）都会损坏跨 180° 经线的
  // 多边形（俄罗斯、法属波利尼西亚），使其球面包含判断翻转成"包含全球"。
  // 110m 虽只含 177 个几何（缺微型岛国），但 gzip 仅 ~38KB 且球面判断全部正确。
  const atlas = require('world-atlas/countries-110m.json')
  const worldCountries = require('world-countries')
  // ccn3（数字代码）→ 中文常用名
  const zhName = new Map(worldCountries.map((c) => [c.ccn3, c.translations.zho?.common ?? c.name.common]))

  for (const geom of atlas.objects.countries.geometries) {
    geom.properties = { name: zhName.get(String(geom.id)) ?? geom.properties?.name ?? `区域 ${geom.id}` }
  }
  return atlas
}

const kb = (n) => `${(n / 1024).toFixed(0)}KB`

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const china = await buildChina()
  const chinaPath = join(OUT_DIR, 'china-cities.topojson')
  await writeFile(chinaPath, JSON.stringify(china))
  console.log(`  → china-cities.topojson ${kb((await import('node:fs')).statSync(chinaPath).size)}，${china.objects.regions.geometries.length} 个区域`)

  const countries = buildCountries()
  const countriesPath = join(OUT_DIR, 'countries.topojson')
  await writeFile(countriesPath, JSON.stringify(countries))
  console.log(`  → countries.topojson ${kb((await import('node:fs')).statSync(countriesPath).size)}，${countries.objects.countries.geometries.length} 个国家`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
