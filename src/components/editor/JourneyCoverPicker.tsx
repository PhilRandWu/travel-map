import type { JourneyCoverPhoto, TravelData } from '@/types'
import { listJourneyCoverOptions } from '@/lib/journeyEditorModel'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  data: TravelData
  journeyId: string
  covers: JourneyCoverPhoto[]
  onChange: (covers: JourneyCoverPhoto[]) => void
}

const coverKey = (cover: JourneyCoverPhoto) => `${cover.visitId}/${cover.file}`

export default function JourneyCoverPicker({
  data,
  journeyId,
  covers,
  onChange,
}: Props) {
  const options = listJourneyCoverOptions(data, journeyId)
  const selected = new Set(covers.map(coverKey))

  const toggle = (visitId: string, file: string) => {
    const key = `${visitId}/${file}`
    if (selected.has(key)) {
      onChange(covers.filter((cover) => coverKey(cover) !== key))
      return
    }
    if (covers.length >= 5) return
    onChange([...covers, { visitId, file }])
  }

  return (
    <section aria-labelledby="journey-covers-title" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id="journey-covers-title"
          className="text-[11px] tracking-[0.12em] text-white/62"
        >
          封面照片
        </h3>
        <span className="font-mono text-[10px] tabular-nums text-white/48">
          {covers.length} / 5
        </span>
      </div>

      {options.length === 0 ? (
        <p className="rounded-xl border border-white/9 bg-white/[.025] px-3 py-3 text-[11px] leading-relaxed text-white/48">
          先为本旅程添加到访和照片，再从已有照片中选择封面。
        </p>
      ) : (
        <div className="rg-scroll grid max-h-56 grid-cols-2 gap-2 overflow-y-auto overscroll-contain rounded-xl border border-white/8 bg-white/[.02] p-2">
          {options.map(({ visit, photo, cityName }) => {
            const key = `${visit.id}/${photo.file}`
            const active = selected.has(key)
            const disabled = !active && covers.length >= 5

            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={`${active ? '取消' : '选择'}封面：${cityName} ${photo.caption ?? photo.file}`}
                disabled={disabled}
                onClick={() => toggle(visit.id, photo.file)}
                className={`group overflow-hidden rounded-lg border text-left transition ${
                  active
                    ? 'border-amber-100/45 bg-amber-100/8'
                    : 'border-white/8 bg-white/[.025] hover:border-white/20'
                } disabled:cursor-not-allowed disabled:opacity-35`}
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-white/[.04]">
                  <img
                    src={photoVariantUrl(visit.id, photo.file, 'sm')}
                    alt=""
                    width={160}
                    height={120}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span
                    className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                      active
                        ? 'bg-amber-100/90 text-[#171208]'
                        : 'border border-white/20 bg-black/45 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </span>
                <span className="block truncate px-2.5 py-2 text-[10px] text-white/56">
                  {cityName} · {photo.caption ?? photo.file}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
