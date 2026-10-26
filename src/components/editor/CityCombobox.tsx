import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { City, TravelData } from '@/types'
import { createCustomCity, searchCities } from '@/lib/editorModel'
import { EditorField, editorInputClass } from '@/components/editor/EditorField'
import CustomCityEditor, {
  type CustomCityForm,
} from '@/components/editor/CustomCityEditor'

interface Props {
  data: TravelData
  label: string
  value: City | null
  onChange: (city: City | null) => void
  excludeCityIds?: string[]
  hint?: string
  autoFocus?: boolean
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

export default function CityCombobox({
  data,
  label,
  value,
  onChange,
  excludeCityIds = [],
  hint,
  autoFocus = false,
}: Props) {
  const id = useId()
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [creating, setCreating] = useState(false)
  const [custom, setCustom] = useState<CustomCityForm>({
    province: '',
    country: '中国',
    lat: '',
    lng: '',
  })

  const excluded = useMemo(() => new Set(excludeCityIds), [excludeCityIds])
  const allMatches = useMemo(() => searchCities(data, query), [data, query])
  const matches = allMatches.filter((city) => !excluded.has(city.id))
  const exactMatch = allMatches.find((city) => (
    normalize(city.name) === normalize(query) || normalize(city.id) === normalize(query)
  ))
  const exactAvailable = matches.find((city) => (
    normalize(city.name) === normalize(query) || normalize(city.id) === normalize(query)
  ))
  const excludedMatch = allMatches.find((city) => excluded.has(city.id))
  const showCreate = query.trim() !== '' && !exactMatch && !excludedMatch
  const optionCount = matches.length + (showCreate ? 1 : 0)
  const latitude = Number(custom.lat)
  const longitude = Number(custom.lng)
  const customValid = query.trim() !== ''
    && custom.lat.trim() !== ''
    && custom.lng.trim() !== ''
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180

  useEffect(() => {
    if (value) setQuery(value.name)
  }, [value?.id, value?.name])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (activeIndex < 0) return
    document
      .getElementById(`${listId}-${activeIndex}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, listId])

  const selectCity = (city: City) => {
    onChange(city)
    setQuery(city.name)
    setOpen(false)
    setCreating(false)
    setActiveIndex(-1)
  }

  const handleQuery = (next: string) => {
    setQuery(next)
    setOpen(true)
    setCreating(false)
    setActiveIndex(-1)
    if (value) onChange(null)
  }

  const startCustomCity = () => {
    setCreating(true)
    setOpen(false)
    setActiveIndex(-1)
  }

  const submitCustomCity = () => {
    if (!customValid) return
    selectCity(createCustomCity(data, {
      name: query,
      province: custom.province,
      country: custom.country,
      lat: latitude,
      lng: longitude,
    }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, optionCount - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, -1))
      return
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (activeIndex >= 0 && activeIndex < matches.length) {
        selectCity(matches[activeIndex])
      } else if (activeIndex === matches.length && showCreate) {
        startCustomCity()
      } else if (exactAvailable) {
        selectCity(exactAvailable)
      }
      return
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      setCreating(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <EditorField id={id} label={label} hint={hint}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder="搜索城市名、省份或 id"
          onChange={(event) => handleQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={editorInputClass}
        />
      </EditorField>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="rg-scroll absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-white/12 bg-[rgba(5,9,20,.97)] p-1 shadow-[0_18px_60px_rgba(0,0,0,.65)] backdrop-blur-xl"
        >
          {matches.map((city, index) => (
            <li
              key={city.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectCity(city)}
              className={`cursor-pointer rounded-lg px-2.5 py-2 text-xs transition ${
                activeIndex === index
                  ? 'bg-cyan-100/10 text-cyan-50'
                  : 'text-white/62 hover:bg-white/6 hover:text-white/88'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span>{city.name}</span>
                <span className="font-mono text-[10px] text-white/46">
                  {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                </span>
              </span>
              <span className="mt-0.5 block text-[10px] text-white/44">
                {city.province} · {city.country} · {city.id}
              </span>
            </li>
          ))}
          {showCreate && (
            <li
              id={`${listId}-${matches.length}`}
              role="option"
              aria-selected={activeIndex === matches.length}
              onMouseDown={(event) => event.preventDefault()}
              onClick={startCustomCity}
              className={`cursor-pointer rounded-lg px-2.5 py-2 text-xs transition ${
                activeIndex === matches.length
                  ? 'bg-amber-100/10 text-amber-50'
                  : 'text-amber-100/60 hover:bg-amber-100/8'
              }`}
            >
              新建城市「{query.trim()}」并填写坐标
            </li>
          )}
          {excludedMatch && (
            <li className="px-2.5 py-2 text-[11px] leading-relaxed text-white/55">
              「{excludedMatch.name}」是常居城市，不能创建旅行到访。
            </li>
          )}
          {matches.length === 0 && !showCreate && !excludedMatch && (
            <li className="px-2.5 py-2 text-xs text-white/52">没有匹配的城市</li>
          )}
        </ul>
      )}

      {value && (
        <p className="mt-1 font-mono text-[10px] tracking-[0.06em] text-cyan-100/60">
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)} · {value.province}
        </p>
      )}

      {creating && (
        <CustomCityEditor
          name={query}
          form={custom}
          valid={customValid}
          onChange={setCustom}
          onCancel={() => setCreating(false)}
          onCreate={submitCustomCity}
        />
      )}
    </div>
  )
}
