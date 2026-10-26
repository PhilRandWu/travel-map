import TravelWorkspace from '@/components/app/TravelWorkspace'
import ArchiveRecovery from '@/components/common/ArchiveRecovery'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { useTravelData } from '@/hooks/useTravelData'

function AppContent() {
  const {
    data,
    issues,
    hasErrors,
    storageError,
    lastSavedAt,
    updateData,
    restoreBundledData,
    clearLocalArchive,
  } = useTravelData()

  if (!data || hasErrors) {
    return (
      <ArchiveRecovery
        issueCount={issues.filter((issue) => issue.level === 'error').length}
        onReload={() => window.location.reload()}
        onRestoreBundled={restoreBundledData}
        onClearArchive={clearLocalArchive}
      />
    )
  }

  return <TravelWorkspace
    data={data}
    storageError={storageError}
    lastSavedAt={lastSavedAt}
    onDataChange={updateData}
  />
}

export default function App() {
  return (
    <MotionProvider>
      <AppContent />
    </MotionProvider>
  )
}
