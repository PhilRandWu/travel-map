const DUST = Array.from({ length: 20 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 19) % 100}%`,
  delay: `${-(index % 7) * 1.7}s`,
  duration: `${12 + (index % 5) * 1.4}s`,
}))

export default function AmbientDust() {
  return (
    <div
      aria-hidden="true"
      className="rg-ambient-dust pointer-events-none absolute inset-0 overflow-hidden"
    >
      {DUST.map((dust, index) => (
        <span
          key={index}
          data-animation="ambient-dust"
          style={{
            left: dust.left,
            top: dust.top,
            animationDelay: dust.delay,
            animationDuration: dust.duration,
          }}
        />
      ))}
    </div>
  )
}
