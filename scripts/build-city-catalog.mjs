import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildChinaCatalog } from './city-catalog/china.mjs'
import { buildInternationalCatalog } from './city-catalog/international.mjs'
import { validateCatalog } from './city-catalog/validate.mjs'
import { writeCatalog } from './city-catalog/write.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, 'node_modules/.cache/travel-map/city-catalog')

async function main() {
  process.stdout.write('· building China city catalog… ')
  const china = await buildChinaCatalog(cacheDir)
  console.log(`${china.length} entries`)

  process.stdout.write('· building international city catalog… ')
  const international = await buildInternationalCatalog(cacheDir)
  console.log(`${international.length} entries`)

  const entries = [...china, ...international]
  validateCatalog(entries)
  await writeCatalog(entries, root)
  console.log(`✓ city catalog written: ${entries.length} entries`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
