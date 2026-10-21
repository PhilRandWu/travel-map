import type { Selection, TravelData } from '@/types'
import type { TimelineNode } from '@/lib/derive'
import { findVisit } from '@/lib/derive'

/** 访问/城市选中时，需要在地球上聚焦的城市。行程由轨迹中点负责取景。 */
export function getFocusedCityId(data: TravelData, selection: Selection): string | null {
  if (selection.kind === 'city') return selection.cityId
  if (selection.kind === 'visit') {
    return findVisit(data, selection.visitId)?.city ?? null
  }
  return null
}

export function selectionMatchesTimelineNode(
  selection: Selection,
  node: TimelineNode,
): boolean {
  if (selection.kind === 'visit' && node.kind === 'visit') {
    return selection.visitId === node.refId
  }
  if (selection.kind === 'trip' && node.kind === 'trip') {
    return selection.tripId === node.refId
  }
  return false
}

export function getTimelineSelectionIndex(
  nodes: TimelineNode[],
  selection: Selection,
): number {
  return nodes.findIndex((node) => selectionMatchesTimelineNode(selection, node))
}
