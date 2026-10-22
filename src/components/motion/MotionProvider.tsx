import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAdaptiveMotion } from '@/components/motion/useAdaptiveMotion'
import { usePageVisibility } from '@/components/motion/usePageVisibility'
import {
  MOTION_STORAGE_KEY,
  normalizeMotionLevel,
  resolveMotionLevel,
  type MotionLevel,
} from '@/lib/motion'

interface MotionContextValue {
  userLevel: MotionLevel
  effectiveLevel: MotionLevel
  reducedMotion: boolean
  touchDevice: boolean
  pageVisible: boolean
  setUserLevel: (level: MotionLevel) => void
}

const MotionContext = createContext<MotionContextValue | null>(null)
const COARSE_POINTER_QUERY = '(pointer: coarse)'

function mediaMatches(query: string): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => mediaMatches(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function storedMotionLevel(): MotionLevel {
  try {
    return normalizeMotionLevel(localStorage.getItem(MOTION_STORAGE_KEY))
  } catch {
    return 'cinematic'
  }
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [userLevel, setUserLevelState] = useState<MotionLevel>(storedMotionLevel)
  const reducedMotion = useReducedMotion()
  const touchDevice = useMedia(COARSE_POINTER_QUERY)
  const pageVisible = usePageVisibility()
  const { cap } = useAdaptiveMotion(reducedMotion ? 'calm' : userLevel)
  const effectiveLevel = resolveMotionLevel(
    userLevel,
    touchDevice,
    reducedMotion,
    cap,
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = effectiveLevel
    root.dataset.reducedMotion = String(reducedMotion)
    root.dataset.animationPaused = String(!pageVisible)
  }, [effectiveLevel, pageVisible, reducedMotion])

  const setUserLevel = useCallback((level: MotionLevel) => {
    setUserLevelState(level)
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, level)
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [])

  const value = useMemo(() => ({
    userLevel,
    effectiveLevel,
    reducedMotion,
    touchDevice,
    pageVisible,
    setUserLevel,
  }), [
    effectiveLevel,
    pageVisible,
    reducedMotion,
    setUserLevel,
    touchDevice,
    userLevel,
  ])

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  )
}

export function useMotion() {
  const value = useContext(MotionContext)
  if (!value) throw new Error('useMotion must be used inside MotionProvider')
  return value
}
