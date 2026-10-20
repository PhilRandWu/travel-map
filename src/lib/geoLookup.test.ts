import { describe, expect, it } from 'vitest'
import { geometryBBox } from '@/lib/geoLookup'

describe('geometryBBox', () => {
  it('Polygon 返回外环包围盒', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[116, 39], [121, 39], [121, 31], [116, 31], [116, 39]]],
    }
    expect(geometryBBox(poly)).toEqual([116, 31, 121, 39])
  })

  it('MultiPolygon 合并所有子多边形', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
      ],
    }
    expect(geometryBBox(multi)).toEqual([0, 0, 12, 12])
  })

  it('GeometryCollection 递归合并子几何', () => {
    const collection: GeoJSON.GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [-10, 5] },
        { type: 'LineString', coordinates: [[0, 0], [3, 8]] },
      ],
    }
    expect(geometryBBox(collection)).toEqual([-10, 0, 3, 8])
  })

  it('跨 180° 经线的几何返回 null（放弃预筛）', () => {
    const antimeridian: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[179, 0], [-179, 0], [-179, 10], [179, 10], [179, 0]]],
    }
    expect(geometryBBox(antimeridian)).toBeNull()
  })

  it('空 GeometryCollection 返回 null', () => {
    expect(geometryBBox({ type: 'GeometryCollection', geometries: [] })).toBeNull()
  })
})
