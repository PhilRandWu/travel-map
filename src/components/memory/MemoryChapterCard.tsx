interface Props {
  date: string
  cityName: string
}

export default function MemoryChapterCard({ date, cityName }: Props) {
  const [year = '', month = 0, day = 0] = date.split('-')
  return (
    <div
      aria-hidden="true"
      className="rg-memory-chapter pointer-events-none absolute inset-0 z-40 overflow-hidden bg-[#090b0e]"
    >
      <div aria-hidden className="rg-memory-chapter-grid" />
      <div aria-hidden className="rg-memory-chapter-orbit" />
      <div className="rg-memory-chapter-inner">
        <div className="rg-memory-chapter-left">
          <span>CHAPTER TRANSITION</span>
          <b>{year}</b>
        </div>
        <div className="rg-memory-chapter-center">
          <span className="rg-memory-chapter-date">{Number(month)} 月 {Number(day)} 日</span>
          <i aria-hidden />
          <h2>{cityName}</h2>
        </div>
        <div className="rg-memory-chapter-right">
          <span>LOCATION LOGGED</span>
          <b>{cityName.slice(0, 1)}</b>
        </div>
      </div>
      <div className="rg-memory-grain-flash absolute inset-0" />
    </div>
  )
}
