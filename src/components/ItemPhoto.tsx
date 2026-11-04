import { useState } from 'react'
import type { MenuItem } from '../constants/menu'
import { photoFor, usePhotoOverrides } from '../services/menuPhotos'
import { cn } from './ui'

interface Props {
  item: Pick<MenuItem, 'id' | 'name' | 'image'>
  /** Above the fold: load right away instead of lazily. */
  eager?: boolean
  /** Sold out: shown in grey. */
  dimmed?: boolean
  className?: string
}

/**
 * An item's photo, square and cropped to fill, or its first letter when it has none
 * (or the photo fails to load). Decorative: the item's name is always next to it.
 */
export default function ItemPhoto({ item, eager, dimmed, className }: Props) {
  const overrides = usePhotoOverrides()
  const src = photoFor(item, overrides)
  const [failed, setFailed] = useState<string | null>(null)
  const show = src && failed !== src

  return (
    <div className={cn('relative overflow-hidden bg-surface-2 [container-type:inline-size]', className)} aria-hidden>
      {show ? (
        <img
          src={src}
          alt=""
          width={640}
          height={640}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(src)}
          className={cn('h-full w-full object-cover', dimmed && 'opacity-50 grayscale')}
        />
      ) : (
        <span className={cn('flex h-full w-full items-center justify-center font-display text-[min(40cqw,4rem)] text-ink-muted', dimmed && 'opacity-60')}>
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
