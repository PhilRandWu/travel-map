import type { CSSProperties } from 'react'
import type {
  ConstellationMap,
  ConstellationNode,
} from '@/lib/constellation'
import { memoryDateParts } from '@/lib/memoryPresentation'
import { photoObjectPosition, photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  map: ConstellationMap
  visibleNodes: ConstellationNode[]
  onOpenPhoto: (index: number, sourceRect: DOMRect) => void
}

export default function ConstellationBoard({
  map,
  visibleNodes,
  onOpenPhoto,
}: Props) {
  return (
    <div
      className="rg-memory-atlas"
      style={{ width: map.width, height: map.height }}
    >
      <div aria-hidden className="rg-memory-atlas-grid" />
      <div aria-hidden className="rg-memory-atlas-stars" />

      <svg
        aria-hidden
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="rg-memory-atlas-route"
      >
        <path d={map.path} className="rg-memory-atlas-route-echo" />
        <path d={map.path} className="rg-memory-atlas-route-line" />
        {map.chapters.map((marker) => (
          <g key={marker.chapter.key}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r="4"
              className="rg-memory-atlas-route-node"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r="18"
              className="rg-memory-atlas-route-halo"
            />
          </g>
        ))}
      </svg>

      <div className="rg-memory-atlas-heading">
        <span>TRAVEL MEMORY ATLAS</span>
        <h2>把旅程摊开，成为一片可漫游的夜空。</h2>
        <p>选择任意一帧进入逐张回忆</p>
      </div>

      {map.chapters.map((marker) => {
        const date = memoryDateParts(marker.chapter.arriveDate)
        return (
          <div
            key={marker.chapter.key}
            className="rg-memory-atlas-chapter"
            style={{
              left: marker.x,
              top: marker.y,
              zIndex: 4 + marker.chapterIndex,
              '--rg-chapter-order': marker.chapterIndex,
            } as CSSProperties}
          >
            <span>{String(marker.chapterIndex + 1).padStart(2, '0')}</span>
            <p>{date ? `${date.monthShort} ${date.day}` : marker.chapter.arriveDate}</p>
            <h3>{marker.chapter.cityName}</h3>
            <i>{String(marker.chapter.photos.length).padStart(2, '0')} FRAMES</i>
          </div>
        )
      })}

      {visibleNodes.map((node) => (
        <button
          key={node.photo.key}
          type="button"
          data-photo-key={node.photo.key}
          data-depth={node.chapterIndex % 3}
          data-hero={node.photoIndex === 0 || undefined}
          aria-label={`打开${node.photo.cityName}照片：${node.photo.caption ?? node.photo.file}`}
          onClick={(event) => onOpenPhoto(
            node.globalIndex,
            event.currentTarget.getBoundingClientRect(),
          )}
          className="rg-memory-constellation-card"
          style={{
            left: node.x - node.width / 2,
            top: node.y - node.height / 2,
            width: node.width,
            height: node.height,
            zIndex: 10 + Math.round(node.y),
            transform: `rotate(${node.rotation}deg) scale(${node.scale})`,
            '--rg-card-rotation': `${node.rotation}deg`,
            '--rg-node-order': node.chapterIndex * 8 + node.photoIndex,
          } as CSSProperties}
        >
          <span aria-hidden className="rg-memory-card-frame" />
          <img
            src={photoVariantUrl(node.photo.visitId, node.photo.file, 'md')}
            alt=""
            loading="lazy"
            style={{ objectPosition: photoObjectPosition(node.photo.focalPoint) }}
          />
          <span aria-hidden className="rg-memory-card-shade" />
          <span className="rg-memory-card-index">
            {String(node.globalIndex + 1).padStart(2, '0')}
          </span>
          {node.photo.featured && (
            <span className="rg-memory-card-featured">精选</span>
          )}
          <span className="rg-memory-card-caption">
            <b>{node.photo.caption || node.photo.file}</b>
            <i>{node.photo.takenAt?.slice(11, 16) ?? 'UNDATED'}</i>
          </span>
        </button>
      ))}
    </div>
  )
}
