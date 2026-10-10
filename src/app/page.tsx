import Link from 'next/link'
import { Smartphone, Tractor, Building2, LineChart, ArrowRight, Sprout } from 'lucide-react'

const surfaces = [
  {
    href: '/phone',
    label: 'Farmer',
    persona: 'Musa & Hauwa · USSD + SMS',
    desc: 'Feature-phone USSD in Hausa. Sell harvest, hear a transparent fair price, get paid by SMS.',
    Icon: Smartphone,
    tone: 'from-brand to-brand-dark',
  },
  {
    href: '/agent',
    label: 'Agent',
    persona: 'Ibrahim · Field PWA',
    desc: 'Register farmers, enrol them to contracts with an input advance, grade and aggregate lots.',
    Icon: Tractor,
    tone: 'from-clay to-[#8f3f1e]',
  },
  {
    href: '/buyer',
    label: 'Buyer',
    persona: 'Mrs. Okafor · Northern Foods Ltd',
    desc: 'Post forward demand, watch supply fill live with traceable graded lots, fund escrow on delivery.',
    Icon: Building2,
    tone: 'from-gold to-[#b4811f]',
  },
  {
    href: '/admin',
    label: 'Presenter',
    persona: 'Impact & controls',
    desc: 'Income uplift, loss avoided, GMV and revenue split — plus one-click demo reset.',
    Icon: LineChart,
    tone: 'from-[#334155] to-[#1e293b]',
  },
]

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-brand-dark">
          <Sprout className="size-4" /> Sasaeniyan Agritech
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Demand-first offtake &amp; <span className="text-brand">embedded finance</span>
          <br className="hidden sm:block" /> for Northern-Nigeria smallholders
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
          One live loop across three real users. Open the surfaces side by side — every action syncs
          across screens in real time.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {surfaces.map(({ href, label, persona, desc, Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex items-start justify-between">
              <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white`}>
                <Icon className="size-6" />
              </div>
              <ArrowRight className="size-5 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">{label}</h2>
            <p className="text-sm font-semibold text-gold">{persona}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Demo build · USSD, payments and NDFR verification are simulated and clearly labeled ·
        Production via Africa&apos;s Talking + licensed PSP
      </p>
    </main>
  )
}
