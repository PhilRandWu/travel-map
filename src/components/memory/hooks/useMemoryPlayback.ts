import { useEffect, useRef, useState } from 'react'

interface Options {
  photoCount: number
  index: number
  onIndex: (index: number) => void
  reducedMotion: boolean
}

type MemorySpeed = 0.5 | 1 | 2

const SLIDE_MS = 5000
const TICK_MS = 100

export function useMemoryPlayback({
  photoCount,
  index,
  onIndex,
  reducedMotion,
}: Options) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState<MemorySpeed>(1)
  const [progress, setProgress] = useState(0)
  const [finished, setFinished] = useState(false)
  const elapsedRef = useRef(0)

  const pause = () => setPlaying(false)

  const toggle = () => {
    if (reducedMotion || photoCount <= 1) return
    if (finished) {
      setFinished(false)
      setProgress(0)
      elapsedRef.current = 0
    }
    setPlaying((value) => !value)
  }

  const setSpeed = (value: MemorySpeed) => {
    setSpeedState(value)
    elapsedRef.current = 0
    setProgress(0)
  }

  useEffect(() => {
    elapsedRef.current = 0
    setProgress(0)
    if (index < photoCount - 1) setFinished(false)
  }, [index, photoCount])

  useEffect(() => {
    if (!playing) return

    const onVisibility = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const timer = window.setInterval(() => {
      elapsedRef.current += TICK_MS * speed
      const nextProgress = Math.min(1, elapsedRef.current / SLIDE_MS)
      setProgress(nextProgress)

      if (nextProgress < 1) return
      elapsedRef.current = 0
      if (index >= photoCount - 1) {
        pause()
        setFinished(true)
        return
      }
      onIndex(index + 1)
    }, TICK_MS)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [index, onIndex, photoCount, playing, speed])

  return {
    playing,
    speed,
    progress,
    finished,
    toggle,
    pause,
    setSpeed,
  }
}
