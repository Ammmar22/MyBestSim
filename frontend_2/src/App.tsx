import { useEffect, useState } from 'react';
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

export default function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  useEffect(() => {
    // Appel de l'API FastAPI locale
    Promise.all([
      fetch(`${API}/metrics`).then((res) => res.json()),
      fetch(`${API}/anomalies?limit=20`).then((res) => res.json()),
    ])
      .then(([metricsData, anomaliesData]) => {
        setMetrics(metricsData);
        setAnomalies(anomaliesData);
        setLoading(false);
      })
      .catch((err) => {
  console.error(err);
  setError("Impossible de charger les données.");
  setLoading(false);
});
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="text-xl font-medium animate-pulse">Chargement du dashboard MyBestSim...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl bg-red-50 p-6 text-red-700 border border-red-200 shadow-sm">
          <h2 className="text-lg font-bold mb-2">Erreur de connexion</h2>
          <p>{error || "Données indisponibles."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">MyBestSim eSIM Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Analyse automatisée du catalogue et rapport d'anomalies (Test de Recrutement)</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              API Connectée
            </span>
          </div>
        </header>

        {/* Grille des KPI Principaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cartes eSIM</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.total_esim.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Produits valides analysés</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prix Moyen & Médian</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{metrics.pricing.mean} €</span>
              <span className="text-sm text-slate-500">({metrics.pricing.median} € méd.)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Fourchette : {metrics.price_range.min} € – {metrics.price_range.max} €</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Data Moyenne / Illimité</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{metrics.avg_data_gb} Go</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                +{metrics.unlimited_count} illimitées
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Hors offres illimitées</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Produits &gt; 100 €</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{metrics.products_over_100}</p>
            <p className="text-xs text-slate-500 mt-1">Offres haut de gamme</p>
          </div>

        </div>

        {/* Section Répartition et Anomalies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Répartition par fournisseur */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Répartition par Fournisseur</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(metrics.supplier_distribution).map(([supplier, count]) => (
                <div key={supplier} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium capitalize text-slate-700">{supplier}</span>
                  <span className="text-sm font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rapport d'anomalies */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Rapport d'Anomalies</h2>
              <span className="text-xs font-semibold bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
                {metrics.total_anomalies} rejetées
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-400 sticky top-0 bg-white">
                    <th className="pb-3 px-3">Fournisseur</th>
                    <th className="pb-3 px-3">Produit</th>
                    <th className="pb-3 px-3">Prix</th>
                    <th className="pb-3 px-3">Raison du rejet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {anomalies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">Aucune anomalie signalée.</td>
                    </tr>
                  ) : (
                    anomalies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium capitalize text-slate-700">{item.supplier}</td>
                        <td className="py-3 px-3 text-slate-600">{item.product_name || 'N/A'}</td>
                        <td className="py-3 px-3 text-slate-600">{item.price !== undefined ? `${item.price} €` : 'N/A'}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                            {item.anomaly_reason}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}