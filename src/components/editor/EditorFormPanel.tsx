import type { Journey, TravelData } from '@/types'
import type {
  CompleteTripDraft,
  CompleteVisitDraft,
  TripDraft,
  VisitDraft,
} from '@/lib/editorModel'
import type { JourneyDraft } from '@/lib/journeyEditorModel'
import type { ValidationIssue } from '@/lib/validate'
import JourneyForm from '@/components/editor/JourneyForm'
import TripForm from '@/components/editor/TripForm'
import VisitForm from '@/components/editor/VisitForm'

export type EditorFormMode =
  | { kind: 'visit'; draft: VisitDraft }
  | { kind: 'trip'; draft: TripDraft }
  | { kind: 'journey'; draft: JourneyDraft }

interface Props {
  data: TravelData
  journey?: Journey
  mode: EditorFormMode
  errors: ValidationIssue[]
  onBack: () => void
  onDirtyChange: (dirty: boolean) => void
  onSubmitVisit: (draft: CompleteVisitDraft) => void
  onSubmitTrip: (draft: CompleteTripDraft) => void
  onSubmitJourney: (draft: JourneyDraft) => void
}

const FORM_LABEL = {
  visit: '到访详情',
  trip: '行程详情',
  journey: '旅程详情',
} as const

export default function EditorFormPanel({
  data,
  journey,
  mode,
  errors,
  onBack,
  onDirtyChange,
  onSubmitVisit,
  onSubmitTrip,
  onSubmitJourney,
}: Props) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-9 cursor-pointer rounded-full px-2.5 text-[11px] text-white/55 transition hover:text-white/82"
        >
          ← 返回列表
        </button>
        <span className="text-[11px] tracking-[0.1em] text-white/48">
          {FORM_LABEL[mode.kind]}
        </span>
      </div>

      {mode.kind === 'journey' ? (
        <JourneyForm
          key={mode.draft.id}
          data={data}
          draft={mode.draft}
          errors={errors}
          onDirtyChange={onDirtyChange}
          onSubmit={onSubmitJourney}
          onCancel={onBack}
        />
      ) : journey && mode.kind === 'visit' ? (
        <VisitForm
          key={mode.draft.id}
          data={data}
          journey={journey}
          draft={mode.draft}
          errors={errors}
          onDirtyChange={onDirtyChange}
          onSubmit={onSubmitVisit}
          onCancel={onBack}
        />
      ) : journey && mode.kind === 'trip' ? (
        <TripForm
          key={mode.draft.id}
          data={data}
          journey={journey}
          draft={mode.draft}
          errors={errors}
          onDirtyChange={onDirtyChange}
          onSubmit={onSubmitTrip}
          onCancel={onBack}
        />
      ) : null}
    </div>
  )
}
