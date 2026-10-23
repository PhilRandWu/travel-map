import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { haversineKm } from '@/lib/geo'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, sampleVehicleRoute } from '@/lib/vehicle'

const d = data as TravelData
const { flights, trains } = buildTracks(d)

describe('buildVehicleRoute', () => {
  it('航班使用高空大圆采样路径', () => {
    const route = buildVehicleRoute(flights[0])
    expect(route.type).toBe('flight')
    expect(route.altitude).toBe(flights[0].altitude)
    expect(route.points[0]).toEqual([flights[0].startLat, flights[0].startLng])
    expect(route.points.at(-1)).toEqual([flights[0].endLat, flights[0].endLng])
  })

  it('高铁使用按累计距离等距采样的贴地路径', () => {
    const route = buildVehicleRoute(trains[0])
    expect(route.type).toBe('train')
    expect(route.altitude).toBe(0.004)
    expect(route.points[0]).toEqual(trains[0].points[0])
    expect(route.points.at(-1)).toEqual(trains[0].points.at(-1))

    const distances = route.points.slice(1).map((point, index) => {
      const previous = route.points[index]
      return haversineKm(
        { lat: previous[0], lng: previous[1] },
        { lat: point[0], lng: point[1] },
      )
    })
    const shortest = Math.min(...distances)
    const longest = Math.max(...distances)
    expect(longest / shortest).toBeLessThan(1.01)
  })
})

describe('sampleVehicleRoute', () => {
  const trainRoute = buildVehicleRoute(trains[0])

  it('高铁全程保持贴地高度', () => {
    expect(sampleVehicleRoute(trainRoute, 0)).toMatchObject({
      lat: trainRoute.points[0][0],
      lng: trainRoute.points[0][1],
      altitude: 0.004,
    })
    expect(sampleVehicleRoute(trainRoute, 0.5).altitude).toBe(0.004)
    expect(sampleVehicleRoute(trainRoute, 1)).toMatchObject({
      lat: trainRoute.points.at(-1)![0],
      lng: trainRoute.points.at(-1)![1],
      altitude: 0.004,
    })
  })

  it('起终点和中间进度都在路径上', () => {
    const mid = sampleVehicleRoute(trainRoute, 0.5)
    expect(mid.lat).toBeGreaterThan(30)
    expect(mid.lat).toBeLessThan(40)
  })

  it('飞机端点落地，并在中点达到弧顶', () => {
    const flightRoute = buildVehicleRoute(flights[0])
    expect(sampleVehicleRoute(flightRoute, 0).altitude).toBe(0)
    expect(sampleVehicleRoute(flightRoute, 0.5).altitude).toBeCloseTo(
      flightRoute.altitude,
      10,
    )
    expect(sampleVehicleRoute(flightRoute, 1).altitude).toBe(0)
  })

  it('进度值会被夹在 0–1', () => {
    expect(sampleVehicleRoute(trainRoute, -0.2).lat).toBe(trainRoute.points[0][0])
    expect(sampleVehicleRoute(trainRoute, 1.2).lat).toBe(trainRoute.points.at(-1)![0])
  })
})
