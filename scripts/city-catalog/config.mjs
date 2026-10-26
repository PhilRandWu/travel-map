export const DATAV_ROOT = 'https://geo.datav.aliyun.com/areas_v3/bound'
export const NATURAL_EARTH_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson'

export const PROVINCE_CODES = [
  '130000', '140000', '150000', '210000', '220000', '230000',
  '320000', '330000', '340000', '350000', '360000', '370000',
  '410000', '420000', '430000', '440000', '450000', '460000',
  '510000', '520000', '530000', '540000', '610000', '620000',
  '630000', '640000', '650000',
]

export const PROVINCE_LEVEL_CODES = [
  '110000', '120000', '310000', '500000', '810000', '820000',
]

export const EXISTING_IDS = {
  北京: 'beijing',
  上海: 'shanghai',
  杭州: 'hangzhou',
  嘉兴: 'jiaxing',
  成都: 'chengdu',
  苏州: 'suzhou',
  广州: 'guangzhou',
  深圳: 'shenzhen',
  西安: 'xian',
  重庆: 'chongqing',
}

export const SPECIAL_CITY_IDS = {
  香港: 'hong-kong',
  澳门: 'macau',
  台北: 'taipei',
  新北: 'new-taipei',
  桃园: 'taoyuan',
  台中: 'taichung',
  台南: 'tainan',
  高雄: 'kaohsiung',
  花莲: 'hualien',
}

export const SPECIAL_PROVINCE_LEVEL_CITIES = {
  810000: { name: '香港', nameEn: 'Hong Kong' },
  820000: { name: '澳门', nameEn: 'Macau' },
}

export const SPECIAL_CITY_ALIASES = {
  香港: ['HK', 'Hong Kong', '香港特别行政区'],
  澳门: ['Macao', 'Macau', '澳门特别行政区'],
}

export const PINYIN_OVERRIDES = {
  厦门: 'xiamen',
  泉州: 'quanzhou',
  长沙: 'changsha',
  长春: 'changchun',
  重庆: 'chongqing',
  六安: 'luan',
  蚌埠: 'bengbu',
}

export const TAIWAN_CITIES = [
  { name: '台北', nameEn: 'Taipei', lat: 25.033, lng: 121.5654, priority: 80 },
  { name: '新北', nameEn: 'New Taipei', lat: 25.0169, lng: 121.4628, priority: 70 },
  { name: '桃园', nameEn: 'Taoyuan', lat: 24.9937, lng: 121.301, priority: 65 },
  { name: '台中', nameEn: 'Taichung', lat: 24.1477, lng: 120.6736, priority: 70 },
  { name: '台南', nameEn: 'Tainan', lat: 22.9999, lng: 120.227, priority: 65 },
  { name: '高雄', nameEn: 'Kaohsiung', lat: 22.6273, lng: 120.3014, priority: 75 },
  { name: '花莲', nameEn: 'Hualien', lat: 23.9911, lng: 121.6112, priority: 60 },
]

export const CURATED_INTERNATIONAL_EXTRAS = [
  'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami',
  'Toronto', 'Vancouver', 'Montreal', 'Sydney', 'Melbourne',
  'Auckland', 'Barcelona', 'Milan', 'Munich', 'Frankfurt',
  'Zurich', 'Istanbul', 'Antalya', 'Dubai', 'Jeddah',
  'Tel Aviv', 'Mumbai', 'Delhi', 'Bengaluru', 'Kolkata',
  'Osaka', 'Kyoto', 'Nagoya', 'Busan', 'Jeju',
  'Ho Chi Minh City', 'Da Nang', 'Chiang Mai', 'Denpasar',
  'Rio de Janeiro', 'São Paulo', 'Cusco', 'Cancún',
  'Cape Town', 'Marrakesh', 'Zanzibar City', 'Nairobi',
]

export const ALIAS_OVERRIDES = {
  'new-york-us': ['NYC', 'New York'],
  'los-angeles-us': ['LA', 'L.A.'],
  'san-francisco-us': ['SF', 'San Fran', '旧金山'],
  'singapore-sg': ['新加坡市'],
  'cape-town-za': ['开普敦', 'Cape Town'],
}

export const COUNTRY_FALLBACKS = {
  Somaliland: {
    cca2: 'XS',
    cca3: 'SOL',
    name: { common: 'Somaliland' },
    region: 'Africa',
    translations: { zho: { common: '索马里兰' } },
  },
}
