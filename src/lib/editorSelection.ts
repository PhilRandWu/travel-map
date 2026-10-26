import type { Selection, TravelData } from '@/types'

/** 编辑器删除当前选中的到访或行程后，导航应立即退回总览。 */
export function selectionWasRemoved(
  selection: Selection,
  data: TravelData,
): boolean {
  if (selection.kind === 'visit') {
    return !data.visits.some((visit) => visit.id === selection.visitId)
  }
  if (selection.kind === 'trip') {
    return !data.trips.some((trip) => trip.id === selection.tripId)
  }
  return false
}
