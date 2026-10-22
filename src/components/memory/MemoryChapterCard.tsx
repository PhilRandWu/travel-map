interface Props {
  date: string
  cityName: string
}

export default function MemoryChapterCard({ date, cityName }: Props) {
  const [, month = 0, day = 0] = date.split('-').map(Number)
  return (
    <div
      aria-hidden="true"
      className="rg-memory-chapter pointer-events-none absolute inset-0 z-20 grid grid-cols-2 overflow-hidden bg-[#0c0907]"
    >
      <div className="rg-memory-chapter-left flex items-center justify-end pr-8 font-mono text-[#f5ead8]/70">
        {month} 月 {day} 日
      </div>
      <div className="rg-memory-chapter-right flex items-center border-l border-[#f5ead8]/12 pl-8 font-serif text-4xl text-[#f5ead8]">
        {cityName}
      </div>
      <div className="rg-memory-grain-flash absolute inset-0" />
    </div>
  )
}
