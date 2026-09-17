/** Vite base path helper for GitHub Pages (/repo-name/). */
export function withBase(path = '') {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  if (!path) return normalizedBase || '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}` || normalizedPath
}

/** Absolute URL inside this deployed app (respects GitHub Pages subpath). */
export function appUrl(path = '') {
  return `${window.location.origin}${withBase(path)}`
}
