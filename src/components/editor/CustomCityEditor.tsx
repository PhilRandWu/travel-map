import { editorInputClass } from '@/components/editor/EditorField'

export interface CustomCityForm {
  province: string
  country: string
  lat: string
  lng: string
}

interface Props {
  name: string
  form: CustomCityForm
  valid: boolean
  onChange: (form: CustomCityForm) => void
  onCancel: () => void
  onCreate: () => void
}

export default function CustomCityEditor({
  name,
  form,
  valid,
  onChange,
  onCancel,
  onCreate,
}: Props) {
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-amber-100/14 bg-amber-100/[.045] p-3">
      <p className="text-[11px] tracking-[0.1em] text-amber-100/72">
        新建城市：{name || '未命名'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label="省份"
          value={form.province}
          placeholder="省份"
          onChange={(event) => onChange({ ...form, province: event.target.value })}
          className={editorInputClass}
        />
        <input
          aria-label="国家"
          value={form.country}
          placeholder="国家"
          onChange={(event) => onChange({ ...form, country: event.target.value })}
          className={editorInputClass}
        />
        <input
          aria-label="纬度"
          type="number"
          step="any"
          min="-90"
          max="90"
          value={form.lat}
          placeholder="纬度"
          onChange={(event) => onChange({ ...form, lat: event.target.value })}
          className={editorInputClass}
        />
        <input
          aria-label="经度"
          type="number"
          step="any"
          min="-180"
          max="180"
          value={form.lng}
          placeholder="经度"
          onChange={(event) => onChange({ ...form, lng: event.target.value })}
          className={editorInputClass}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-9 cursor-pointer rounded-full px-3 text-[11px] text-white/58 hover:text-white/84"
        >
          取消
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={onCreate}
          className="min-h-9 cursor-pointer rounded-full border border-amber-100/22 bg-amber-100/9 px-3.5 text-[11px] text-amber-50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          创建并使用
        </button>
      </div>
    </div>
  )
}
