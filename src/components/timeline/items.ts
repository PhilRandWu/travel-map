import type { TravelData } from '@/types'
import type { TimelineNode as TimelineNodeModel } from '@/lib/derive'
import { findTrip, findVisit, photoUrl } from '@/lib/derive'
import { resolveCities } from '@/lib/cities'
import type { TimelineItem } from '@/components/timeline/TimelineNode'

const fmtDate = (date: string) => date.slice(5).replace('-', '.')

/** 将时间轴领域节点转成 UI 节点，便于组件和展示逻辑分别测试。 */
export function buildTimelineItems(
  data: TravelData,
  nodes: TimelineNodeModel[],
): TimelineItem[] {
  return nodes.map((node) => buildTimelineItem(data, node))
}

function buildTimelineItem(data: TravelData, node: TimelineNodeModel): TimelineItem {
  const cities = resolveCities(data)
  if (node.kind === 'visit') {
    const visit = findVisit(data, node.refId)
    const city = cities.get(node.cityId)
    const photo = visit?.photos[0]
    return {
      date: node.date,
      headline: city?.name ?? node.cityId,
      detail: visit?.note || (visit ? `${visit.arriveDate} 到访` : ''),
      meta: fmtDate(node.date),
      icon: 'visit',
      thumbnailUrl: visit && photo ? photoUrl(visit.id, photo.file) : undefined,
      thumbnailAlt: photo?.caption || city?.name,
    }
  }

  const trip = findTrip(data, node.refId)
  const route = trip
    ? [trip.from, ...trip.waypoints, trip.to]
        .map((id) => cities.get(id)?.name ?? id)
        .join(' → ')
    : node.label
  return {
    date: node.date,
    headline: route,
    detail: trip?.note || (trip?.type === 'flight' ? '飞机' : '高铁'),
    meta: fmtDate(node.date),
    icon: trip?.type ?? 'flight',
  }
}
