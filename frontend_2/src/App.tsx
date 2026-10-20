import { useCallback, useEffect, useMemo, useState } from 'react';
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
  price?: number;
  anomaly_reason: string;
}

const API = import.meta.env.VITE_API_URL ?? 'https://mybestsim.onrender.com';
const ANOMALY_LIMIT = 50;

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);

const fmtInt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} %`;

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'warm';
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl bg-white p-6 ring-1 ring-[#0C2340]/10">
      <p className="text-sm font-medium text-[#0C2340]/60">{label}</p>
      <p
        className={`mt-6 font-display text-4xl font-semibold tracking-tight ${
          tone === 'warm' ? 'text-[#C2410C]' : 'text-[#0C2340]'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[#0C2340]/55">{hint}</p>
    </div>
  );
}

function PriceTrack({
  min,
  max,
  median,
  mean,
}: {
  min: number;
  max: number;
  median: number;
  mean: number;
}) {
  const span = Math.max(max - min, 0.0001);
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const medianPos = pos(median);
  const meanPos = pos(mean);

  return (
    <div className="mt-10">
      <div className="relative h-14">
        {/* median label (above) */}
        <div
          className="absolute -top-1 -translate-x-1/2 text-center"
          style={{ left: `${medianPos}%` }}
        >
          <p className="text-xs text-white/60">Médiane</p>
          <p className="text-sm font-semibold text-white">{fmtEur(median)}</p>
        </div>
      </div>

      <div className="relative h-3 rounded-full bg-white/15">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#60A5FA]"
          style={{ left: 0, right: 0 }}
        />
        <span
          className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-white"
          style={{ left: `${medianPos}%` }}
          aria-hidden
        />
        <span
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F5A524] bg-[#0C2340]"
          style={{ left: `${meanPos}%` }}
          aria-hidden
        />
      </div>

      <div className="relative mt-3 h-14">
        <div className="absolute left-0">
          <p className="text-xs text-white/60">Le moins cher</p>
          <p className="text-sm font-semibold text-white">{fmtEur(min)}</p>
        </div>
        <div
          className="absolute -translate-x-1/2 text-center"
          style={{ left: `${Math.min(80, Math.max(20, meanPos))}%` }}
        >
          <p className="text-xs text-[#F5A524]">Moyenne</p>
          <p className="text-sm font-semibold text-white">{fmtEur(mean)}</p>
        </div>
        <div className="absolute right-0 text-right">
          <p className="text-xs text-white/60">Le plus cher</p>
          <p className="text-sm font-semibold text-white">{fmtEur(max)}</p>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 md:px-8" role="status" aria-live="polite">
      <div className="h-80 animate-pulse rounded-[2rem] bg-[#0C2340]/10 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-3xl bg-[#0C2340]/10 motion-reduce:animate-none"
          />
        ))}
      </div>
      <p className="text-center text-sm text-[#0C2340]/60">
        Chargement des données. Si le serveur était en veille, cela peut prendre une minute.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    Promise.all([
      getJson<Metrics>('/metrics'),
      getJson<Anomaly[]>(`/anomalies?limit=${ANOMALY_LIMIT}`),
    ])
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

  const anomalySuppliers = useMemo(
    () => [...new Set(anomalies.map((a) => a.supplier))].sort(),
    [anomalies],
  );

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
      <div className="min-h-screen bg-[#F3F6FA]">
        <FontStyles />
        <Skeleton />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F6FA] p-6">
        <FontStyles />
        <div className="max-w-md rounded-3xl bg-white p-8 ring-1 ring-[#0C2340]/10" role="alert">
          <h2 className="font-display text-xl font-semibold text-[#0C2340]">
            Les données ne se sont pas chargées
          </h2>
          <p className="mt-2 text-[#0C2340]/70">{error ?? 'Données indisponibles.'}</p>
          <button
            onClick={load}
            className="mt-6 rounded-full bg-[#0C2340] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#12335c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6FEB]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const total = metrics.total_esim;
  const maxSupplier = suppliers[0]?.[1] ?? 1;
  const premiumShare = total ? (metrics.products_over_100 / total) * 100 : 0;
  const unlimitedShare = total ? (metrics.unlimited_count / total) * 100 : 0;
  const rejectedShare =
    total + metrics.total_anomalies
      ? (metrics.total_anomalies / (total + metrics.total_anomalies)) * 100
      : 0;

  return (
    <div className="min-h-screen bg-[#F3F6FA] font-body text-[#0C2340]">
      <FontStyles />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:px-8 md:py-10">
        {/* Hero ------------------------------------------------------ */}
        <header className="overflow-hidden rounded-[2rem] bg-[#0C2340] p-7 text-white md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-lg font-semibold tracking-tight">MyBestSim</p>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" aria-hidden />
              Données en direct depuis l'API
            </span>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <div>
              <h1 className="font-display text-6xl font-semibold leading-none tracking-tight md:text-8xl">
                {fmtInt(total)}
              </h1>
              <p className="mt-4 max-w-sm text-lg text-white/70">
                cartes eSIM au catalogue, chez {suppliers.length} fournisseur
                {suppliers.length > 1 ? 's' : ''}.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-white/70">Où se situent les prix</p>
              <PriceTrack
                min={metrics.price_range.min}
                max={metrics.price_range.max}
                median={metrics.pricing.median}
                mean={metrics.pricing.mean}
              />
            </div>
          </div>
        </header>

        {/* KPIs ------------------------------------------------------ */}
        <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Prix moyen"
            value={fmtEur(metrics.pricing.mean)}
            hint={`Médiane : ${fmtEur(metrics.pricing.median)}`}
          />
          <Stat
            label="Data moyenne par carte"
            value={`${metrics.avg_data_gb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`}
            hint={`Hors ${fmtInt(metrics.unlimited_count)} offres illimitées (${fmtPct(unlimitedShare)} du catalogue)`}
          />
          <Stat
            label="Produits à plus de 100 €"
            value={fmtInt(metrics.products_over_100)}
            hint={`${fmtPct(premiumShare)} du catalogue`}
            tone="warm"
          />
          <Stat
            label="Lignes rejetées à l'import"
            value={fmtInt(metrics.total_anomalies)}
            hint={`${fmtPct(rejectedShare)} des lignes lues`}
          />
        </section>

        {/* Suppliers + anomalies ------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Suppliers */}
          <section
            aria-labelledby="suppliers-title"
            className="rounded-3xl bg-white p-6 ring-1 ring-[#0C2340]/10 lg:col-span-2"
          >
            <h2 id="suppliers-title" className="font-display text-xl font-semibold">
              Cartes par fournisseur
            </h2>
            <p className="mt-1 text-sm text-[#0C2340]/60">
              {suppliers[0] ? (
                <>
                  <span className="font-medium capitalize text-[#0C2340]">{suppliers[0][0]}</span>{' '}
                  propose le plus de cartes ({fmtPct((suppliers[0][1] / total) * 100)}).
                </>
              ) : (
                'Aucun fournisseur.'
              )}
            </p>

            <ul className="mt-6 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
              {suppliers.map(([name, count]) => (
                <li key={name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium capitalize">{name}</span>
                    <span className="tabular-nums text-[#0C2340]/70">
                      {fmtInt(count)} <span className="text-[#0C2340]/40">· {fmtPct((count / total) * 100)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#0C2340]/8">
                    <div
                      className="h-full rounded-full bg-[#1F6FEB] transition-[width] duration-700 motion-reduce:transition-none"
                      style={{ width: `${(count / maxSupplier) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Anomalies */}
          <section
            aria-labelledby="anomalies-title"
            className="rounded-3xl bg-white p-6 ring-1 ring-[#0C2340]/10 lg:col-span-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="anomalies-title" className="font-display text-xl font-semibold">
                  Lignes rejetées
                </h2>
                <p className="mt-1 text-sm text-[#0C2340]/60">
                  {fmtInt(filteredAnomalies.length)} affichées sur {fmtInt(metrics.total_anomalies)} au total
                  {metrics.total_anomalies > anomalies.length &&
                    ` (les ${ANOMALY_LIMIT} premières sont chargées)`}
                  .
                </p>
              </div>

              <label className="text-sm">
                <span className="sr-only">Filtrer par fournisseur</span>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="rounded-full border-0 bg-[#F3F6FA] py-2 pl-4 pr-9 text-sm font-medium capitalize ring-1 ring-[#0C2340]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F6FEB]"
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
                <button
                  onClick={() => setReasonFilter('all')}
                  aria-pressed={reasonFilter === 'all'}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F6FEB] ${
                    reasonFilter === 'all'
                      ? 'bg-[#0C2340] text-white'
                      : 'bg-[#F3F6FA] text-[#0C2340]/70 hover:bg-[#E6ECF3]'
                  }`}
                >
                  Tous les motifs
                </button>
                {reasons.map(([reason, n]) => (
                  <button
                    key={reason}
                    onClick={() => setReasonFilter(reason)}
                    aria-pressed={reasonFilter === reason}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F6FEB] ${
                      reasonFilter === reason
                        ? 'bg-[#0C2340] text-white'
                        : 'bg-[#F3F6FA] text-[#0C2340]/70 hover:bg-[#E6ECF3]'
                    }`}
                  >
                    {reason} <span className="opacity-60">{n}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 max-h-[24rem] overflow-auto rounded-2xl ring-1 ring-[#0C2340]/10">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[#F3F6FA] text-[#0C2340]/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Fournisseur</th>
                    <th scope="col" className="px-4 py-3 font-medium">Produit</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Prix</th>
                    <th scope="col" className="px-4 py-3 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0C2340]/8">
                  {filteredAnomalies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[#0C2340]/50">
                        Aucune ligne ne correspond à ces filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredAnomalies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F3F6FA]/70">
                        <td className="px-4 py-3 font-medium capitalize">{item.supplier}</td>
                        <td className="px-4 py-3 text-[#0C2340]/75">{item.product_name || 'Sans nom'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#0C2340]/75">
                          {item.price !== undefined && item.price !== null ? fmtEur(item.price) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-[#FEF0E6] px-2.5 py-1 text-xs font-medium text-[#9A3412]">
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

        <footer className="pb-4 pt-2 text-center text-sm text-[#0C2340]/45">
          Test de recrutement MyBestSim · Données calculées par l'API FastAPI
        </footer>
      </div>

      <AIChat />
    </div>
  );
}

/* Fonts + font-family utilities, kept local so no config change is needed. */
function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap');
      .font-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }
      .font-body { font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; }
    `}</style>
  );
}