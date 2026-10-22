# Vehicle Chase Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the globe-orbit vehicle animation with a complete aircraft/train chase-camera experience from ground departure through cruise to arrival.

**Architecture:** Pure timing and camera modules calculate deterministic motion frames. One shared requestAnimationFrame runtime feeds both the DOM vehicle layer and a Three.js chase-camera hook; React only receives low-frequency phase changes. The camera saves and restores OrbitControls state, while normal completion settles on the destination overview.

**Tech Stack:** React 19, TypeScript, Three.js 0.186, react-globe.gl 2.38, Vitest, Testing Library, Tailwind CSS.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/vehicle.ts` | Route distance, motion duration, altitude profile and sampled vehicle position |
| `src/lib/vehicleMotion.ts` | Five-stage flight/train timing, phase, pitch, roll and movement frames |
| `src/lib/vehicleRuntime.ts` | Pure conversion from playback elapsed time to runtime frame |
| `src/lib/chaseCamera.ts` | Pure chase-camera and destination-overview pose calculation |
| `src/components/globe/hooks/useVehicleRuntime.ts` | Single RAF clock and command-style frame subscription |
| `src/components/globe/hooks/useVehicleChaseCamera.ts` | OrbitControls save/lock/restore and Three.js camera animation |
| `src/components/globe/VehicleOverlay.tsx` | DOM marker, trail and visual effects driven by runtime frames |
| `src/components/globe/VehicleCameraStatus.tsx` | Accessible phase status |
| `src/components/globe/VehicleTrailLayer.tsx` | Existing DOM trail primitives |
| `src/components/globe/vehicleTrail.ts` | Three.js trail and abstract start/end ground light bands |
| `src/components/globe/TravelGlobe.tsx` | Runtime, camera, controls and UI integration |
| `src/components/globe/hooks/useCameraFocus.ts` | Suppress camera writes while chase lock is active |
| `src/components/globe/hooks/useAutoRotate.ts` | Suppress auto-rotation while chase lock is active |
| `src/styles/motion-vehicle.css` | Chase status, vignette, marker and interface dimming |

The 450ms entrance transition overlaps the first 450ms of the main motion. A replay node therefore lasts `main motion + 1900ms`; it does not add another 450ms.

---

## Task 1: Motion Model and Replay Duration

**Files:**
- Create: `src/lib/vehicleMotion.ts`
- Create: `src/lib/vehicleMotion.test.ts`
- Modify: `src/lib/vehicle.ts`
- Modify: `src/lib/vehicle.test.ts`
- Modify: `src/lib/replay.ts`
- Modify: `src/lib/replay.test.ts`

- [ ] **Step 1: Write failing motion-model tests**

Add `src/lib/vehicleMotion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import {
  buildVehicleRoute,
  TRAIN_ALTITUDE,
  vehicleDurationForDistance,
} from '@/lib/vehicle'
import {
  VEHICLE_ARRIVAL_TOTAL_MS,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'

const travelData = data as TravelData
const { flights, trains } = buildTracks(travelData)
const flightRoute = buildVehicleRoute(flights[0])
const trainRoute = buildVehicleRoute(trains[0])

describe('vehicleDurationForDistance', () => {
  it('keeps main motion between 7 and 9 seconds', () => {
    expect(vehicleDurationForDistance('flight', 0)).toBe(7000)
    expect(vehicleDurationForDistance('flight', 10_000)).toBe(9000)
    expect(vehicleDurationForDistance('train', 0)).toBe(7000)
    expect(vehicleDurationForDistance('train', 4000)).toBe(9000)
    expect(VEHICLE_ARRIVAL_TOTAL_MS).toBe(1900)
  })
})

describe('vehicleMotionAt', () => {
  it('starts and ends on the ground', () => {
    expect(vehicleMotionAt(flightRoute, 0)).toMatchObject({
      progress: 0,
      altitude: 0,
      phase: 'taxi',
    })
    expect(vehicleMotionAt(flightRoute, flightRoute.durationMs)).toMatchObject({
      progress: 1,
      altitude: 0,
      phase: 'arrived',
    })
  })

  it('climbs, cruises and descends in order', () => {
    const duration = flightRoute.durationMs
    const climbStart = vehicleMotionAt(flightRoute, duration * 0.09)
    const climbEnd = vehicleMotionAt(flightRoute, duration * 0.23)
    const cruise = vehicleMotionAt(flightRoute, duration * 0.5)
    const descent = vehicleMotionAt(flightRoute, duration * 0.86)

    expect(climbStart.altitude).toBeLessThan(climbEnd.altitude)
    expect(cruise.altitude).toBeCloseTo(flightRoute.altitude, 8)
    expect(descent.altitude).toBeGreaterThan(0)
    expect(descent.altitude).toBeLessThan(flightRoute.altitude)
  })

  it('keeps trains on the ground at all times', () => {
    for (const ratio of [0, 0.1, 0.5, 0.9, 1]) {
      const frame = vehicleMotionAt(trainRoute, trainRoute.durationMs * ratio)
      expect(frame.altitude).toBe(TRAIN_ALTITUDE)
      expect(frame.pitchDeg).toBe(0)
      expect(frame.rollDeg).toBe(0)
    }
  })

  it('uses continuous bounded aircraft attitude', () => {
    let previousProgress = -1
    for (let index = 0; index <= 100; index += 1) {
      const frame = vehicleMotionAt(
        flightRoute,
        flightRoute.durationMs * index / 100,
      )
      expect(frame.progress).toBeGreaterThanOrEqual(previousProgress)
      expect(Math.abs(frame.pitchDeg)).toBeLessThanOrEqual(12)
      expect(Math.abs(frame.rollDeg)).toBeLessThanOrEqual(12)
      previousProgress = frame.progress
    }
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm test src/lib/vehicleMotion.test.ts
```

Expected: FAIL because `vehicleMotion.ts`, `vehicleDurationForDistance`, `VEHICLE_ARRIVAL_TOTAL_MS` and `vehicleMotionAt` do not exist.

- [ ] **Step 3: Add route distance and duration to `vehicle.ts`**

Import `haversineKm` and add `distanceKm` plus `VehiclePlayback` to the existing types:

```ts
import type { FlightArc, TrainPath } from '@/lib/tracks'
import { greatCirclePoints, haversineKm } from '@/lib/geo'

export interface VehicleRoute {
  type: 'flight' | 'train'
  points: [number, number][]
  altitude: number
  distanceKm: number
  durationMs: number
}

export interface VehiclePlayback {
  key: number
  tripId: string
  type: VehicleRoute['type']
  route: VehicleRoute
  label: string
}

function pathDistanceKm(points: [number, number][]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const [fromLat, fromLng] = points[index - 1]
    const [toLat, toLng] = points[index]
    total += haversineKm(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    )
  }
  return total
}

export function vehicleDurationForDistance(
  type: VehicleRoute['type'],
  distanceKm: number,
): number {
  if (type === 'flight') {
    const cruise = 2300
      + Math.max(0, Math.min(1, (distanceKm - 300) / 9700)) * 2000
    return Math.round(cruise + 4700)
  }
  const cruise = 2500
    + Math.max(0, Math.min(1, (distanceKm - 100) / 3900)) * 2000
  return Math.round(cruise + 4500)
}
```

Build each route with the calculated distance and duration:

```ts
if ('altitude' in track) {
  const distanceKm = haversineKm(
    { lat: track.startLat, lng: track.startLng },
    { lat: track.endLat, lng: track.endLng },
  )
  return {
    type: 'flight',
    points: greatCirclePoints(
      { lat: track.startLat, lng: track.startLng },
      { lat: track.endLat, lng: track.endLng },
      64,
    ),
    altitude: track.altitude,
    distanceKm,
    durationMs: vehicleDurationForDistance('flight', distanceKm),
  }
}

const distanceKm = pathDistanceKm(track.points)
return {
  type: 'train',
  points: track.points,
  altitude: TRAIN_ALTITUDE,
  distanceKm,
  durationMs: vehicleDurationForDistance('train', distanceKm),
}
```

Replace the sine altitude profile with the approved five-stage profile:

```ts
function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

export function vehicleAltitudeAt(
  route: VehicleRoute,
  progress: number,
): number {
  if (route.type !== 'flight') return route.altitude
  if (progress <= 0.08 || progress >= 0.93) return 0
  if (progress < 0.24) {
    return smoothstep((progress - 0.08) / 0.16) * route.altitude
  }
  if (progress <= 0.78) return route.altitude
  return (1 - smoothstep((progress - 0.78) / 0.15)) * route.altitude
}
```

- [ ] **Step 4: Implement `src/lib/vehicleMotion.ts`**

```ts
import {
  sampleVehicleRoute,
  TRAIN_ALTITUDE,
  vehicleAltitudeAt,
  type VehiclePosition,
  type VehicleRoute,
} from '@/lib/vehicle'

export const VEHICLE_CHASE_ENTRY_MS = 450
export const VEHICLE_ARRIVAL_HOLD_MS = 1000
export const VEHICLE_ARRIVAL_RETURN_MS = 900
export const VEHICLE_ARRIVAL_TOTAL_MS =
  VEHICLE_ARRIVAL_HOLD_MS + VEHICLE_ARRIVAL_RETURN_MS

export type VehicleMotionPhase =
  | 'taxi'
  | 'takeoff'
  | 'cruise'
  | 'descent'
  | 'landing'
  | 'depart'
  | 'accelerate'
  | 'brake'
  | 'arrive'
  | 'arrived'

interface PhaseDefinition {
  phase: Exclude<VehicleMotionPhase, 'arrived'>
  durationMs: number
  startProgress: number
  endProgress: number
  easing: (value: number) => number
}

export interface VehicleMotionFrame {
  elapsedMs: number
  durationMs: number
  phase: VehicleMotionPhase
  phaseLabel: string
  phaseProgress: number
  progress: number
  altitude: number
  pitchDeg: number
  rollDeg: number
  position: VehiclePosition
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const linear = (value: number) => value
const easeInQuad = (value: number) => value * value
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3
const easeInOutCubic = (value: number) => (
  value < 0.5
    ? 4 * value ** 3
    : 1 - (-2 * value + 2) ** 3 / 2
)

function cruiseDuration(route: VehicleRoute): number {
  const fixed = route.type === 'flight' ? 4700 : 4500
  return Math.max(2300, route.durationMs - fixed)
}

function phasesFor(route: VehicleRoute): PhaseDefinition[] {
  if (route.type === 'flight') {
    return [
      { phase: 'taxi', durationMs: 900, startProgress: 0, endProgress: 0.08, easing: easeInQuad },
      { phase: 'takeoff', durationMs: 1400, startProgress: 0.08, endProgress: 0.24, easing: easeInOutCubic },
      { phase: 'cruise', durationMs: cruiseDuration(route), startProgress: 0.24, endProgress: 0.78, easing: linear },
      { phase: 'descent', durationMs: 1300, startProgress: 0.78, endProgress: 0.93, easing: easeInOutCubic },
      { phase: 'landing', durationMs: 1100, startProgress: 0.93, endProgress: 1, easing: easeOutCubic },
    ]
  }
  return [
    { phase: 'depart', durationMs: 900, startProgress: 0, endProgress: 0.08, easing: easeInQuad },
    { phase: 'accelerate', durationMs: 1400, startProgress: 0.08, endProgress: 0.24, easing: easeInOutCubic },
    { phase: 'cruise', durationMs: cruiseDuration(route), startProgress: 0.24, endProgress: 0.8, easing: linear },
    { phase: 'brake', durationMs: 1200, startProgress: 0.8, endProgress: 0.94, easing: easeInOutCubic },
    { phase: 'arrive', durationMs: 1000, startProgress: 0.94, endProgress: 1, easing: easeOutCubic },
  ]
}

const LABELS: Record<VehicleRoute['type'], Record<VehicleMotionPhase, string>> = {
  flight: {
    taxi: '滑跑',
    takeoff: '起飞',
    cruise: '巡航',
    descent: '下降',
    landing: '接地',
    arrived: '抵达',
    depart: '发车',
    accelerate: '加速',
    brake: '制动',
    arrive: '进站',
  },
  train: {
    depart: '发车',
    accelerate: '加速',
    cruise: '巡航',
    brake: '制动',
    arrive: '进站',
    arrived: '抵达',
    taxi: '滑跑',
    takeoff: '起飞',
    descent: '下降',
    landing: '接地',
  },
}

function headingAt(route: VehicleRoute, progress: number): number {
  const before = sampleVehicleRoute(route, Math.max(0, progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, progress + 0.004))
  const deltaLng = ((after.lng - before.lng + 540) % 360) - 180
  return Math.atan2(
    after.lat - before.lat,
    deltaLng * Math.cos(((before.lat + after.lat) / 2) * Math.PI / 180),
  )
}

function rollAt(route: VehicleRoute, progress: number): number {
  if (route.type !== 'flight' || progress <= 0 || progress >= 1) return 0
  const before = headingAt(route, Math.max(0, progress - 0.01))
  const after = headingAt(route, Math.min(1, progress + 0.01))
  const delta = ((after - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  return Math.max(-12, Math.min(12, delta * 18))
}

export function vehicleMotionAt(
  route: VehicleRoute,
  elapsedMs: number,
): VehicleMotionFrame {
  const elapsed = Math.max(0, Math.min(route.durationMs, elapsedMs))
  if (elapsed >= route.durationMs) {
    const position = sampleVehicleRoute(route, 1)
    return {
      elapsedMs: elapsed,
      durationMs: route.durationMs,
      phase: 'arrived',
      phaseLabel: LABELS[route.type].arrived,
      phaseProgress: 1,
      progress: 1,
      altitude: route.type === 'train' ? TRAIN_ALTITUDE : 0,
      pitchDeg: 0,
      rollDeg: 0,
      position,
    }
  }

  let cursor = 0
  const phases = phasesFor(route)
  for (const definition of phases) {
    const end = cursor + definition.durationMs
    if (elapsed < end || definition === phases.at(-1)) {
      const phaseProgress = clamp01((elapsed - cursor) / definition.durationMs)
      const eased = definition.easing(phaseProgress)
      const progress = definition.startProgress
        + (definition.endProgress - definition.startProgress) * eased
      const altitude = route.type === 'train'
        ? TRAIN_ALTITUDE
        : vehicleAltitudeAt(route, progress)
      const pitchDeg = route.type === 'train'
        ? 0
        : definition.phase === 'takeoff'
          ? Math.sin(Math.PI * phaseProgress) * 10
          : definition.phase === 'descent'
            ? -Math.sin(Math.PI * phaseProgress) * 8
            : 0
      return {
        elapsedMs: elapsed,
        durationMs: route.durationMs,
        phase: definition.phase,
        phaseLabel: LABELS[route.type][definition.phase],
        phaseProgress,
        progress,
        altitude,
        pitchDeg,
        rollDeg: rollAt(route, progress),
        position: sampleVehicleRoute(route, progress),
      }
    }
    cursor = end
  }

  throw new Error('vehicle motion phase table must cover the full duration')
}
```

- [ ] **Step 5: Update replay durations**

In `src/lib/replay.ts`, replace the independent flight/train constants with:

```ts
import { resolveCities } from '@/lib/cities'
import { tripDistance } from '@/lib/geo'
import { vehicleDurationForDistance } from '@/lib/vehicle'
import { VEHICLE_ARRIVAL_TOTAL_MS } from '@/lib/vehicleMotion'

const VISIT_DURATION_MS = 2200

export function replayNodeDurationMs(
  data: TravelData,
  node: TimelineNode,
): number {
  if (node.kind === 'visit') return VISIT_DURATION_MS
  const trip = findTrip(data, node.refId)
  if (!trip) return VISIT_DURATION_MS
  const distanceKm = tripDistance(trip, resolveCities(data)) ?? 0
  return vehicleDurationForDistance(trip.type, distanceKm)
    + VEHICLE_ARRIVAL_TOTAL_MS
}
```

Update `src/lib/replay.test.ts` so duration assertions are range-based and no longer encode 3400/4300:

```ts
it('vehicle steps include main motion and arrival settlement', () => {
  const tripStep = plan.steps.find((step) => step.node.kind === 'trip')!
  expect(tripStep.durationMs).toBeGreaterThanOrEqual(8900)
  expect(tripStep.durationMs).toBeLessThanOrEqual(10_900)
})

it('visit steps keep the existing hold duration', () => {
  const visitStep = plan.steps.find((step) => step.node.kind === 'visit')!
  expect(visitStep.durationMs).toBe(2200)
})
```

Update accumulated `startMs` assertions to use previous step durations instead of fixed numbers.

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm test src/lib/vehicle.test.ts src/lib/vehicleMotion.test.ts src/lib/replay.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run the full test suite**

Run:

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit stage 1**

```bash
git add src/lib/vehicle.ts src/lib/vehicle.test.ts \
  src/lib/vehicleMotion.ts src/lib/vehicleMotion.test.ts \
  src/lib/replay.ts src/lib/replay.test.ts
git commit -S -m "feat: add complete vehicle motion timeline"
```

---

## Task 2: Pure Runtime Frame and Chase Camera Pose

**Files:**
- Create: `src/lib/vehicleRuntime.ts`
- Create: `src/lib/vehicleRuntime.test.ts`
- Create: `src/lib/chaseCamera.ts`
- Create: `src/lib/chaseCamera.test.ts`
- Modify: `src/components/globe/hooks/useVehiclePlayback.ts`

- [ ] **Step 1: Write failing runtime-frame tests**

Add `src/lib/vehicleRuntime.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import { buildVehicleRuntimeFrame } from '@/lib/vehicleRuntime'

const { flights } = buildTracks(data as TravelData)
const route = buildVehicleRoute(flights[0])
const playback: VehiclePlayback = {
  key: 1,
  tripId: flights[0].trip.id,
  type: route.type,
  route,
  label: flights[0].label,
}

describe('buildVehicleRuntimeFrame', () => {
  it('moves, holds, returns and completes on one timeline', () => {
    expect(buildVehicleRuntimeFrame(playback, 0, 1).stage).toBe('moving')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs,
      1,
    ).stage).toBe('holding')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1000,
      1,
    ).stage).toBe('returning')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1900,
      1,
    ).stage).toBe('complete')
  })

  it('keeps the final marker on the destination during settlement', () => {
    const frame = buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1400,
      2,
    )
    expect(frame.motion.progress).toBe(1)
    expect(frame.motion.phase).toBe('arrived')
    expect(frame.revision).toBe(2)
  })
})
```

- [ ] **Step 2: Write failing chase-camera tests**

Add `src/lib/chaseCamera.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { GlobeMethods } from 'react-globe.gl'
import { buildChaseCameraPose, buildOverviewPose } from '@/lib/chaseCamera'
import type { VehicleRoute } from '@/lib/vehicle'
import { vehicleMotionAt } from '@/lib/vehicleMotion'

const RADIUS = 100
const fakeGlobe = {
  getGlobeRadius: () => RADIUS,
  getCoords: (lat: number, lng: number, altitude = 0) => {
    const radius = RADIUS * (1 + altitude)
    const phi = lat * Math.PI / 180
    const theta = lng * Math.PI / 180
    return {
      x: radius * Math.cos(phi) * Math.cos(theta),
      y: radius * Math.sin(phi),
      z: radius * Math.cos(phi) * Math.sin(theta),
    }
  },
} as Pick<GlobeMethods, 'getGlobeRadius' | 'getCoords'>

const route: VehicleRoute = {
  type: 'flight',
  points: [[20, 100], [24, 104], [30, 112]],
  altitude: 0.18,
  distanceKm: 1200,
  durationMs: 7600,
}

describe('buildChaseCameraPose', () => {
  it('places the camera outside the globe and aims in front of the vehicle', () => {
    const motion = vehicleMotionAt(route, route.durationMs * 0.5)
    const pose = buildChaseCameraPose(fakeGlobe, route, motion)
    const distance = Math.hypot(...pose.position)
    expect(distance).toBeGreaterThan(RADIUS * 1.012)
    expect(pose.target).not.toEqual(pose.position)
    expect(pose.up.every(Number.isFinite)).toBe(true)
  })

  it('builds a finite destination overview pose', () => {
    const pose = buildOverviewPose(fakeGlobe, 30, 112)
    expect(pose.position.every(Number.isFinite)).toBe(true)
    expect(pose.target).toEqual([0, 0, 0])
  })
})
```

- [ ] **Step 3: Run focused tests and verify they fail**

Run:

```bash
pnpm test src/lib/vehicleRuntime.test.ts src/lib/chaseCamera.test.ts
```

Expected: FAIL because both modules do not exist.

- [ ] **Step 4: Implement `src/lib/vehicleRuntime.ts`**

```ts
import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import {
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_TOTAL_MS,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'
import type { VehiclePlayback } from '@/lib/vehicle'

export type VehicleRuntimeStage =
  | 'moving'
  | 'holding'
  | 'returning'
  | 'complete'

export interface VehicleRuntimeFrame {
  key: number
  tripId: string
  label: string
  elapsedMs: number
  arrivalElapsedMs: number
  revision: number
  stage: VehicleRuntimeStage
  motion: VehicleMotionFrame
  playback: VehiclePlayback
}

export function buildVehicleRuntimeFrame(
  playback: VehiclePlayback,
  nodeElapsedMs: number,
  revision: number,
): VehicleRuntimeFrame {
  const duration = playback.route.durationMs
  const elapsedMs = Math.max(0, nodeElapsedMs)
  const motionElapsed = Math.min(duration, elapsedMs)
  const arrivalElapsedMs = Math.max(0, elapsedMs - duration)
  const stage: VehicleRuntimeStage = elapsedMs < duration
    ? 'moving'
    : arrivalElapsedMs < VEHICLE_ARRIVAL_HOLD_MS
      ? 'holding'
      : arrivalElapsedMs < VEHICLE_ARRIVAL_TOTAL_MS
        ? 'returning'
        : 'complete'

  return {
    key: playback.key,
    tripId: playback.tripId,
    label: playback.label,
    elapsedMs,
    arrivalElapsedMs,
    revision,
    stage,
    motion: vehicleMotionAt(playback.route, motionElapsed),
    playback,
  }
}
```

- [ ] **Step 5: Implement `src/lib/chaseCamera.ts`**

```ts
import { Matrix4, Quaternion, Vector3 } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import { sampleVehicleRoute, type VehicleRoute } from '@/lib/vehicle'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
}

type GlobeGeometry = Pick<GlobeMethods, 'getCoords' | 'getGlobeRadius'>

const asVector = (value: { x: number; y: number; z: number }) => (
  new Vector3(value.x, value.y, value.z)
)

const asTuple = (value: Vector3): [number, number, number] => (
  [value.x, value.y, value.z]
)

export function buildChaseCameraPose(
  globe: GlobeGeometry,
  route: VehicleRoute,
  motion: VehicleMotionFrame,
): CameraPose {
  const radius = globe.getGlobeRadius()
  const current = sampleVehicleRoute(route, motion.progress)
  const before = sampleVehicleRoute(route, Math.max(0, motion.progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, motion.progress + 0.004))
  const vehicle = asVector(globe.getCoords(
    current.lat,
    current.lng,
    current.altitude,
  ))
  const behind = asVector(globe.getCoords(
    before.lat,
    before.lng,
    before.altitude,
  ))
  const ahead = asVector(globe.getCoords(
    after.lat,
    after.lng,
    after.altitude,
  ))
  const tangent = after.clone().sub(behind)
  if (tangent.lengthSq() < 1e-8) tangent.copy(ahead).sub(vehicle)
  tangent.normalize()

  const localUp = vehicle.clone().normalize()
  const altitudeFactor = route.type === 'train' || route.altitude <= 0
    ? 0
    : Math.max(0, Math.min(1, current.altitude / route.altitude))
  const backDistance = (0.045 + (0.070 - 0.045) * altitudeFactor) * radius
  const aboveDistance = (0.018 + (0.030 - 0.018) * altitudeFactor) * radius
  const forwardDistance = (0.080 + (0.140 - 0.080) * altitudeFactor) * radius

  const position = vehicle.clone()
    .addScaledVector(tangent, -backDistance)
    .addScaledVector(localUp, aboveDistance)
  const minimumRadius = radius * 1.012
  if (position.length() < minimumRadius) position.setLength(minimumRadius)

  const target = vehicle.clone()
    .addScaledVector(tangent, forwardDistance)
    .addScaledVector(localUp, radius * 0.006)

  const cameraUp = localUp.clone()
    .addScaledVector(tangent, -localUp.dot(tangent))
    .normalize()
  return {
    position: asTuple(position),
    target: asTuple(target),
    up: asTuple(cameraUp),
  }
}

export function buildOverviewPose(
  globe: GlobeGeometry,
  lat: number,
  lng: number,
  altitude = 1.35,
): CameraPose {
  const position = asVector(globe.getCoords(lat, lng, altitude))
  return {
    position: asTuple(position),
    target: [0, 0, 0],
    up: [0, 1, 0],
  }
}

export function poseQuaternion(
  pose: CameraPose,
): [number, number, number, number] {
  const matrix = new Matrix4().lookAt(
    new Vector3(...pose.position),
    new Vector3(...pose.target),
    new Vector3(...pose.up),
  )
  const quaternion = new Quaternion().setFromRotationMatrix(matrix)
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}
```

- [ ] **Step 6: Update the playback type import**

In `src/components/globe/hooks/useVehiclePlayback.ts`, remove the local `VehiclePlayback` interface and import/export the shared type:

```ts
import {
  buildVehicleRoute,
  type VehiclePlayback,
  type VehicleRoute,
} from '@/lib/vehicle'

export type { VehiclePlayback }
```

The hook return type remains `VehiclePlayback | null`.

- [ ] **Step 7: Run focused and full tests**

Run:

```bash
pnpm test src/lib/vehicleRuntime.test.ts src/lib/chaseCamera.test.ts
pnpm test
```

Expected: PASS.

- [ ] **Step 8: Commit stage 2**

```bash
git add src/lib/vehicleRuntime.ts src/lib/vehicleRuntime.test.ts \
  src/lib/chaseCamera.ts src/lib/chaseCamera.test.ts \
  src/components/globe/hooks/useVehiclePlayback.ts
git commit -S -m "feat: add runtime frames and chase camera geometry"
```

---

## Task 3: Shared RAF Runtime and Camera Lock

**Files:**
- Create: `src/components/globe/hooks/useVehicleRuntime.ts`
- Create: `src/components/globe/hooks/useVehicleChaseCamera.ts`
- Modify: `src/components/globe/hooks/useCameraFocus.ts`
- Modify: `src/components/globe/hooks/useAutoRotate.ts`

- [ ] **Step 1: Implement the shared runtime hook**

Create `useVehicleRuntime.ts` with one RAF loop:

```ts
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { ReplayRuntime } from '@/lib/replay'
import type { VehiclePlayback } from '@/lib/vehicle'
import {
  buildVehicleRuntimeFrame,
  type VehicleRuntimeFrame,
} from '@/lib/vehicleRuntime'

type FrameListener = (frame: VehicleRuntimeFrame | null) => void

export interface VehicleRuntime {
  subscribe: (listener: FrameListener) => () => void
  getFrame: () => VehicleRuntimeFrame | null
}

interface Options {
  playback: VehiclePlayback | null
  replayRuntime: ReplayRuntime | null
  pageVisible: boolean
  globeRef: RefObject<GlobeMethods | undefined>
}

export function useVehicleRuntime({
  playback,
  replayRuntime,
  pageVisible,
  globeRef,
}: Options): VehicleRuntime {
  const frameRef = useRef<VehicleRuntimeFrame | null>(null)
  const listenersRef = useRef(new Set<FrameListener>())

  const emit = useCallback((frame: VehicleRuntimeFrame | null) => {
    frameRef.current = frame
    listenersRef.current.forEach((listener) => listener(frame))
  }, [])

  const subscribe = useCallback((listener: FrameListener) => {
    listenersRef.current.add(listener)
    listener(frameRef.current)
    return () => listenersRef.current.delete(listener)
  }, [])

  const getFrame = useCallback(() => frameRef.current, [])

  useEffect(() => {
    if (!playback || !globeRef.current) {
      emit(null)
      return
    }

    let raf = 0
    let cancelled = false
    let elapsedMs = 0
    let lastNow = performance.now()
    let previousReplayIndex = -1
    let replayWasFollowing = false
    const endMs = playback.route.durationMs + 1900

    const emitAt = (nextElapsedMs: number, revision: number) => {
      const frame = buildVehicleRuntimeFrame(
        playback,
        nextElapsedMs,
        revision,
      )
      elapsedMs = nextElapsedMs
      emit(frame)
      return frame
    }

    const replayPosition = () => replayRuntime?.getPosition() ?? null
    const currentReplayStep = () => {
      const position = replayPosition()
      if (!position || !replayRuntime) return null
      return replayRuntime.plan.steps[position.index] ?? null
    }
    const draw = () => {
      if (!replayRuntime || replayRuntime.status === 'idle') {
        return emitAt(elapsedMs, playback.key)
      }

      const position = replayPosition()
      const step = currentReplayStep()
      if (!position || !step) {
        emit(null)
        return null
      }

      if (step.node.kind === 'trip' && step.node.refId === playback.tripId) {
        replayWasFollowing = true
        previousReplayIndex = position.index
        return emitAt(position.elapsedMs, replayRuntime.seekRevision)
      }

      if (replayWasFollowing && previousReplayIndex >= 0) {
        const completed = buildVehicleRuntimeFrame(
          playback,
          playback.route.durationMs + 1900,
          replayRuntime.seekRevision,
        )
        emit(completed)
        replayWasFollowing = false
      } else {
        emit(null)
      }
      return null
    }

    const tick = (now: number) => {
      if (cancelled) return
      const delta = Math.min(120, Math.max(0, now - lastNow))
      lastNow = now
      if (pageVisible && document.visibilityState !== 'hidden') {
        elapsedMs += delta
      }
      const frame = draw()
      if (frame?.stage === 'complete') return
      if (elapsedMs >= endMs) return
      raf = requestAnimationFrame(tick)
    }

    const frame = draw()
    const shouldAnimate = replayRuntime && replayRuntime.status !== 'idle'
      ? replayRuntime.status === 'playing' && pageVisible
      : pageVisible && frame?.stage !== 'complete' && elapsedMs < endMs
    if (shouldAnimate) {
      lastNow = performance.now()
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [emit, globeRef, pageVisible, playback, replayRuntime])

  useEffect(() => () => emit(null), [emit])

  return { subscribe, getFrame }
}
```

Keep the replay branch responsible for both the current trip and the synthetic completion frame; no unused helper is required.

- [ ] **Step 2: Implement camera save, lock, follow and restore**

Create `useVehicleChaseCamera.ts`:

```ts
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import {
  buildChaseCameraPose,
  buildOverviewPose,
  type CameraPose,
} from '@/lib/chaseCamera'
import {
  VEHICLE_CHASE_ENTRY_MS,
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_RETURN_MS,
} from '@/lib/vehicleMotion'
import type { VehicleRuntime, VehicleRuntimeFrame } from './useVehicleRuntime'

interface SavedCamera {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  up: [number, number, number]
  target: [number, number, number]
  enabled: boolean
  autoRotate: boolean
}

interface Options {
  globeRef: RefObject<GlobeMethods | undefined>
  runtime: VehicleRuntime
  enabled: boolean
}

const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function applyPose(globe: GlobeMethods, pose: CameraPose) {
  const camera = globe.camera()
  camera.position.set(...pose.position)
  camera.up.set(...pose.up)
  camera.lookAt(...pose.target)
}

function interpolatePose(from: CameraPose, to: CameraPose, value: number): CameraPose {
  const t = smoothstep(value)
  return {
    position: [
      from.position[0] + (to.position[0] - from.position[0]) * t,
      from.position[1] + (to.position[1] - from.position[1]) * t,
      from.position[2] + (to.position[2] - from.position[2]) * t,
    ],
    target: [
      from.target[0] + (to.target[0] - from.target[0]) * t,
      from.target[1] + (to.target[1] - from.target[1]) * t,
      from.target[2] + (to.target[2] - from.target[2]) * t,
    ],
    up: [
      from.up[0] + (to.up[0] - from.up[0]) * t,
      from.up[1] + (to.up[1] - from.up[1]) * t,
      from.up[2] + (to.up[2] - from.up[2]) * t,
    ],
  }
}

export function useVehicleChaseCamera({ globeRef, runtime, enabled }: Options) {
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState<{
    label: string
    type: 'flight' | 'train'
  } | null>(null)
  const savedRef = useRef<SavedCamera | null>(null)
  const activeRef = useRef(false)
  const completedRef = useRef(false)
  const entryStartedRef = useRef(0)
  const entryPoseRef = useRef<CameraPose | null>(null)
  const lastRevisionRef = useRef<number | null>(null)
  const lastTripRef = useRef<string | null>(null)
  const lastLabelRef = useRef('')

  const restore = useCallback((completed: boolean) => {
    const globe = globeRef.current
    const saved = savedRef.current
    if (!globe || !saved) {
      activeRef.current = false
      setLocked(false)
      return
    }
    const camera = globe.camera()
    const controls = globe.controls()
    if (!completed) {
      camera.position.set(...saved.position)
      camera.quaternion.set(...saved.quaternion)
      camera.up.set(...saved.up)
      controls.target.set(...saved.target)
    } else {
      controls.target.set(0, 0, 0)
    }
    controls.enabled = saved.enabled
    controls.autoRotate = saved.autoRotate
    controls.update()
    savedRef.current = null
    activeRef.current = false
    setLocked(false)
    setStatus(null)
  }, [globeRef])

  const onFrame = useCallback((frame: VehicleRuntimeFrame | null) => {
    const globe = globeRef.current
    if (!globe) return
    if (!frame) {
      if (activeRef.current) restore(completedRef.current)
      completedRef.current = false
      lastTripRef.current = null
      return
    }

    const controls = globe.controls()
    const camera = globe.camera()
    if (!activeRef.current || lastTripRef.current !== frame.tripId) {
      savedRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        quaternion: [
          camera.quaternion.x,
          camera.quaternion.y,
          camera.quaternion.z,
          camera.quaternion.w,
        ],
        up: [camera.up.x, camera.up.y, camera.up.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        enabled: controls.enabled,
        autoRotate: controls.autoRotate,
      }
      entryPoseRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
      }
      entryStartedRef.current = performance.now()
      activeRef.current = true
      completedRef.current = false
      lastTripRef.current = frame.tripId
      lastRevisionRef.current = frame.revision
      controls.enabled = false
      controls.autoRotate = false
      setLocked(true)
    }

    const chasePose = buildChaseCameraPose(
      globe,
      frame.playback.route,
      frame.motion,
    )
    const seeked = lastRevisionRef.current !== null
      && lastRevisionRef.current !== frame.revision
    lastRevisionRef.current = frame.revision
    let pose = chasePose

    if (frame.stage === 'returning') {
      const destination = buildOverviewPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      )
      const progress = (
        frame.arrivalElapsedMs
        - VEHICLE_ARRIVAL_HOLD_MS
      ) / VEHICLE_ARRIVAL_RETURN_MS
      pose = interpolatePose(chasePose, destination, progress)
    }

    if (
      !seeked
      && frame.stage === 'moving'
      && entryPoseRef.current
      && performance.now() - entryStartedRef.current < VEHICLE_CHASE_ENTRY_MS
    ) {
      const progress = (
        performance.now() - entryStartedRef.current
      ) / VEHICLE_CHASE_ENTRY_MS
      pose = interpolatePose(entryPoseRef.current, pose, progress)
    }

    if (!pose.position.every(Number.isFinite)) {
      restore(false)
      return
    }
    applyPose(globe, pose)

    if (frame.stage === 'complete') {
      const destination = buildOverviewPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      )
      applyPose(globe, destination)
      completedRef.current = true
      restore(true)
    }

    if (frame.motion.phaseLabel !== lastLabelRef.current) {
      lastLabelRef.current = frame.motion.phaseLabel
      setStatus({ label: frame.motion.phaseLabel, type: frame.playback.type })
    }
  }, [globeRef, restore])

  useEffect(() => {
    if (!enabled) {
      if (activeRef.current) restore(false)
      return
    }
    return runtime.subscribe(onFrame)
  }, [enabled, onFrame, restore, runtime])

  useEffect(() => () => {
    if (activeRef.current) restore(false)
  }, [restore])

  return { locked, status }
}
```

Keep the quaternion helper available for future pose interpolation; camera orientation is applied through `camera.lookAt`.

- [ ] **Step 3: Stop camera writers while locked**

Add `cameraLockedRef: RefObject<boolean>` to the options of both hooks.

In `useAutoRotate`, the condition gains:

```ts
&& !cameraLockedRef.current
```

In `useCameraFocus`, `flyTo` and both selection/focus effects return immediately when `cameraLockedRef.current` is true:

```ts
const flyTo = useCallback((lat: number, lng: number, maxAlt: number) => {
  if (cameraLockedRef.current) return
  const globe = globeRef.current
  if (!globe) return
  // existing body
}, [cameraLockedRef, duration, globeRef])
```

Guard the reset effect before `pointOfView`.

- [ ] **Step 4: Run TypeScript and tests**

Run:

```bash
pnpm test
pnpm build
```

Expected: all tests and the production build PASS.

- [ ] **Step 5: Commit stage 3**

```bash
git add src/components/globe/hooks/useVehicleRuntime.ts \
  src/components/globe/hooks/useVehicleChaseCamera.ts \
  src/components/globe/hooks/useAutoRotate.ts \
  src/components/globe/hooks/useCameraFocus.ts
git commit -S -m "feat: lock and animate globe chase camera"
```

---

## Task 4: Vehicle Rendering and Globe Integration

**Files:**
- Modify: `src/components/globe/VehicleOverlay.tsx`
- Modify: `src/components/globe/useVehicleMotionEffects.ts`
- Modify: `src/components/globe/vehicleTrail.ts`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Create: `src/components/globe/VehicleCameraStatus.tsx`
- Modify: `src/components/globe/TravelGlobe.types.ts`

- [ ] **Step 1: Refactor `VehicleOverlay` to subscribe to runtime frames**

Remove its `useEffect` RAF clock and replay imports. The component receives:

```ts
interface Props {
  runtime: VehicleRuntime
  globeRef: RefObject<GlobeMethods | undefined>
}
```

Subscribe once and retain direct DOM updates:

```ts
useEffect(() => runtime.subscribe((frame) => {
  const globe = globeRef.current
  const host = hostRef.current
  const marker = markerRef.current
  if (!globe || !host || !marker) return
  if (!frame) {
    hideMarker(host, marker)
    return
  }

  const { motion } = frame
  const screen = screenPoint(globe, motion.position)
  const visible = isPointVisible(globe, motion.position)
  marker.style.visibility = 'visible'
  marker.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`
  marker.style.opacity = visible ? '1' : '0'
  marker.style.setProperty('--rg-vehicle-pitch', `${motion.pitchDeg}deg`)
  marker.style.setProperty('--rg-vehicle-roll', `${motion.rollDeg}deg`)
  marker.dataset.vehicleProgress = motion.progress.toFixed(3)
  marker.dataset.vehicleStage = frame.stage
  marker.dataset.vehicleChase = 'true'
  host.dataset.vehiclePlaying = String(frame.stage !== 'complete')
  host.dataset.vehicleTrailProgress = motion.progress.toFixed(3)
  trail.update(motion.progress)
  effects.update(
    globe,
    frame.playback.route,
    motion.progress,
    motion.progress,
    visible,
    false,
  )
  if (motion.progress >= 1) effects.markArrival(
    globe,
    frame.playback.route,
  )
}), [effects, globeRef, runtime])
```

The route is represented by `frame.playback.route`; `calmMotion` is handled by disabling the chase camera at a higher level. For calm mode, render the destination endpoint with a 200ms opacity fade instead of a moving marker.

- [ ] **Step 2: Extend the trail with abstract ground light bands**

In `vehicleTrail.ts`, create start and end guide lines from the first/last 8% of route points:

```ts
const guideCount = Math.max(2, Math.ceil(route.points.length * 0.08))
const startPoints = route.points.slice(0, guideCount)
const endPoints = route.points.slice(-guideCount)
const startMaterial = new LineBasicMaterial({
  color: 0xfbbf24,
  transparent: true,
  opacity: 0.72,
})
const endMaterial = new LineBasicMaterial({
  color: 0xa5f3fc,
  transparent: true,
  opacity: 0.4,
})
```

Add both lines to the scene and update their opacity:

```ts
update(progress: number) {
  // existing main trail draw range
  startMaterial.opacity = route.type === 'flight'
    ? Math.max(0.08, 0.72 * (1 - Math.min(1, progress / 0.24)))
    : 0.58
  endMaterial.opacity = Math.min(0.7, Math.max(0.12, progress * 1.2))
},
dispose() {
  // existing dispose
  globe.scene().remove(startGuide)
  globe.scene().remove(endGuide)
  startGeometry.dispose()
  endGeometry.dispose()
  startMaterial.dispose()
  endMaterial.dispose()
}
```

Use `vehicleAltitudeAt(route, pointIndex / max)` when constructing guide positions, matching the main trail.

- [ ] **Step 3: Create the accessible phase status**

Add `VehicleCameraStatus.tsx`:

```tsx
interface Props {
  active: boolean
  label: string | null
  type: 'flight' | 'train' | null
}

export default function VehicleCameraStatus({ active, label, type }: Props) {
  if (!active || !label || !type) return null
  const vehicle = type === 'flight' ? '飞机' : '列车'
  return (
    <div
      data-vehicle-camera-status
      className="rg-vehicle-camera-status pointer-events-none absolute left-1/2 top-20 z-[3] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <span className="rg-vehicle-camera-status-dot" aria-hidden />
      <span>载具视角 · {vehicle}{label}</span>
    </div>
  )
}
```

- [ ] **Step 4: Connect runtime and camera in `TravelGlobe`**

Add `cameraLockedRef = useRef(false)` and pass it to `useAutoRotate` and `useCameraFocus`.

After `vehiclePlayback` is created:

```ts
const vehicleRuntime = useVehicleRuntime({
  playback: vehiclePlayback,
  replayRuntime,
  pageVisible,
  globeRef,
})
const chaseCamera = useVehicleChaseCamera({
  globeRef,
  runtime: vehicleRuntime,
  enabled: pageVisible && effectiveLevel !== 'calm',
})
cameraLockedRef.current = chaseCamera.locked
```

Use the lock in the globe:

```tsx
<Globe
  ...
  enablePointerInteraction={!chaseCamera.locked}
  onGlobeClick={(coords) => {
    if (!cameraLockedRef.current) handleGlobeClickWithSelection(coords)
  }}
/>
```

Set `data-camera-locked={chaseCamera.locked}` on the wrapper, add `chaseCamera.locked` to `scenePaused`, replace the old vehicle overlay props with `runtime={vehicleRuntime}`, and render:

```tsx
<VehicleCameraStatus
  active={chaseCamera.locked}
  label={chaseCamera.status?.label ?? null}
  type={chaseCamera.status?.type ?? null}
/>
```

- [ ] **Step 5: Add chase styling**

Create `src/styles/motion-vehicle.css` and import it from `index.css`:

```css
.rg-vehicle-camera-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid rgb(255 255 255 / 0.12);
  border-radius: 999px;
  background: rgb(5 8 17 / 0.68);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.32);
  color: rgb(255 255 255 / 0.68);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  backdrop-filter: blur(10px);
}

.rg-vehicle-camera-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #a5f3fc;
  box-shadow: 0 0 10px rgb(103 232 249 / 0.7);
}

[data-vehicle-chase='true'] .rg-vehicle-label {
  opacity: 0;
}

[data-camera-locked='true'] .rg-city-hit {
  pointer-events: none;
}

html[data-vehicle-chase='true'] .rg-city-marker {
  opacity: 0.38;
}

html[data-vehicle-chase='true'] :is(
  .rg-passport,
  .rg-card-in,
  .rg-hero-in,
  .rg-stats-in
) {
  opacity: 0.34;
  transition: opacity 220ms ease;
}
```

In the camera hook, set and clean up:

```ts
document.documentElement.dataset.vehicleChase = String(locked)
```

Add a `.rg-chase-vignette` overlay in `VehicleOverlay` that is opacity-controlled by `locked`.

- [ ] **Step 6: Run tests and production build**

Run:

```bash
pnpm test
pnpm build
```

Expected: both PASS. Do not run them concurrently because both rebuild media assets.

- [ ] **Step 7: Commit stage 4**

```bash
git add src/components/globe/VehicleOverlay.tsx \
  src/components/globe/useVehicleMotionEffects.ts \
  src/components/globe/vehicleTrail.ts \
  src/components/globe/TravelGlobe.tsx \
  src/components/globe/TravelGlobe.types.ts \
  src/components/globe/VehicleCameraStatus.tsx \
  src/styles/motion-vehicle.css src/styles/index.css
git commit -S -m "feat: render complete vehicle chase experience"
```

---

## Task 5: Regression, Browser Acceptance and Stage Merge

**Files:**
- Modify: `docs/PLAN.md`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Run all automated checks**

Run sequentially:

```bash
pnpm test
pnpm build
```

Expected: 36+ test files, all cases PASS; TypeScript and Vite production build PASS.

- [ ] **Step 2: Browser acceptance**

Run the development server:

```bash
pnpm dev
```

Verify in a desktop viewport and at 390px:

1. Select a flight track: the camera enters from behind, the aircraft starts on a warm ground guide, climbs, cruises, descends, lands and settles at the destination.
2. Select a train track: the train departs from a ground guide, accelerates, cruises, brakes and stops.
3. During chase, globe drag/zoom, city clicks and auto-rotate are locked; replay pause, speed, seek and stop remain usable.
4. Normal completion lands on the destination overview with OrbitControls restored.
5. Stop, journey switch and component unmount restore the pre-chase POV.
6. Calm/reduced motion does not enter chase mode.
7. Existing archive, journey scope, tracks, statistics, EXIF grouping and photo memory still work.

- [ ] **Step 3: Update version and documentation**

Set `package.json` version to `0.3.1`. Add a short README bullet describing the chase-camera playback and update `docs/PLAN.md` with the completed stage, test/build counts and browser acceptance result.

- [ ] **Step 4: Commit release stage**

```bash
git add package.json README.md docs/PLAN.md
git commit -S -m "chore: prepare v0.3.1 vehicle chase release"
```

- [ ] **Step 5: Merge signed stages into master**

From the primary checkout:

```bash
git switch master
git merge --no-ff -S codex/v0.3.1-vehicle-chase \
  -m "merge: complete vehicle chase camera stage"
```

Do not push and do not create a tag unless explicitly approved.

---

## Self-Review

- **Spec coverage:** Tasks 1–2 implement phase timing, altitude, duration, replay timing, camera geometry and dateline-safe world vectors. Tasks 3–4 implement the single clock, camera lock/recovery, ground guides, status and UI dimming. Task 5 covers reduced motion, normal completion, cancel recovery, responsive/regression checks and signed stage merge.
- **Placeholder scan:** No TBD/TODO placeholders; each new module has complete executable code and exact verification commands.
- **Type consistency:** `VehiclePlayback` is shared from `vehicle.ts`; `VehicleRuntimeFrame.playback` is consumed by both overlay and camera; `VehicleRuntime.subscribe` is the contract used in all integration steps.
