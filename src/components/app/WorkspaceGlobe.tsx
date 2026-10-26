import { lazy, Suspense } from 'react'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import GlobeFailure from '@/components/globe/GlobeFailure'
import type { TravelGlobeProps } from '@/components/globe/TravelGlobe.types'

const TravelGlobe = lazy(() => import('@/components/globe/TravelGlobe'))

interface Props extends TravelGlobeProps {
  onFailure: () => void
}

export default function WorkspaceGlobe({ onFailure, ...props }: Props) {
  return (
    <ErrorBoundary fallback={<GlobeFailure />} onError={onFailure}>
      <Suspense fallback={null}>
        <TravelGlobe {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
