import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import AIChat from './components/AIChat';

interface Metrics {
  total_esim: number;
  products_over_100: number;
  price_range: { min: number; max: number };
  avg_data_gb: number;
  unlimited_count: number;
  pricing: { mean: number; median: number };
  supplier_distribution: Record<string, number>;
  total_anomalies: number;
}

interface Anomaly {
  supplier: string;
  product_name?: string;
  price?: number | null;
  anomaly_reason: string;
}

type Theme = 'light' | 'dark';

const API = import.meta.env.VITE_API_URL ?? 'https://mybestsim.onrender.com';
const ANOMALY_LIMIT = 50;

/* Page background per theme, also applied to <html> and <body> (see Shell). */
const PAGE_BG: Record<Theme, string> = { light: '#F0F3F7', dark: '#0F1720' };

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
const fmtInt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} %`;

/* Shared class strings (colors come from the CSS variables in GlobalStyles). */
const CARD =
  'rounded-[1.75rem] bg-[var(--surface)] p-6 shadow-[var(--shadow)] ring-1 ring-[var(--line)] md:p-7';
const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-a)]';

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('mbs-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* storage unavailable */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('mbs-theme', next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return [theme, toggle] as const;
}

function useCountUp(target: number, ms = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Shell: theme wrapper + sticky top bar                               */
/* ------------------------------------------------------------------ */

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === 'dark' ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </svg>
  );
}

function Shell({
  theme,
  onToggleTheme,
  live,
  children,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  live: boolean;
  children: ReactNode;
}) {
  /* Paint <html> and <body> with the theme color so overscroll and any
     gap outside the wrapper never shows the default white. */
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.backgroundColor = PAGE_BG[theme];
    root.style.colorScheme = theme;
    body.style.backgroundColor = PAGE_BG[theme];
    body.style.margin = '0';
  }, [theme]);

  return (
    <div data-theme={theme} className="dash min-h-screen bg-[var(--bg)] font-body text-[15px] leading-relaxed text-[var(--ink)]">
      <GlobalStyles />

      <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bar)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <p className="font-display text-lg font-semibold tracking-tight">
            MyBestSim <span className="font-normal text-[var(--muted)]">· Catalogue eSIM</span>
          </p>

          <div className="flex items-center gap-3">
            {live && (
              <span className="hidden items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-[var(--good)]" aria-hidden />
                Données en direct
              </span>
            )}
            <button
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className={`grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--line)] ${FOCUS}`}
            >
              <ThemeIcon theme={theme} />
            </button>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: the price range drawn as a flight route                       */
/* ------------------------------------------------------------------ */

const P0 = { x: 30, y: 150 };
const P1 = { x: 300, y: -10 };
const P2 = { x: 570, y: 150 };

const bezier = (t: number) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y,
});

const tangentAngle = (t: number) => {
  const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
  const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

function PriceRoute({ min, max, median, mean }: { min: number; max: number; median: number; mean: number }) {
  const span = Math.max(max - min, 0.0001);
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / span));
  const tMean = frac(mean);
  const plane = bezier(tMean);
  const med = bezier(frac(median));
  const d = `M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

  const legend = [
    { label: 'Le moins cher', value: fmtEur(min), dot: 'bg-[var(--muted)]' },
    { label: 'Médiane', value: fmtEur(median), dot: 'bg-[var(--c-b)]' },
    { label: 'Moyenne', value: fmtEur(mean), dot: 'bg-[var(--warm)]' },
    { label: 'Le plus cher', value: fmtEur(max), dot: 'bg-[var(--muted)]' },
  ];

  return (
    <div>
      <svg
        viewBox="0 0 600 170"
        className="w-full"
        role="img"
        aria-label={`Fourchette de prix de ${fmtEur(min)} à ${fmtEur(max)}, moyenne ${fmtEur(mean)}, médiane ${fmtEur(median)}`}
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--c-b)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-a)' }} />
          </linearGradient>
        </defs>

        <path d={d} fill="none" style={{ stroke: 'var(--line-strong)' }} strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
        <path className="draw-route" d={d} pathLength={1} fill="none" stroke="url(#routeGrad)" strokeWidth="3.5" strokeLinecap="round" />

        <circle cx={P0.x} cy={P0.y} r="7" style={{ fill: 'var(--surface)', stroke: 'var(--ink)' }} strokeWidth="3" />
        <circle cx={P2.x} cy={P2.y} r="7" style={{ fill: 'var(--surface)', stroke: 'var(--ink)' }} strokeWidth="3" />

        <g className="fade-late">
          <circle cx={med.x} cy={med.y} r="6" style={{ fill: 'var(--c-b)', stroke: 'var(--surface)' }} strokeWidth="3" />
        </g>

        <g className="fade-late" transform={`translate(${plane.x} ${plane.y}) rotate(${tangentAngle(tMean)})`}>
          <polygon
            points="-10,-9 16,0 -10,9 -5,0"
            style={{ fill: 'var(--warm)', stroke: 'var(--surface)' }}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {legend.map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </dt>
            <dd className="mt-1 font-display text-xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Hero({ metrics, supplierCount }: { metrics: Metrics; supplierCount: number }) {
  const counted = useCountUp(metrics.total_esim);

  return (
    <header className="rounded-[2rem] bg-[image:var(--hero)] p-7 ring-1 ring-[var(--line)] md:p-12">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">Catalogue analysé</p>
          <h1 className="mt-2 font-display text-7xl font-semibold leading-none tracking-tight tabular-nums md:text-8xl">
            {fmtInt(counted)}
          </h1>
          <p className="mt-4 max-w-xs text-lg text-[var(--muted)]">
            cartes eSIM, chez {supplierCount} fournisseur{supplierCount > 1 ? 's' : ''}.
          </p>
          <p className="mt-6 max-w-xs text-[var(--muted)]">
            Chaque carte se place quelque part sur ce trajet, du prix le plus bas au plus haut.
          </p>
        </div>

        <PriceRoute
          min={metrics.price_range.min}
          max={metrics.price_range.max}
          median={metrics.pricing.median}
          mean={metrics.pricing.mean}
        />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

function Stat({ label, value, hint, warm = false }: { label: string; value: string; hint: string; warm?: boolean }) {
  return (
    <div className={`${CARD} flex flex-col justify-between`}>
      <p className="font-medium text-[var(--muted)]">{label}</p>
      <p className={`mt-6 font-display text-4xl font-semibold tracking-tight ${warm ? 'text-[var(--warm-ink)]' : ''}`}>{value}</p>
      <p className="mt-2 text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function QualityCard({ valid, rejected }: { valid: number; rejected: number }) {
  const read = valid + rejected;
  const pct = read ? (valid / read) * 100 : 0;
  const C = 2 * Math.PI * 40;
  const dash = (C * pct) / 100;

  return (
    <div className={`${CARD} flex items-center gap-5`}>
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={`${fmtPct(pct)} de lignes valides`}>
        <circle cx="50" cy="50" r="40" fill="none" style={{ stroke: 'var(--warn-bg)' }} strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          style={{ stroke: 'var(--good)' }}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 font-display text-[22px] font-semibold"
          style={{ transformOrigin: '50px 50px', fill: 'var(--ink)' }}
        >
          {Math.round(pct)}%
        </text>
      </svg>
      <div>
        <p className="font-medium text-[var(--muted)]">Qualité des données</p>
        <p className="mt-2">
          <span className="font-semibold">{fmtInt(rejected)}</span> lignes rejetées sur {fmtInt(read)} lues.
        </p>
      </div>
    </div>
  );
}

function SupplierBubbles({ suppliers, max }: { suppliers: [string, number][]; max: number }) {
  return (
    <ul className="mt-6 flex max-h-[28rem] flex-wrap items-center justify-center gap-2.5 overflow-y-auto">
      {suppliers.map(([name, count], i) => {
        const size = 56 + Math.sqrt(count / max) * 88;
        return (
          <li
            key={name}
            title={`${name} : ${fmtInt(count)} cartes`}
            className="flex flex-col items-center justify-center rounded-full text-center text-[var(--on-bubble)]"
            style={{ width: size, height: size, backgroundColor: `var(--b${(i % 5) + 1})` }}
          >
            <span className="font-display text-base font-semibold leading-none tabular-nums">{fmtInt(count)}</span>
            {size >= 88 && <span className="mt-1 max-w-[80%] truncate text-xs capitalize leading-none opacity-85">{name}</span>}
            <span className="sr-only">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SupplierBars({ suppliers, max, total }: { suppliers: [string, number][]; max: number; total: number }) {
  return (
    <ul className="mt-6 max-h-[28rem] space-y-5 overflow-y-auto pr-1">
      {suppliers.map(([name, count]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium capitalize">{name}</span>
            <span className="tabular-nums text-[var(--muted)]">
              {fmtInt(count)} · {fmtPct((count / total) * 100)}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--c-a)] transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:px-8" role="status" aria-live="polite">
      <div className="h-80 animate-pulse rounded-[2rem] bg-[var(--surface-2)] motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-[1.75rem] bg-[var(--surface-2)] motion-reduce:animate-none" />
        ))}
      </div>
      <p className="text-center text-[var(--muted)]">
        Chargement des données. Si le serveur était en veille, cela peut prendre une minute.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [supplierView, setSupplierView] = useState<'bars' | 'bubbles'>('bubbles');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const getJson = async <T,>(path: string): Promise<T> => {
      const res = await fetch(`${API}${path}`);
      if (!res.ok) throw new Error(`${path} : ${res.status}`);
      return res.json();
    };

    Promise.all([getJson<Metrics>('/metrics'), getJson<Anomaly[]>(`/anomalies?limit=${ANOMALY_LIMIT}`)])
      .then(([m, a]) => {
        setMetrics(m);
        setAnomalies(a);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis réessayez.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const suppliers = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.supplier_distribution).sort((a, b) => b[1] - a[1]);
  }, [metrics]);

  const reasons = useMemo(() => {
    const counts = new Map<string, number>();
    anomalies.forEach((a) => counts.set(a.anomaly_reason, (counts.get(a.anomaly_reason) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [anomalies]);

  const anomalySuppliers = useMemo(() => [...new Set(anomalies.map((a) => a.supplier))].sort(), [anomalies]);

  const filteredAnomalies = useMemo(
    () =>
      anomalies.filter(
        (a) =>
          (supplierFilter === 'all' || a.supplier === supplierFilter) &&
          (reasonFilter === 'all' || a.anomaly_reason === reasonFilter),
      ),
    [anomalies, supplierFilter, reasonFilter],
  );

  if (loading) {
    return (
      <Shell theme={theme} onToggleTheme={toggleTheme} live={false}>
        <Skeleton />
      </Shell>
    );
  }

  if (error || !metrics) {
    return (
      <Shell theme={theme} onToggleTheme={toggleTheme} live={false}>
        <div className="mx-auto flex max-w-6xl justify-center px-5 py-20">
          <div className={`${CARD} max-w-md`} role="alert">
            <h2 className="font-display text-xl font-semibold">Les données ne se sont pas chargées</h2>
            <p className="mt-2 text-[var(--muted)]">{error ?? 'Données indisponibles.'}</p>
            <button
              onClick={load}
              className={`mt-6 rounded-full bg-[var(--c-a)] px-5 py-2.5 font-medium text-[var(--on-accent)] hover:opacity-90 ${FOCUS}`}
            >
              Réessayer
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const total = metrics.total_esim;
  const maxSupplier = suppliers[0]?.[1] ?? 1;
  const premiumShare = total ? (metrics.products_over_100 / total) * 100 : 0;
  const unlimitedShare = total ? (metrics.unlimited_count / total) * 100 : 0;

  const takeaways: string[] = [];
  if (metrics.price_range.min > 0) {
    const ratio = metrics.price_range.max / metrics.price_range.min;
    takeaways.push(`La carte la plus chère coûte ${Math.round(ratio).toLocaleString('fr-FR')} fois la moins chère.`);
  }
  if (metrics.products_over_100 > 0) {
    takeaways.push(`Une carte sur ${Math.max(1, Math.round(total / metrics.products_over_100))} dépasse 100 €.`);
  }
  if (metrics.pricing.median > 0) {
    const gap = ((metrics.pricing.mean - metrics.pricing.median) / metrics.pricing.median) * 100;
    if (Math.abs(gap) >= 1) {
      takeaways.push(
        gap > 0
          ? `La moyenne dépasse la médiane de ${Math.round(gap)} % : quelques cartes très chères tirent les prix vers le haut.`
          : `La moyenne est ${Math.round(Math.abs(gap))} % sous la médiane : quelques cartes très bon marché tirent les prix vers le bas.`,
      );
    }
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${FOCUS} ${
      active
        ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
        : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]'
    }`;

  return (
    <Shell theme={theme} onToggleTheme={toggleTheme} live>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:space-y-8 md:px-8 md:py-10">
        <Hero metrics={metrics} supplierCount={suppliers.length} />

        {/* KPIs ------------------------------------------------------ */}
        <section aria-label="Indicateurs clés" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Data moyenne par carte"
            value={`${metrics.avg_data_gb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`}
            hint={`Hors ${fmtInt(metrics.unlimited_count)} offres illimitées (${fmtPct(unlimitedShare)} du catalogue)`}
          />
          <Stat
            label="Produits à plus de 100 €"
            value={fmtInt(metrics.products_over_100)}
            hint={`${fmtPct(premiumShare)} du catalogue`}
            warm
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <QualityCard valid={total} rejected={metrics.total_anomalies} />
          </div>
        </section>

        {/* Takeaways -------------------------------------------------- */}
        {takeaways.length > 0 && (
          <section aria-labelledby="takeaways-title" className={CARD}>
            <h2 id="takeaways-title" className="font-display text-xl font-semibold">
              Ce que disent les chiffres
            </h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {takeaways.map((t) => (
                <li key={t} className="rounded-2xl bg-[var(--surface-2)] p-5">
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Suppliers + anomalies ------------------------------------- */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-5">
          <section aria-labelledby="suppliers-title" className={`${CARD} lg:col-span-2`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="suppliers-title" className="font-display text-xl font-semibold">
                  Cartes par fournisseur
                </h2>
                <p className="mt-1 text-[var(--muted)]">
                  {suppliers[0] ? (
                    <>
                      <span className="font-medium capitalize text-[var(--ink)]">{suppliers[0][0]}</span> en propose le plus (
                      {fmtPct((suppliers[0][1] / total) * 100)}).
                    </>
                  ) : (
                    'Aucun fournisseur.'
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-1" role="group" aria-label="Type d'affichage">
                <button onClick={() => setSupplierView('bubbles')} aria-pressed={supplierView === 'bubbles'} className={chip(supplierView === 'bubbles')}>
                  Bulles
                </button>
                <button onClick={() => setSupplierView('bars')} aria-pressed={supplierView === 'bars'} className={chip(supplierView === 'bars')}>
                  Barres
                </button>
              </div>
            </div>

            {supplierView === 'bubbles' ? (
              <SupplierBubbles suppliers={suppliers} max={maxSupplier} />
            ) : (
              <SupplierBars suppliers={suppliers} max={maxSupplier} total={total} />
            )}
          </section>

          <section aria-labelledby="anomalies-title" className={`${CARD} lg:col-span-3`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="anomalies-title" className="font-display text-xl font-semibold">
                  Lignes rejetées
                </h2>
                <p className="mt-1 text-[var(--muted)]">
                  {fmtInt(filteredAnomalies.length)} affichées sur {fmtInt(metrics.total_anomalies)} au total
                  {metrics.total_anomalies > anomalies.length && ` (les ${ANOMALY_LIMIT} premières sont chargées)`}.
                </p>
              </div>

              <label>
                <span className="sr-only">Filtrer par fournisseur</span>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className={`rounded-full border-0 bg-[var(--surface-2)] py-2 pl-4 pr-9 text-sm font-medium capitalize text-[var(--ink)] ${FOCUS}`}
                >
                  <option value="all">Tous les fournisseurs</option>
                  {anomalySuppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {reasons.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par motif">
                <button onClick={() => setReasonFilter('all')} aria-pressed={reasonFilter === 'all'} className={chip(reasonFilter === 'all')}>
                  Tous les motifs
                </button>
                {reasons.map(([reason, n]) => (
                  <button key={reason} onClick={() => setReasonFilter(reason)} aria-pressed={reasonFilter === reason} className={chip(reasonFilter === reason)}>
                    {reason} <span className="opacity-70">{n}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 max-h-[24rem] overflow-auto rounded-2xl ring-1 ring-[var(--line)]">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead className="sticky top-0 bg-[var(--surface-2)] text-sm text-[var(--muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Fournisseur</th>
                    <th scope="col" className="px-4 py-3 font-medium">Produit</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Prix</th>
                    <th scope="col" className="px-4 py-3 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredAnomalies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                        Aucune ligne ne correspond à ces filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredAnomalies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-3.5 font-medium capitalize">{item.supplier}</td>
                        <td className="px-4 py-3.5 text-[var(--muted)]">{item.product_name || 'Sans nom'}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-[var(--muted)]">
                          {item.price !== undefined && item.price !== null ? fmtEur(item.price) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block rounded-full bg-[var(--warn-bg)] px-2.5 py-1 text-sm font-medium text-[var(--warn-ink)]">
                            {item.anomaly_reason}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="pb-4 pt-2 text-center text-sm text-[var(--muted)]">
          Test de recrutement MyBestSim · Données calculées par l'API FastAPI
        </footer>
      </main>

      <AIChat />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Theme tokens, fonts and the one-time route animation                */
/* ------------------------------------------------------------------ */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap');
      .font-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }
      .font-body { font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; }

      /* Light: soft cool grey, off-white surfaces, ink that is dark but not black. */
      .dash {
        color-scheme: light;
        --bg: #F0F3F7;
        --bar: rgba(240, 243, 247, 0.82);
        --surface: #FAFBFC;
        --surface-2: #E9EEF4;
        --line: rgba(30, 42, 56, 0.09);
        --line-strong: rgba(30, 42, 56, 0.28);
        --ink: #1E2A38;
        --muted: #556374;
        --c-a: #2F6FD6;
        --c-b: #1E9C8E;
        --good: #1E9C8E;
        --warm: #E0922B;
        --warm-ink: #A8500C;
        --accent-soft: #DCE7F9;
        --accent-ink: #1F4FA8;
        --on-accent: #FFFFFF;
        --warn-bg: #FBE7D6;
        --warn-ink: #8A3B0C;
        --b1: #3B6FD0; --b2: #1A7A7F; --b3: #5A4FC4; --b4: #A8571C; --b5: #3C5A7D;
        --on-bubble: #FFFFFF;
        --shadow: 0 1px 2px rgba(30, 42, 56, 0.04), 0 12px 28px -16px rgba(30, 42, 56, 0.18);
        --hero: linear-gradient(135deg, #E2EBF8 0%, #E2F1EE 100%);
      }

      /* Dark: deep blue-grey (not black), softened text, desaturated accents. */
      .dash[data-theme='dark'] {
        color-scheme: dark;
        --bg: #0F1720;
        --bar: rgba(15, 23, 32, 0.82);
        --surface: #16202B;
        --surface-2: #1D2936;
        --line: rgba(221, 229, 238, 0.09);
        --line-strong: rgba(221, 229, 238, 0.3);
        --ink: #DCE4ED;
        --muted: #94A2B3;
        --c-a: #6BA3EE;
        --c-b: #4CBFAF;
        --good: #4CBFAF;
        --warm: #E8AB5A;
        --warm-ink: #E8AB5A;
        --accent-soft: #223B5D;
        --accent-ink: #B3CEF6;
        --on-accent: #0F1720;
        --warn-bg: #3A2819;
        --warn-ink: #F0B98C;
        --b1: #2F5FA8; --b2: #1F6F74; --b3: #4B4398; --b4: #8A4A1A; --b5: #35506E;
        --on-bubble: #EAF0F7;
        --shadow: none;
        --hero: linear-gradient(135deg, #172433 0%, #14282B 100%);
      }

      @keyframes draw-route { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      @keyframes fade-late { from { opacity: 0; } to { opacity: 1; } }
      .draw-route { stroke-dasharray: 1; animation: draw-route 1.6s ease-out both; }
      .fade-late { animation: fade-late 0.5s ease-out 1.4s both; }
      @media (prefers-reduced-motion: reduce) {
        .draw-route, .fade-late { animation: none; }
      }
    `}</style>
  );
}