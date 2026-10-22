import TravelWorkspace from '@/components/app/TravelWorkspace'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { useTravelData } from '@/hooks/useTravelData'

function AppContent() {
  const { data, hasErrors } = useTravelData()

  if (!data || hasErrors) {
    return (
      <main className="grid h-[100svh] place-items-center bg-[#02030a] px-6 font-sans text-white">
        <div className="max-w-md rounded-2xl border border-red-200/15 bg-red-200/[.035] px-6 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <p className="font-mono text-[10px] tracking-[0.24em] text-red-100/45">
            ARCHIVE INTERRUPTED
          </p>
          <p className="mt-2 text-sm leading-relaxed text-red-100/75">
            旅行数据校验失败，请打开控制台查看具体记录。
          </p>
        </div>
      </main>
    )
  }

  return <TravelWorkspace data={data} />
}

export default function App() {
  return (
    <MotionProvider>
      <AppContent />
    </MotionProvider>
  )
}
