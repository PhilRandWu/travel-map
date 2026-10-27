import type { TransportType } from '@/types'

export const TRANSPORT_TYPES = ['flight', 'train', 'metro', 'ship', 'car'] as const
export const TRANSPORT_WAYPOINT_LIMIT = 4

export type TransportRouteShape = 'arc' | 'surface'
export type TransportPhaseId =
  | 'start'
  | 'accelerate'
  | 'cruise'
  | 'decelerate'
  | 'arrive'
export type TransportVehicleEffect =
  | 'contrail'
  | 'rail'
  | 'pulse'
  | 'wake'
  | 'road'

export interface TransportPhaseConfig {
  id: TransportPhaseId
  label: string
  weight: number
}

export interface TransportModeConfig {
  label: string
  icon: string
  iconPath: string
  searchTerms: readonly string[]
  noteHint: string
  notePlaceholder: string
  route: {
    shape: TransportRouteShape
    colorHex: string
    colorRgb: string
    colorNumber: number
    baseAltitude: number
    laneOffsetDeg: number
    stroke: number
    dashed: boolean
    dashLength: number
    dashGap: number
  }
  trail: {
    colorNumber: number
    guideStartColor: number
    guideEndColor: number
    dashSize: number
    gapSize: number
  }
  vehicle: {
    effect: TransportVehicleEffect
    haloColor: string
    haloShadow: string
  }
  motion: {
    minDurationMs: number
    maxDurationMs: number
    distanceStartKm: number
    distanceRangeKm: number
    phases: readonly TransportPhaseConfig[]
    maxPitchDeg: number
    maxRollDeg: number
    rollScale: number
    bobAmplitude: number
    bobPeriodMs: number
    stopLabel: string
    arrivalLabel: string
  }
  camera: {
    altitude: number
    northLeadDeg: number
    preparingLabel: string
  }
}

const phases = (
  labels: readonly [string, string, string, string, string],
  weights: readonly [number, number, number, number, number],
): readonly TransportPhaseConfig[] => (
  (['start', 'accelerate', 'cruise', 'decelerate', 'arrive'] as const)
    .map((id, index) => ({ id, label: labels[index], weight: weights[index] }))
)

export const TRANSPORT_MODES: Record<TransportType, TransportModeConfig> = {
  flight: {
    label: '飞机',
    icon: '✈',
    iconPath: '/vehicle-icons/flight-3d.svg',
    searchTerms: ['飞机', '航班', '航空', 'flight'],
    noteHint: '航班号',
    notePlaceholder: '例如：CA1234',
    route: {
      shape: 'arc',
      colorHex: '#A5F3FC',
      colorRgb: '165, 243, 252',
      colorNumber: 0xa5f3fc,
      baseAltitude: 0.004,
      laneOffsetDeg: 0,
      stroke: 1.6,
      dashed: true,
      dashLength: 0.045,
      dashGap: 0.014,
    },
    trail: {
      colorNumber: 0xa5f3fc,
      guideStartColor: 0xfbbf24,
      guideEndColor: 0xa5f3fc,
      dashSize: 1.8,
      gapSize: 1.1,
    },
    vehicle: {
      effect: 'contrail',
      haloColor: 'rgba(165,243,252,.3)',
      haloShadow: '0 0 22px 10px rgba(165,243,252,.22)',
    },
    motion: {
      minDurationMs: 5500,
      maxDurationMs: 8500,
      distanceStartKm: 300,
      distanceRangeKm: 9700,
      phases: phases(
        ['滑跑', '起飞', '巡航', '下降', '接地'],
        [0.14, 0.2, 0.42, 0.14, 0.1],
      ),
      maxPitchDeg: 10,
      maxRollDeg: 12,
      rollScale: 18,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '经停',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.62,
      northLeadDeg: 2.4,
      preparingLabel: '准备起飞',
    },
  },
  train: {
    label: '高铁',
    icon: '🚄',
    iconPath: '/vehicle-icons/train-3d.svg',
    searchTerms: ['高铁', '火车', '列车', 'train'],
    noteHint: '车次',
    notePlaceholder: '例如：G7558',
    route: {
      shape: 'surface',
      colorHex: '#FBBF24',
      colorRgb: '251, 191, 36',
      colorNumber: 0xfbbf24,
      baseAltitude: 0.004,
      laneOffsetDeg: 0.16,
      stroke: 1.5,
      dashed: false,
      dashLength: 0,
      dashGap: 0,
    },
    trail: {
      colorNumber: 0xfbbf24,
      guideStartColor: 0xfbbf24,
      guideEndColor: 0xfef3c7,
      dashSize: 1.6,
      gapSize: 1,
    },
    vehicle: {
      effect: 'rail',
      haloColor: 'rgba(251,191,36,.3)',
      haloShadow: '0 0 22px 10px rgba(251,191,36,.2)',
    },
    motion: {
      minDurationMs: 6000,
      maxDurationMs: 9000,
      distanceStartKm: 100,
      distanceRangeKm: 3900,
      phases: phases(
        ['发车', '加速', '区间巡航', '制动', '进站'],
        [0.12, 0.17, 0.44, 0.17, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 4,
      rollScale: 7,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '停站',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.34,
      northLeadDeg: 2.4,
      preparingLabel: '准备发车',
    },
  },
  metro: {
    label: '地铁',
    icon: '🚇',
    iconPath: '/vehicle-icons/metro-3d.svg',
    searchTerms: ['地铁', '轻轨', 'metro', 'subway'],
    noteHint: '线路 / 区间',
    notePlaceholder: '例如：2 号线',
    route: {
      shape: 'surface',
      colorHex: '#FDA4AF',
      colorRgb: '253, 164, 175',
      colorNumber: 0xfda4af,
      baseAltitude: 0.003,
      laneOffsetDeg: 0.11,
      stroke: 1.35,
      dashed: true,
      dashLength: 0.03,
      dashGap: 0.012,
    },
    trail: {
      colorNumber: 0xfda4af,
      guideStartColor: 0xfda4af,
      guideEndColor: 0xffe4e6,
      dashSize: 1.1,
      gapSize: 0.75,
    },
    vehicle: {
      effect: 'pulse',
      haloColor: 'rgba(253,164,175,.3)',
      haloShadow: '0 0 22px 10px rgba(253,164,175,.2)',
    },
    motion: {
      minDurationMs: 4800,
      maxDurationMs: 7000,
      distanceStartKm: 0,
      distanceRangeKm: 120,
      phases: phases(
        ['离站', '加速', '区间运行', '制动', '到站'],
        [0.1, 0.15, 0.47, 0.18, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 9,
      rollScale: 14,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '到站',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.25,
      northLeadDeg: 1.8,
      preparingLabel: '准备离站',
    },
  },
  ship: {
    label: '轮船',
    icon: '🚢',
    iconPath: '/vehicle-icons/ship-3d.svg',
    searchTerms: ['轮船', '邮轮', '渡轮', '船', 'ship', 'ferry'],
    noteHint: '船班 / 航线',
    notePlaceholder: '例如：外滩夜航',
    route: {
      shape: 'surface',
      colorHex: '#60A5FA',
      colorRgb: '96, 165, 250',
      colorNumber: 0x60a5fa,
      baseAltitude: 0.006,
      laneOffsetDeg: 0.2,
      stroke: 1.3,
      dashed: true,
      dashLength: 0.035,
      dashGap: 0.02,
    },
    trail: {
      colorNumber: 0x60a5fa,
      guideStartColor: 0x60a5fa,
      guideEndColor: 0xdbeafe,
      dashSize: 1.5,
      gapSize: 1,
    },
    vehicle: {
      effect: 'wake',
      haloColor: 'rgba(96,165,250,.3)',
      haloShadow: '0 0 22px 10px rgba(96,165,250,.2)',
    },
    motion: {
      minDurationMs: 7500,
      maxDurationMs: 10500,
      distanceStartKm: 200,
      distanceRangeKm: 8000,
      phases: phases(
        ['离港', '加速', '海上巡航', '减速', '靠港'],
        [0.12, 0.16, 0.48, 0.14, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 4,
      rollScale: 5,
      bobAmplitude: 0.0012,
      bobPeriodMs: 1800,
      stopLabel: '靠港',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.43,
      northLeadDeg: 2,
      preparingLabel: '准备离港',
    },
  },
  car: {
    label: '汽车',
    icon: '🚗',
    iconPath: '/vehicle-icons/car-3d.svg',
    searchTerms: ['汽车', '自驾', '驾车', '公路', 'car', 'drive'],
    noteHint: '自驾路线',
    notePlaceholder: '例如：环湖公路',
    route: {
      shape: 'surface',
      colorHex: '#86EFAC',
      colorRgb: '134, 239, 172',
      colorNumber: 0x86efac,
      baseAltitude: 0.004,
      laneOffsetDeg: 0.14,
      stroke: 1.2,
      dashed: false,
      dashLength: 0,
      dashGap: 0,
    },
    trail: {
      colorNumber: 0x86efac,
      guideStartColor: 0x86efac,
      guideEndColor: 0xdcfce7,
      dashSize: 1.2,
      gapSize: 0.8,
    },
    vehicle: {
      effect: 'road',
      haloColor: 'rgba(134,239,172,.3)',
      haloShadow: '0 0 22px 10px rgba(134,239,172,.2)',
    },
    motion: {
      minDurationMs: 5500,
      maxDurationMs: 8000,
      distanceStartKm: 50,
      distanceRangeKm: 2500,
      phases: phases(
        ['启动', '加速', '公路行驶', '减速', '抵达'],
        [0.1, 0.16, 0.48, 0.16, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 6,
      rollScale: 10,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '途经',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.3,
      northLeadDeg: 2.1,
      preparingLabel: '准备出发',
    },
  },
}

export const FALLBACK_TRANSPORT_MODE: TransportModeConfig = {
  ...TRANSPORT_MODES.flight,
  label: '未知交通',
  icon: '◇',
  iconPath: '',
  searchTerms: ['未知交通', 'unknown'],
  noteHint: '备注',
  notePlaceholder: '交通备注',
  route: {
    ...TRANSPORT_MODES.flight.route,
    colorHex: '#94A3B8',
    colorRgb: '148, 163, 184',
    colorNumber: 0x94a3b8,
  },
  vehicle: {
    effect: 'road',
    haloColor: 'rgba(148,163,184,.24)',
    haloShadow: '0 0 18px 8px rgba(148,163,184,.16)',
  },
  motion: {
    ...TRANSPORT_MODES.flight.motion,
    stopLabel: '经停',
  },
  camera: {
    ...TRANSPORT_MODES.flight.camera,
    preparingLabel: '准备出发',
  },
}

export function isTransportType(value: unknown): value is TransportType {
  return typeof value === 'string'
    && (TRANSPORT_TYPES as readonly string[]).includes(value)
}

export function getTransportMode(type: string): TransportModeConfig {
  return isTransportType(type)
    ? TRANSPORT_MODES[type]
    : FALLBACK_TRANSPORT_MODE
}
