'use client'
import { useEffect, useState } from 'react'
import type { Article } from '@/lib/types'
import { getBookmarks } from '@/lib/bookmarks'
import { renderArticleStream, OnArticleClick } from '@/components/FeedCards'

interface Props {
  onClose: () => void
  onArticleClick: OnArticleClick
}

export function BookmarksTab({ onClose, onArticleClick }: Props) {
  const [bookmarks, setBookmarks] = useState<Article[]>([])

  useEffect(() => {
    setBookmarks(getBookmarks().map(b => ({ ...b, score: 0, content: undefined })))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg0)', overflowY: 'auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', gap: 12,
        padding: '54px 20px 16px', background: 'var(--bg0)', borderBottom: '0.5px solid var(--line)' }}>
        <div onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)', border: '0.5px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 16, color: 'var(--t3)' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em' }}>Gespeichert</div>
      </div>

      {bookmarks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 20px' }}>
          <i className="ti ti-bookmark" style={{ fontSize: 32, color: 'var(--t5)' }} />
          <div style={{ fontSize: 15, color: 'var(--t3)', textAlign: 'center' }}>Noch nichts gespeichert.</div>
          <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', lineHeight: 1.6 }}>
            Tippe auf das Lesezeichen-Icon,<br />um Artikel zu speichern.
          </div>
        </div>
      ) : (
        <>
          {renderArticleStream(bookmarks, a => onArticleClick(a))}
          <div style={{ height: 20 }} />
        </>
      )}
    </div>
  )
}
