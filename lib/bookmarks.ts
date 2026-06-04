const STORAGE_KEY = 'briefly_bookmarks'

export interface BookmarkedArticle {
  id: string
  title: string
  url: string
  source: string
  topic: string
  publishedAt: string
  savedAt: string
}

export function getBookmarks(): BookmarkedArticle[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

export function addBookmark(article: Omit<BookmarkedArticle, 'savedAt'>): void {
  const bookmarks = getBookmarks()
  if (bookmarks.find(b => b.id === article.id)) return
  bookmarks.unshift({ ...article, savedAt: new Date().toISOString() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks.slice(0, 100)))
}

export function removeBookmark(id: string): void {
  const bookmarks = getBookmarks().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().some(b => b.id === id)
}
