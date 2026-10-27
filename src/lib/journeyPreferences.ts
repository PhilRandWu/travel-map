export const JOURNEY_PREFERENCES_KEY = 'travel-map:journey-preferences'
const RECENT_LIMIT = 4

export interface JourneyPreferences {
  pinnedIds: string[]
  recentIds: string[]
}

export const EMPTY_JOURNEY_PREFERENCES: JourneyPreferences = {
  pinnedIds: [],
  recentIds: [],
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))]
}

function normalize(value: unknown): JourneyPreferences {
  if (!value || typeof value !== 'object') return EMPTY_JOURNEY_PREFERENCES
  const record = value as Record<string, unknown>
  return {
    pinnedIds: uniqueStrings(record.pinnedIds),
    recentIds: uniqueStrings(record.recentIds).slice(0, RECENT_LIMIT),
  }
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function rememberJourney(
  preferences: JourneyPreferences,
  journeyId: string,
): JourneyPreferences {
  return {
    ...preferences,
    recentIds: [
      journeyId,
      ...preferences.recentIds.filter((id) => id !== journeyId),
    ].slice(0, RECENT_LIMIT),
  }
}

export function toggleJourneyPinned(
  preferences: JourneyPreferences,
  journeyId: string,
): JourneyPreferences {
  const pinned = preferences.pinnedIds.includes(journeyId)
  return {
    ...preferences,
    pinnedIds: pinned
      ? preferences.pinnedIds.filter((id) => id !== journeyId)
      : [...preferences.pinnedIds, journeyId],
  }
}

export function loadJourneyPreferences(
  storage: Storage | null = browserStorage(),
): JourneyPreferences {
  if (!storage) return EMPTY_JOURNEY_PREFERENCES
  try {
    const raw = storage.getItem(JOURNEY_PREFERENCES_KEY)
    return raw ? normalize(JSON.parse(raw)) : EMPTY_JOURNEY_PREFERENCES
  } catch {
    return EMPTY_JOURNEY_PREFERENCES
  }
}

export function saveJourneyPreferences(
  preferences: JourneyPreferences,
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(JOURNEY_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Preferences are optional; a storage failure must not block editing.
  }
}
