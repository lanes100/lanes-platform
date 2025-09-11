import React, { useEffect, useMemo, useState } from 'react'

// ====== GitHub endpoints ======
const OWNER   = 'lanes100'
const REPO    = 'lanes-platform'
const BRANCH  = 'main'
const GH_API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/platform.json?ref=${BRANCH}`
const COMMITS_URL = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=platform.json&per_page=1&sha=${BRANCH}`

// ====== Theme helpers (no Tailwind dark variant needed) ======
function getInitialTheme() {
  const saved = localStorage.getItem('pp_theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('pp_theme', theme)
}

// Inline CSS that drives the theme via CSS variables & lightweight utility overrides
const THEME_CSS = `
:root{
  --bg: #ffffff;
  --text: #111827;
  --muted: #6b7280;
  --panel: #ffffff;
  --panel-alt: #f4f4f5;
  --border: #e5e7eb;
  --link: #2563eb;
  --mark: #fde68a;
}
html[data-theme="dark"]{
  --bg: #0a0a0a;
  --text: #f4f4f5;
  --muted: #a1a1aa;
  --panel: #0b0b0f;
  --panel-alt: #111827;
  --border: #27272a;
  --link: #60a5fa;
  --mark: #ca8a04;
}
/* Generic overrides driven by vars (no Tailwind dark needed) */
body{ background: var(--bg); color: var(--text); }
.themed-bg{ background: var(--bg) !important; color: var(--text) !important; }
.themed-panel{ background: var(--panel) !important; color: var(--text) !important; border-color: var(--border) !important; }
.border-theme{ border-color: var(--border) !important; }
.input-theme{ background: var(--panel-alt) !important; color: var(--text) !important; border-color: var(--border) !important; }
.btn-theme{ background: var(--panel-alt) !important; color: var(--text) !important; border-color: var(--border) !important; }
.btn-theme:hover{ filter: brightness(1.05); }
mark{ background: var(--mark); color: inherit; }
/* Typography-ish tweaks */
.prose{ color: var(--text); }
.prose h1,.prose h2,.prose h3,.prose h4{ color: var(--text); }
.prose p,.prose li{ color: var(--text); }
.prose a{ color: var(--link); }
`;

// ====== App ======
export default function App() {
  const [query, setQuery] = useState('')
  const [tocOpen, setTocOpen] = useState(false)

  // Theme (pure CSS, no Tailwind config required)
  const [theme, setTheme] = useState(getInitialTheme())
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    // Follow system changes until user explicitly toggles
    const saved = localStorage.getItem('pp_theme')
    if (saved === 'dark' || saved === 'light') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => applyTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  // Data
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Fetch platform.json (GitHub API) + last commit timestamp
  useEffect(() => {
    const ac = new AbortController()
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${GH_API_URL}&t=${Date.now()}`, {
          cache: 'no-store',
          signal: ac.signal,
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const file = await res.json()
        if (!file?.content) throw new Error('Missing content')
        const decoded = JSON.parse(atob(file.content.replace(/\n/g, '')))
        if (!decoded?.sections?.length) throw new Error('Invalid JSON (no sections)')
        setData(decoded)

        // get last updated timestamp
        try {
          const cRes = await fetch(`${COMMITS_URL}&t=${Date.now()}`, { cache: 'no-store', signal: ac.signal })
          if (cRes.ok) {
            const commits = await cRes.json()
            const iso = commits?.[0]?.commit?.author?.date || commits?.[0]?.commit?.committer?.date
            if (iso) setLastUpdated(iso)
          }
        } catch {}
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Failed to load platform.json')
      } finally {
        setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [])

  // Search filter
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

  // Deep-link scroll after data loads
  useEffect(() => {
    if (!data) return
    const id = decodeURIComponent(location.hash.replace('#', ''))
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data])

  // Actions
  const onCopyLink = (id) => {
    const url = `${location.origin}${location.pathname}#${id}`
    navigator.clipboard.writeText(url)
  }
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
  const highlight = (text) => {
    if (!query.trim()) return text
    const q = query.trim()
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
    return text.split(re).map((chunk, i) =>
      re.test(chunk) ? <mark key={i}>{chunk}</mark> : <span key={i}>{chunk}</span>
    )
  }

  return (
    <div className="min-h-screen themed-bg">
      {/* Inject theme CSS */}
      <style>{THEME_CSS}</style>

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
         style={{background:'#2563eb',color:'#fff',padding:'0.5rem 0.75rem',borderRadius:'0.5rem'}}>Skip to content</a>

      <header className="sticky top-0 z-40 border-b"
              style={{backdropFilter:'blur(8px)'}}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 themed-panel border-theme"
             style={{borderWidth:1}}>
          <button aria-label="Toggle table of contents"
                  onClick={() => setTocOpen(v => !v)}
                  className="md:hidden inline-flex items-center justify-center"
                  style={{ width:36, height:36, borderRadius:12, border:'1px solid', borderColor:'var(--border)'}}>
            ☰
          </button>

          <h1 className="text-xl font-bold" style={{letterSpacing:'-0.01em'}}>
            {data?.title || 'Policy Platform'}
          </h1>

          {/* Last updated pill */}
          {lastUpdated && (
            <span className="ml-2 hidden md:inline-flex items-center text-xs"
                  style={{ border:'1px solid var(--border)', borderRadius:12, padding:'2px 8px' }}>
              Updated {new Date(lastUpdated).toLocaleString()}
            </span>
          )}

          {/* Edit on GitHub */}
          <a
            href={`https://github.com/${OWNER}/${REPO}/edit/${BRANCH}/platform.json`}
            target="_blank" rel="noreferrer"
            className="ml-2 text-xs"
            style={{ textDecoration:'underline', color:'var(--link)' }}
          >
            Edit platform.json
          </a>

          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies…"
              className="input-theme"
              style={{ width:'18rem', maxWidth:'20rem', border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14 }}
              disabled={!data}
            />

            {/* Theme toggle (no Tailwind dark dependency) */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="btn-theme"
              style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14 }}
              aria-pressed={theme === 'dark'}
              aria-label="Toggle dark mode"
              title="Toggle dark/light"
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>

            <div className="hidden md:flex gap-2">
              <button onClick={onExportMarkdown} disabled={!data} className="btn-theme"
                      style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14, opacity: data ? 1 : 0.5 }}>
                Export MD
              </button>
              <button onClick={onExportHTML} disabled={!data} className="btn-theme"
                      style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14, opacity: data ? 1 : 0.5 }}>
                Export HTML
              </button>
              <button onClick={() => window.print()} disabled={!data} className="btn-theme"
                      style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14, opacity: data ? 1 : 0.5 }}>
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6 py-6">
        {/* TOC */}
        <aside className={`md:sticky md:top-16 h-fit ${tocOpen ? 'block' : 'hidden'} md:!block`}>
          <nav aria-label="Table of contents" className="md:pr-4 themed-panel border-theme" style={{borderWidth:1, borderRadius:12, padding:16}}>
            <p className="text-xs" style={{ textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:8 }}>Sections</p>
            <ul className="space-y-1">
              {(data?.sections || []).map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block" style={{ borderRadius:8, padding:'6px 8px' }}>
                    <span className="text-sm" style={{ fontWeight:600 }}>{s.index}. {s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main */}
        <main id="main" className="prose" style={{ maxWidth:'none' }}>
          {loading && <p style={{ color:'var(--muted)', fontSize:14 }}>Loading platform…</p>}
          {!loading && error && (
            <div style={{ color:'#dc2626', fontSize:14 }}>
              Failed to load <code>platform.json</code> ({error}). <br />
              Make sure it exists at:&nbsp;
              <a style={{ textDecoration:'underline', color:'var(--link)' }}
                 href={`https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/platform.json`}
                 target="_blank" rel="noreferrer">
                /{OWNER}/{REPO}/platform.json
              </a>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <p style={{ color:'var(--muted)' }}>
                Vision: restore faith in government, empower people through democracy, defend individual freedoms,
                and build a just economy and sustainable future.
              </p>

              {(() => {
                if (filtered.length === 0) {
                  return <p style={{ color:'var(--muted)', fontSize:14 }}>No matches for “{query}”.</p>
                }
                return filtered.map((sec) => (
                  <section id={sec.id} key={sec.id} style={{ scrollMarginTop: '6rem' }}>
                    <div className="flex items-start gap-3">
                      <h2 style={{ marginTop:'2rem' }}>{sec.index}. {sec.title}</h2>
                      <button
                        onClick={() => onCopyLink(sec.id)}
                        className="btn-theme"
                        style={{ marginTop:'2rem', marginLeft:8, border:'1px solid var(--border)', borderRadius:8, padding:'2px 6px', fontSize:12 }}
                        title="Copy link to section"
                      >
                        Link
                      </button>
                    </div>
                    {sec.subtitle && <p style={{ marginTop:'-0.75rem', color:'var(--muted)' }}>{sec.subtitle}</p>}
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
                ))
              })()}

              <hr style={{ margin:'2.5rem 0', borderColor:'var(--border)' }} />
              <section id="vision" style={{ scrollMarginTop: '6rem' }}>
                <h2>Vision Statement</h2>
                <p>This platform rejects corruption and concentrated power, embracing transparency, accountability, and fairness as guiding principles.</p>
              </section>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'2rem 0' }}>
                <button onClick={onExportMarkdown} className="btn-theme" style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14 }}>Export Markdown</button>
                <button onClick={onExportHTML} className="btn-theme" style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14 }}>Export HTML</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-theme" style={{ border:'1px solid var(--border)', borderRadius:12, padding:'0.5rem 0.75rem', fontSize:14 }}>Back to top</button>
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="py-8 text-center" style={{ borderTop:'1px solid var(--border)', color:'var(--muted)', fontSize:14 }}>
        Built with ❤️ — Vite + React. Theme: {theme}
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
