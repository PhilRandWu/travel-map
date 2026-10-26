export default function GlobeFailure() {
  return (
    <div
      role="alert"
      className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#0b1730_0%,#050815_55%,#02030a_100%)] px-6"
    >
      <div className="max-w-sm rounded-2xl border border-amber-100/15 bg-amber-100/[.035] px-6 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <p className="font-mono text-[9px] tracking-[0.24em] text-amber-100/45">
          GLOBE UNAVAILABLE
        </p>
        <h2 className="mt-2 font-serif text-xl text-white/88">
          3D 地球暂时无法显示
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/42">
          浏览器未能创建 WebGL 场景。旅行数据与编辑器仍可继续使用，建议导出 JSON 备份后再重新加载。
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 cursor-pointer rounded-full border border-amber-100/20 bg-amber-100/8 px-4 py-2 text-xs text-amber-50/78 transition hover:bg-amber-100/14"
        >
          重新加载页面
        </button>
      </div>
    </div>
  )
}
