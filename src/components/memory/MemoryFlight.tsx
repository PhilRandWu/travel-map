import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  src: string
  from: CSSProperties
  to: CSSProperties
}

export default function MemoryFlight({ src, from, to }: Props) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <img
      aria-hidden="true"
      src={src}
      alt=""
      className="rg-memory-flight pointer-events-none fixed z-[85] border border-[var(--rg-memory-line)] object-cover shadow-[0_30px_100px_rgba(0,0,0,.7)]"
      style={{
        ...(active ? to : from),
        transition:
          'left 650ms var(--rg-ease-enter), top 650ms var(--rg-ease-enter), '
          + 'width 650ms var(--rg-ease-enter), height 650ms var(--rg-ease-enter), '
          + 'transform 650ms var(--rg-ease-enter)',
      }}
    />
  )
}
