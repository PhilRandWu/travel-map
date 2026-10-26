import type { CityCatalogEntry } from '@/lib/cityCatalog'
import chinaCentral from './china-central.json'
import chinaEast from './china-east.json'
import chinaNorth from './china-north.json'
import chinaNortheast from './china-northeast.json'
import chinaNorthwest from './china-northwest.json'
import chinaSouth from './china-south.json'
import chinaSouthwest from './china-southwest.json'
import internationalAfrica from './international-africa.json'
import internationalAmericas from './international-americas.json'
import internationalAsia from './international-asia.json'
import internationalEurope from './international-europe.json'
import internationalOceania from './international-oceania.json'

export const CITY_CATALOG = [
  ...chinaNorth,
  ...chinaNortheast,
  ...chinaEast,
  ...chinaCentral,
  ...chinaSouth,
  ...chinaSouthwest,
  ...chinaNorthwest,
  ...internationalAsia,
  ...internationalEurope,
  ...internationalAmericas,
  ...internationalAfrica,
  ...internationalOceania,
] as CityCatalogEntry[]
