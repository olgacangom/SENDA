import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type SyncLog = {
  google_account_email?: string | null;
  google_account?: { email?: string } | string | null;
  email?: string | null;
  sync_date: string;
  result: string;
  downloaded_records: number;
};

const Syncs: React.FC = () => {
  const [syncs, setSyncs] = useState<SyncLog[]>([]);
  const [metrics, setMetrics] = useState({ success: 0, error: 0, total: 0 });
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [sortOrderId, setSortOrderId] = useState<'desc' | 'asc'>('desc');
  const [sortOrderDate, setSortOrderDate] = useState<'desc' | 'asc'>('desc');
  const [sortOrderRecords, setSortOrderRecords] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    fetch(`${API_BASE}/api/synclogs/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const items = data.items || [];
        setSyncs(items);
        setMetrics({
          success: items.filter((item: SyncLog) => item.result.toLowerCase().includes('success')).length,
          error: items.filter((item: SyncLog) => !item.result.toLowerCase().includes('success')).length,
          total: items.length,
        });
      })
      .catch(() => setError('No se pudieron cargar las sincronizaciones'));
  }, []);

  const getAccountEmail = (sync: SyncLog): string => {
    if (sync.google_account_email) return sync.google_account_email;
    if (typeof sync.google_account === 'string') return sync.google_account;
    if (sync.google_account && typeof sync.google_account === 'object' && sync.google_account.email) {
      return sync.google_account.email;
    }
    if (sync.email) return sync.email;
    return 'Sin cuenta';
  };


  const toggleSortId = () => {
    const newOrder = sortOrderId === 'desc' ? 'asc' : 'desc';
    setSortOrderId(newOrder);

    const sortedSyncs = [...syncs].sort((a, b) => {
      const dateA = new Date(a.sync_date).getTime();
      const dateB = new Date(b.sync_date).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setSyncs(sortedSyncs);
  };

  const toggleSortDate = () => {
    const newOrder = sortOrderDate === 'desc' ? 'asc' : 'desc';
    setSortOrderDate(newOrder);

    const sortedSyncs = [...syncs].sort((a, b) => {
      const dateA = new Date(a.sync_date).getTime();
      const dateB = new Date(b.sync_date).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setSyncs(sortedSyncs);
  };

  const toggleSortRecords = () => {
    const newOrder = sortOrderRecords === 'desc' ? 'asc' : 'desc';
    setSortOrderRecords(newOrder);

    const sortedSyncs = [...syncs].sort((a, b) => {
      return newOrder === 'desc' ? b.downloaded_records - a.downloaded_records : a.downloaded_records - b.downloaded_records;
    });
    setSyncs(sortedSyncs);
  };

  const filtered = syncs.filter((sync) => {
    const email = getAccountEmail(sync);
    return email.toLowerCase().includes(query.toLowerCase()) || sync.result.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="w-full text-slate-900 space-y-8">

      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Sincronizaciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Historial de descargas desde Google Health API y estado de cada intento.</p>
        </div>
      </div>

      {/* Tarjetas de métricas superiores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xl shadow-emerald-100/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_25px_-5px_rgba(5,150,105,0.1)] text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-emerald-600">ÉXITOS</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-800">{metrics.success}</p>
        </div>
        <div className="rounded-3xl border border-rose-200/80 bg-white p-5 shadow-xl shadow-rose-100/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_25px_-5px_rgba(225,29,72,0.1)] text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-rose-600">ERRORES</p>
          <p className="mt-2 text-3xl font-extrabold text-rose-800">{metrics.error}</p>
        </div>
        <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xl shadow-blue-100/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_25px_-5px_rgba(37,99,235,0.1)] text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-blue-600">TOTAL PROCESOS</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-800">{metrics.total}</p>
        </div>
      </div>

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">

        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Historial de registros</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {filtered.length} sincronizaciones
          </span>
        </div>

        {/* Barra de búsqueda interna con icono de lupa */}
        <div className="mb-6 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cuenta de correo o resultado..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        {/* Tabla de registros */}
        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th
                    className="w-[15%] px-6 py-3.5 font-bold rounded-l-2xl cursor-pointer select-none hover:text-blue-600 transition"
                    onClick={toggleSortId}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ID</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortOrderId === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                  <th className="w-[30%] px-6 py-3.5 font-bold">CUENTA</th>

                  <th
                    className="w-[25%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition"
                    onClick={toggleSortDate}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>INICIO</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortOrderDate === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>

                  <th className="w-[15%] px-6 py-3.5 font-bold">RESULTADO</th>

                  <th
                    className="w-[15%] px-6 py-3.5 font-bold rounded-r-2xl cursor-pointer select-none hover:text-blue-600 transition"
                    onClick={toggleSortRecords}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>REGISTROS</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortOrderRecords === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sync, index) => {
                  const isSuccess = sync.result.toLowerCase().includes('success');
                  const syncIdNum = sortOrderId === 'desc' ? syncs.length - index : index + 1;
                  const formattedId = `SYNC_${String(syncIdNum).padStart(4, '0')}`;
                  const accountEmail = getAccountEmail(sync);

                  return (
                    <tr key={`${accountEmail}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{formattedId}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">{accountEmail}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">{new Date(sync.sync_date).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border ${isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {sync.result}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{sync.downloaded_records}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">No se encontraron sincronizaciones.</p>
        )}
        {error && (
          <p className="py-12 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Syncs;