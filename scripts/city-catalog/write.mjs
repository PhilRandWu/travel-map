import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OUTPUT_FILES = [
  'china-north',
  'china-northeast',
  'china-east',
  'china-central',
  'china-south',
  'china-southwest',
  'china-northwest',
  'international-asia',
  'international-europe',
  'international-americas',
  'international-africa',
  'international-oceania',
]

export async function writeCatalog(entries, root) {
  const directory = join(root, 'src/data/cities')
  await mkdir(directory, { recursive: true })

  for (const file of OUTPUT_FILES) {
    const data = entries
      .filter((item) => item.file === file)
      .map((item) => item.entry)
      .sort((a, b) =>
        b.priority - a.priority
        || a.city.name.localeCompare(b.city.name, 'zh-CN'))
    await writeFile(
      join(directory, `${file}.json`),
      `${JSON.stringify(data, null, 2)}\n`,
    )
  }
}
