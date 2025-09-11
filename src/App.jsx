import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function App() {
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)

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

  const data = useMemo(() => PLATFORM_DATA, [])
  const filtered = useMemo(() => {
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
  }, [data.sections, query])

  const onCopyLink = (id) => {
    const url = `${location.origin}${location.pathname}#${id}`
    navigator.clipboard.writeText(url)
  }
  const onExportMarkdown = () => {
    const md = buildMarkdown(data)
    downloadFile('platform.md', md, 'text/markdown;charset=utf-8')
  }
  const onExportHTML = () => {
    const html = buildHTML(data)
    downloadFile('platform.html', html, 'text/html;charset=utf-8')
  }
  const highlight = (text) => {
    if (!query.trim()) return text
    const q = query.trim()
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
    return text.split(re).map((chunk, i) =>
      re.test(chunk) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">{chunk}</mark> : <span key={i}>{chunk}</span>
    )
  }

  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace('#', ''))
    if (id) {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded">Skip to content</a>
      <header className="sticky top-0 z-40 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button aria-label="Toggle table of contents" onClick={() => setTocOpen(v => !v)} className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700">
            <span>☰</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Policy Platform</h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies…"
              className="w-56 md:w-72 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => setDark(d => !d)} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" aria-pressed={dark} aria-label="Toggle dark mode">
              {dark ? 'Light' : 'Dark'}
            </button>
            <div className="hidden md:flex gap-2">
              <button onClick={onExportMarkdown} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Export MD</button>
              <button onClick={onExportHTML} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Export HTML</button>
              <button onClick={() => window.print()} className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">Print</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6 py-6">
        <aside className={`md:sticky md:top-16 h-fit md:block ${tocOpen ? 'block' : 'hidden'} md:!block bg-zinc-50 dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent rounded-xl md:rounded-none border md:border-0 border-zinc-200 dark:border-zinc-800 p-4 md:p-0`}>
          <nav aria-label="Table of contents" className="md:pr-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Sections</p>
            <ul className="space-y-1">
              {data.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="text-sm font-medium">{s.index}. {s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="main" className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-zinc-600 dark:text-zinc-400">Vision: restore faith in government, empower people through democracy, defend individual freedoms, and build a just economy and sustainable future.</p>

          {filtered.length === 0 && (
            <p className="text-sm text-zinc-500">No matches for “{query}”.</p>
          )}

          {filtered.map((sec) => (
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
                        <p>
                          <strong>{highlight(it.title)}:</strong> {highlight(it.text)}
                        </p>
                      ) : (
                        <p>{highlight(it.text)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

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
        </main>
      </div>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-sm text-zinc-500">
        Built with ❤️ — Vite + React + Tailwind.
      </footer>
    </div>
  )
}

function escapeRegExp(str){return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function downloadFile(name, content, type){
  const blob=new Blob([content],{type});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();
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
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>${escapeHtml(data.title)}</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`
}
function escapeHtml(s){return s.replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]))}

const PLATFORM_DATA = {
  "title": "A Platform for a Transparent, Just, and Free America",
  "sections": [
    {
      "id": "trust",
      "index": 1,
      "title": "Restoring Trust in Government",
      "items": [
        {
          "title": "Budget Transparency",
          "text": "Mandate clear, accessible public reporting of all federal expenditures."
        },
        {
          "title": "Accountability in Power",
          "text": "Public release of the Epstein list to ensure transparency in matters of corruption and abuse."
        },
        {
          "title": "Conflict of Interest Reform",
          "text": "All elected officials and cabinet members must divest from private investments before assuming office."
        },
        {
          "title": "End Corruption",
          "text": "Outlaw lobbying and bribery in Washington; enact real-time disclosure of all political spending and contacts."
        },
        {
          "title": "Age Limits for Office",
          "text": "Impose maximum age limits for both congressional and presidential candidates to ensure generational turnover."
        },
        {
          "title": "Supreme Court Ethics",
          "text": "Enforce binding ethics, financial disclosure, and recusal rules for Supreme Court justices; study options for structural reform and term limits."
        }
      ]
    },
    {
      "id": "democracy",
      "index": 2,
      "title": "Strengthening Democracy",
      "items": [
        {
          "title": "Modernized Elections",
          "text": "Implement ranked-choice voting for congressional and presidential elections nationwide."
        },
        {
          "title": "Redistricting Reform",
          "text": "Require independent redistricting commissions in every state to eliminate partisan gerrymandering."
        },
        {
          "title": "Universal Civic Duty",
          "text": "Mandatory voting in federal elections with small fines for non-participation. Every voter retains the right to submit a blank ballot or select a formal \u2018none of the above.\u2019"
        },
        {
          "title": "Ban on Encouraging Invalid Votes",
          "text": "Prohibit organized efforts to promote blank/invalid ballots during elections."
        },
        {
          "title": "Voting Accessibility",
          "text": "Make Election Day a national holiday and require at least 4 hours of paid time off to vote."
        },
        {
          "title": "Expanded Electorate",
          "text": "Lower the voting age to 16."
        }
      ]
    },
    {
      "id": "rights",
      "index": 3,
      "title": "Protecting Rights & Freedoms",
      "items": [
        {
          "title": "Codify Core Rights",
          "text": "Enshrine Roe v. Wade, Obergefell v. Hodges, Loving v. Virginia, and Griswold v. Connecticut in federal law."
        },
        {
          "title": "Free Expression",
          "text": "Protect speech and assembly on college campuses, including political and anti-war protest."
        },
        {
          "title": "Live-and-Let-Live",
          "text": "Safeguard personal freedoms from undue government intrusion."
        }
      ]
    },
    {
      "id": "welfare",
      "index": 4,
      "title": "Health, Safety, and Social Welfare",
      "items": [
        {
          "title": "Universal Healthcare (State-Run Single Payer)",
          "text": "Replace Medicaid/Medicare with interoperable, state-administered single-payer systems guaranteeing comprehensive coverage in every state, including rural access."
        },
        {
          "title": "Prescription Drug Reform",
          "text": "Tie prices to a global reference basket; significantly shorten patent exclusivity; allow emergency suspension of patents for high-impact public health drugs (e.g., GLP-1s) to ensure access."
        },
        {
          "title": "Mental Health Parity",
          "text": "Enforce equal coverage and access across all plans and networks."
        },
        {
          "title": "Reproductive Healthcare",
          "text": "Fully fund Planned Parenthood and community clinics."
        },
        {
          "title": "School Safety",
          "text": "Federally fund evidence-based security upgrades at schools."
        },
        {
          "title": "Social Supports",
          "text": "Relax SSI/SSDI eligibility; remove SNAP work requirements; raise SNAP income limits."
        }
      ]
    },
    {
      "id": "labor",
      "index": 5,
      "title": "Economic Justice & Labor Rights",
      "items": [
        {
          "title": "Fair Wages",
          "text": "Raise the federal minimum wage to $25/hr."
        },
        {
          "title": "Automatic Cost-of-Living Adjustments",
          "text": "Index the minimum wage to inflation with scheduled annual adjustments."
        },
        {
          "title": "Collective Bargaining",
          "text": "Protect the right to unionize; ban captive-audience meetings and union-busting tactics; require good-faith bargaining."
        },
        {
          "title": "Gig Worker Protections",
          "text": "End misclassification; if treated as contractors, require core benefits via platform-funded benefits pools."
        },
        {
          "title": "Overtime & Misclassification",
          "text": "Strengthen overtime rules and penalties for wage theft; tighten exemptions."
        },
        {
          "title": "Corporate Responsibility",
          "text": "Increase corporate tax rates and aggressively enforce antitrust laws to break up monopolies."
        }
      ]
    },
    {
      "id": "tax",
      "index": 6,
      "title": "Taxation & Wealth",
      "items": [
        {
          "title": "Wealth Tax",
          "text": "Levy a modest annual tax on extreme wealth (e.g., above a high threshold)."
        },
        {
          "title": "Capital Gains Parity (Under Review)",
          "text": "Study phased parity of capital gains and ordinary income, with safeguards for retirement savings and small business investment."
        },
        {
          "title": "Estate Tax Reform",
          "text": "Exempt estates under $5 million (indexed to inflation) to support generational wealth-building; impose progressive rates above that, with significantly higher rates on ultra-high-value estates."
        }
      ]
    },
    {
      "id": "housing",
      "index": 7,
      "title": "Housing & Community Stability",
      "items": [
        {
          "title": "Vacancy Penalties",
          "text": "Impose substantial fines on properties left vacant longer than 6 months without residents."
        },
        {
          "title": "Anti-Corporate Rentals",
          "text": "Prohibit hedge funds and real estate conglomerates from buying/renting single-family homes; restrict SFR ownership to individuals."
        },
        {
          "title": "Community Priority",
          "text": "Treat housing as a right and curb speculative practices that reduce supply."
        }
      ]
    },
    {
      "id": "justice",
      "index": 8,
      "title": "Criminal Justice Reform",
      "items": [
        {
          "title": "Gun Safety with Amnesty",
          "text": "Nationwide voluntary gun buyback with full amnesty for surrendering illegal firearms; universal background checks for all purchases."
        },
        {
          "title": "Drug Policy",
          "text": "Decriminalize low-level possession; expand treatment-first approaches."
        },
        {
          "title": "Bail Reform",
          "text": "Eliminate cash bail for non-violent offenses; implement equitable ability-to-pay standards so bail is proportional and does not criminalize poverty."
        },
        {
          "title": "Police Accountability",
          "text": "National use-of-force standards, universal body cams, independent state oversight boards with enforcement power; end qualified immunity; reform police union practices that obstruct accountability."
        },
        {
          "title": "Prison Reform",
          "text": "End for-profit prisons; improve conditions; expand education and reentry; automatic expungement for cannabis and other decriminalized offenses; federally legalize/reschedule cannabis."
        }
      ]
    },
    {
      "id": "infra",
      "index": 9,
      "title": "Environment, Infrastructure & Technology",
      "items": [
        {
          "title": "Green Renewal 2.0",
          "text": "Relaunch a climate/jobs program with deeper investment in renewables, grid-scale storage, and decarbonized industry."
        },
        {
          "title": "Grid & Energy Security",
          "text": "Modernize and harden the national grid; deepen partnerships with allied nations (e.g., Korea) to accelerate advanced transmission, batteries, and clean manufacturing."
        },
        {
          "title": "Water Systems",
          "text": "National program to replace lead pipes, secure reservoirs, and drought-proof critical regions."
        },
        {
          "title": "Interstate Upgrades",
          "text": "Rebuild and thicken interstate roadbeds (Autobahn-style longevity) to reduce life-cycle costs; prioritize safety and freight efficiency."
        },
        {
          "title": "Earthquake Resilience",
          "text": "Adopt Japan-style seismic standards and retrofit programs in quake-prone regions."
        },
        {
          "title": "High-Speed Rail & Transit",
          "text": "Fund national HSR corridors and clean mass transit\u2014ambitious but essential for mobility, climate, and competitiveness."
        },
        {
          "title": "Digital Commons",
          "text": "Classify broadband as a basic utility/common carrier; codify net neutrality; GDPR-style data privacy; Right to Repair across devices and equipment."
        },
        {
          "title": "AI Oversight",
          "text": "Federal AI safety/ethics regulator; risk-tiered audits; transparency for high-impact systems."
        }
      ]
    },
    {
      "id": "education",
      "index": 10,
      "title": "Education & Childcare",
      "items": [
        {
          "title": "Universal Pre-K",
          "text": "Free, universal early childhood education."
        },
        {
          "title": "Free Childcare for Struggling Families",
          "text": "Means-tested support to ensure parents can work or study."
        },
        {
          "title": "K\u201312 Funding Reform",
          "text": "Keep property taxes, but pool them statewide and distribute by student population and need\u2014ending district wealth gaps."
        },
        {
          "title": "Tuition-Free College",
          "text": "Public colleges and trade schools tuition-free; robust apprenticeships and vocational pathways."
        }
      ]
    },
    {
      "id": "rural",
      "index": 11,
      "title": "Rural & Regional Equity",
      "items": [
        {
          "title": "Healthcare Access",
          "text": "Guaranteed via universal single-payer coverage, mobile clinics, and rural hospital sustainment."
        },
        {
          "title": "Support Small Farmers",
          "text": "Shift subsidies and market power away from agribusiness monopolies; invest in local and sustainable agriculture."
        },
        {
          "title": "Disaster Preparedness",
          "text": "Scale wildfire, quake (Cascadia), flood, and hurricane readiness with resilient infrastructure and community response funding."
        }
      ]
    },
    {
      "id": "foreign",
      "index": 12,
      "title": "Foreign Policy & Defense",
      "items": [
        {
          "title": "End Endless Wars",
          "text": "Reassert congressional war powers; restrict unauthorized overseas interventions."
        },
        {
          "title": "Allies & Values",
          "text": "Maintain robust support for Ukraine\u2019s defense; end U.S. funding for Israel\u2019s military operations; pursue human-rights-centered diplomacy."
        },
        {
          "title": "Defense Audit & Transparency",
          "text": "Comprehensive audits and waste reduction with redactions narrowly tailored to protect operatives, sources, and sensitive capabilities."
        }
      ]
    }
  ]
}
