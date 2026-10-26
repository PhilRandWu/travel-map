import { useCallback, useEffect, useRef, useState } from 'react'
import type { TravelData } from '@/types'
import {
  createTripDraft,
  createVisitDraft,
  editTripDraft,
  editVisitDraft,
  newEditorErrors,
  removeTrip,
  removeVisit,
  saveTrip,
  saveVisit,
  type CompleteTripDraft,
  type CompleteVisitDraft,
} from '@/lib/editorModel'
import {
  createJourneyDraft,
  duplicateJourneySettings,
  editJourneyDraft,
  removeJourney,
  resolveActiveJourneyId,
  saveJourney,
  type JourneyDraft,
} from '@/lib/journeyEditorModel'
import { pruneStoredPhotos } from '@/lib/localPhotoStore'
import type { ValidationIssue } from '@/lib/validate'
import { useEditorExitGuard } from '@/hooks/useEditorExitGuard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import DataArchivePanel from '@/components/editor/DataArchivePanel'
import EditorDrawer from '@/components/editor/EditorDrawer'
import EditorFormPanel, {
  type EditorFormMode,
} from '@/components/editor/EditorFormPanel'
import EditorJourneyBar from '@/components/editor/EditorJourneyBar'
import EditorListPanel, {
  type EditorDeleteTarget,
  type EditorTab,
} from '@/components/editor/EditorListPanel'

interface Props {
  data: TravelData
  storageError: string | null
  lastSavedAt?: string | null
  initialJourneyId?: string
  onChange: (data: TravelData) => void
  onClose: () => void
}

type Mode = { kind: 'list' } | EditorFormMode

export default function TravelEditor({
  data,
  storageError,
  lastSavedAt = null,
  initialJourneyId,
  onChange,
  onClose,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null)
  const initialId = resolveActiveJourneyId(data.journeys, initialJourneyId)
  const [journeyId, setJourneyId] = useState(initialId)
  const [tab, setTab] = useState<EditorTab>('visits')
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [errors, setErrors] = useState<ValidationIssue[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EditorDeleteTarget | null>(null)
  const [formDirty, setFormDirty] = useState(false)
  const journey = data.journeys.find((item) => item.id === journeyId)

  useFocusTrap(drawerRef, '[data-editor-trigger]')

  const backToList = useCallback(() => {
    setMode({ kind: 'list' })
    setErrors([])
    setFormDirty(false)
  }, [])
  const discardDraftPhotos = useCallback(() => {
    void pruneStoredPhotos(data)
  }, [data])
  const {
    pendingExit,
    requestClose,
    requestBack,
    confirmDiscard,
    cancelExit,
  } = useEditorExitGuard({
    dirty: formDirty,
    onDiscard: discardDraftPhotos,
    onClose,
    onBack: backToList,
  })
  const formOpen = mode.kind !== 'list'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (formOpen) requestBack()
      else requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [formOpen, requestBack, requestClose])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  const commit = (next: TravelData, message: string, nextJourneyId?: string) => {
    const nextErrors = newEditorErrors(data, next)
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }
    onChange(next)
    if (nextJourneyId !== undefined) setJourneyId(nextJourneyId)
    setErrors([])
    setMode({ kind: 'list' })
    setFormDirty(false)
    setNotice(message)
  }

  const changeJourney = (nextId: string) => {
    setJourneyId(nextId)
    setMode({ kind: 'list' })
    setErrors([])
    setNotice(null)
    setDeleteTarget(null)
    setFormDirty(false)
  }

  const beginNewVisit = () => {
    if (!journey) return
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'visit', draft: createVisitDraft(data, journey) })
  }

  const beginNewTrip = () => {
    if (!journey) return
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'trip', draft: createTripDraft(data, journey) })
  }

  const beginNewJourney = () => {
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'journey', draft: createJourneyDraft(data) })
  }

  const editCurrentJourney = () => {
    if (!journey) return
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'journey', draft: editJourneyDraft(journey) })
  }

  const duplicateCurrentJourney = () => {
    if (!journey) return
    const result = duplicateJourneySettings(data, journey.id)
    if (!result) return
    commit(result.data, '旅程设置已复制', result.journeyId)
  }

  const deleteCurrentJourney = () => {
    if (!journey) return
    const next = removeJourney(data, journey.id)
    const nextJourneyId = resolveActiveJourneyId(next.journeys)
    commit(next, '旅程已删除', nextJourneyId)
  }

  const submitVisit = (draft: CompleteVisitDraft) => {
    commit(saveVisit(data, draft), '到访已保存')
  }

  const submitTrip = (draft: CompleteTripDraft) => {
    commit(saveTrip(data, draft), '行程已保存')
  }

  const submitJourney = (draft: JourneyDraft) => {
    const isNew = !data.journeys.some((item) => item.id === draft.id)
    commit(
      saveJourney(data, draft),
      isNew ? '旅程已创建' : '旅程已更新',
      draft.id,
    )
  }

  const editVisit = (visitId: string) => {
    const visit = data.visits.find((item) => item.id === visitId)
    if (!visit) return
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'visit', draft: editVisitDraft(data, visit) })
  }

  const editTrip = (tripId: string) => {
    const trip = data.trips.find((item) => item.id === tripId)
    if (!trip) return
    setErrors([])
    setFormDirty(false)
    setMode({ kind: 'trip', draft: editTripDraft(data, trip) })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const next = deleteTarget.kind === 'visit'
      ? removeVisit(data, deleteTarget.id)
      : removeTrip(data, deleteTarget.id)
    commit(next, deleteTarget.kind === 'visit' ? '到访已删除' : '行程已删除')
    setDeleteTarget(null)
  }

  const replaceImportedData = (next: TravelData) => {
    onChange(next)
    const nextJourneyId = resolveActiveJourneyId(next.journeys, journeyId)
    setJourneyId(nextJourneyId)
    setMode({ kind: 'list' })
    setErrors([])
    setDeleteTarget(null)
    setFormDirty(false)
  }

  return (
    <EditorDrawer
      drawerRef={drawerRef}
      storageError={storageError}
      lastSavedAt={lastSavedAt}
      pendingExit={pendingExit}
      onClose={requestClose}
      onContinue={cancelExit}
      onDiscard={confirmDiscard}
    >
      <EditorJourneyBar
        data={data}
        journeys={data.journeys}
        journeyId={journeyId}
        disabled={formOpen}
        onChange={changeJourney}
        onNew={beginNewJourney}
        onEdit={editCurrentJourney}
        onDuplicate={duplicateCurrentJourney}
        onDelete={deleteCurrentJourney}
      />

      {mode.kind !== 'list' ? (
        <EditorFormPanel
          data={data}
          journey={journey}
          mode={mode}
          errors={errors}
          onBack={requestBack}
          onDirtyChange={setFormDirty}
          onSubmitVisit={submitVisit}
          onSubmitTrip={submitTrip}
          onSubmitJourney={submitJourney}
        />
      ) : !journey ? (
        <p className="mt-6 rounded-xl border border-white/9 bg-white/[.025] px-4 py-5 text-center text-xs leading-relaxed text-white/54">
          还没有旅程。点击「新增旅程」开始，或导入完整旅行 JSON。
        </p>
      ) : (
        <EditorListPanel
          data={data}
          journey={journey}
          tab={tab}
          deleteTarget={deleteTarget}
          onTab={setTab}
          onNewVisit={beginNewVisit}
          onNewTrip={beginNewTrip}
          onEditVisit={editVisit}
          onEditTrip={editTrip}
          onDeleteTarget={setDeleteTarget}
          onConfirmDelete={confirmDelete}
        />
      )}
      {mode.kind === 'list' && notice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-300/7 px-3 py-2 text-[11px] text-emerald-100/70"
        >
          {notice}
        </p>
      )}
      {mode.kind === 'list' && (
        <DataArchivePanel
          data={data}
          storageError={storageError}
          lastSavedAt={lastSavedAt}
          onChange={replaceImportedData}
        />
      )}
    </EditorDrawer>
  )
}
