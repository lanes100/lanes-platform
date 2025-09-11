import React, { useEffect, useMemo, useState } from 'react'

// Always load JSON from GitHub (no fallback)
const RAW_JSON_URL = 'https://raw.githubusercontent.com/lanes100/lanes-platform/main/platform.json'

export default function App() {
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem('pp_dark')
    if (saved) setDark(saved === '1')
  }, [])
  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('pp_dark', dark ? '1' : '0')
  }, [dark])

  // Fetch platform.json (always)
  useEffect(() => {
    const ac = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${RAW_JSON_URL}?t=${Date.now()}`, { cache: 'no-store', signal: ac.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!json?.sections?.length) throw new Error('Invalid JSON (no sections)')
        setData(json)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Failed to load platform.json')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => ac.abort()
  }, [])

  // Filter for search
  const filtered = useMemo(() => {
    if (!data) return []
    if (!query.trim()) return data.sections
    const q = query.trim().toLowerCase()
    return data.sections
      .map(sec => {
        const items = sec.items?.filter(it =>
          (it.title?.toLowerCase().includes(q)) || (it.text?.toLowerCase().includes(q))
        )
        const titleHit = sec.title.toLowerCase().includes(q) || (sec.subtitle?.toLowerCase().includes(q))
        if (items && items.length) return { ...sec, items }
        if (titleHit) return { ...sec }
        return null
      })
      .filter(Boolean)
  }, [data, query])

  // Copy deep link
  const onCopyLink = (id) => {
    const url = `${location.origin}${location.pathname}#${id}`
    navigator.clipboard.writeText(url)
  }

  // Export helpers
  const onExportMarkdown = () => {
    if (!data) return
    const md = buildMarkdown(data)
    downloadFile('platform.md', md, 'text/markdown;charset=utf-8')
  }
  const onExportHTML = () => {
    if (!data) return
    const html = buildHTML(data)
    downloadFile('platform.html', html, 'text/html;charset=utf-8')
  }

  // Deep-link scroll on first load
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace('#', ''))
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const highlight = (text) => {
    if (!query.trim()) return text
    const q = query.trim()
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
    return text.split(re).map((chunk, i) =>
      re.test(chunk) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">{chunk}</mark> : <span key={i}>{chunk}</span>
    )
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded">Skip to content</a>

      <header className="sticky top-0 z-40 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            aria-label="Toggle table of contents"
            onClick={() => setTocOpen(v => !v)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold tracking-tight">
            {data?.title || 'Policy Platform'}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies…"
              className="w-56 md:w-72 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!data}
            />
            <button
              onClick={() => setDark(d => !d)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
              aria-pressed={dark}
              aria-label="Toggle dark mode"
            >
              {dark ? 'Light' : 'Dark'}
            </button>
            <div className="hidden md:flex gap-2">
              <button onClick={onExportMarkdown} disabled={!data} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-50">Export MD</button>
              <button onClick={onExportHTML} disabled={!data} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-50">Export HTML</button>
              <button onClick={() => window.print()} disabled={!data} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-50">Print</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6 py-6">
        {/* TOC */}
        <aside className={`md:sticky md:top-16 h-fit md:block ${tocOpen ? 'block' : 'hidden'} md:!block bg-zinc-50 dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent rounded-xl md:rounded-none border md:border-0 border-zinc-200 dark:border-zinc-800 p-4 md:p-0`}>
          <nav aria-label="Table of contents" className="md:pr-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Sections</p>
            <ul className="space-y-1">
              {(data?.sections || []).map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="text-sm font-medium">{s.index}. {s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main */}
        <main id="main" className="prose prose-zinc dark:prose-invert max-w-none">
          {!loading && !error && data && (
            <p className="text-zinc-600 dark:text-zinc-400">
              Vision: restore faith in government, empower people through democracy, defend individual freedoms,
              and build a just economy and sustainable future.
            </p>
          )}

          {loading && (
            <p className="text-sm text-zinc-500">Loading platform…</p>
          )}
          {!loading && error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Failed to load <code>platform.json</code> ({error}).<br />
              Make sure it exists at: <a className="underline" href={RAW_JSON_URL} target="_blank" rel="noreferrer">{RAW_JSON_URL}</a>
            </div>
          )}

          {!loading && !error && data && filtered.length === 0 && (
            <p className="text-sm text-zinc-500">No matches for “{query}”.</p>
          )}

          {!loading && !error && data && filtered.map((sec) => (
            <section id={sec.id} key={sec.id} className="scroll-mt-24">
              <div className="flex items-start gap-3">
                <h2 className="mt-8">{sec.index}. {sec.title}</h2>
                <button onClick={() => onCopyLink(sec.id)} className="mt-8 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900" title="Copy link to section">Link</button>
              </div>
              {sec.subtitle && <p className="-mt-4 text-zinc-600 dark:text-zinc-400">{sec.subtitle}</p>}
              {sec.items && (
                <ul>
                  {sec.items.map((it, idx) => (
                    <li key={idx}>
                      {it.title ? (
                        <p><strong>{highlight(it.title)}:</strong> {highlight(it.text)}</p>
                      ) : (
                        <p>{highlight(it.text)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {!loading && !error && data && (
            <>
              <hr className="my-10" />
              <section id="vision" className="scroll-mt-24">
                <h2>Vision Statement</h2>
                <p>This platform rejects corruption and concentrated power, embracing transparency, accountability, and fairness as guiding principles.</p>
              </section>

              <div className="my-10 flex flex-wrap gap-2">
                <button onClick={onExportMarkdown} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Export Markdown</button>
                <button onClick={onExportHTML} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Export HTML</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Back to top</button>
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-sm text-zinc-500">
        Built with ❤️ — Vite + React + Tailwind. (Data from platform.json)
      </footer>
    </div>
  )
}

/* ---------- Helpers ---------- */
function escapeRegExp(str){ return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') }
function downloadFile(name, content, type){
  const blob=new Blob([content],{type})
  const a=document.createElement('a')
  a.href=URL.createObjectURL(blob); a.download=name; a.click()
  URL.revokeObjectURL(a.href)
}
function buildMarkdown(data){
  const lines=[`# ${data.title}`,'']
  for(const sec of data.sections){
    lines.push(`## ${sec.index}. ${sec.title}`)
    if(sec.subtitle) lines.push(sec.subtitle)
    for(const it of (sec.items||[])){
      if(it.title) lines.push(`- **${it.title}**: ${it.text}`); else lines.push(`- ${it.text}`)
    }
    lines.push('')
  }
  lines.push('\n## Vision Statement\nThis platform rejects corruption and concentrated power, embracing transparency, accountability, and fairness as guiding principles.')
  return lines.join('\n')
}
function buildHTML(data){
  const md=buildMarkdown(data)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`
}
function escapeHtml(s){ return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])) }
