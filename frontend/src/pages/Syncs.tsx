import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type SyncLog = {
  id?: string;
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<number>(() => {
    const savedSize = localStorage.getItem('syncs_page_size');
    return savedSize ? Number(savedSize) : 10;  // tamaño de página dinámico, por defecto 10
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [sortField, setSortField] = useState<'date' | 'records'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchSyncs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/synclogs/`, { credentials: 'include' });
      const data = await res.json();
      const items = data.items || [];
      setSyncs(items);
      setMetrics({
        success: items.filter((item: SyncLog) => item.result.toLowerCase().includes('success')).length,
        error: items.filter((item: SyncLog) => !item.result.toLowerCase().includes('success')).length,
        total: items.length,
      });
    } catch {
      setError('No se pudieron cargar las sincronizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncs();
  }, []);

  useEffect(() => {
    localStorage.setItem('syncs_page_size', pageSize.toString());
    setCurrentPage(1);
  }, [pageSize]);

  const clearHistory = async () => {
    if (!window.confirm('¿Estás seguro de que deseas vaciar todo el historial de sincronizaciones? Esta acción no se puede deshacer.')) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/synclogs/clear/`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setSyncs([]);
        setMetrics({ success: 0, error: 0, total: 0 });
        setCurrentPage(1);
      } else {
        setError('No se pudo vaciar el historial');
      }
    } catch {
      setError('Error de red al intentar vaciar el historial');
    }
  };

  const getAccountEmail = (sync: SyncLog): string => {
    if (sync.google_account_email) return sync.google_account_email;
    if (typeof sync.google_account === 'string') return sync.google_account;
    if (sync.google_account && typeof sync.google_account === 'object' && sync.google_account.email) {
      return sync.google_account.email;
    }
    if (sync.email) return sync.email;
    return 'Sin cuenta';
  };

  const handleSort = (field: 'date' | 'records') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSorted = syncs
    .filter((sync) => {
      const email = getAccountEmail(sync);
      const isSuccess = sync.result.toLowerCase().includes('success');

      if (statusFilter === 'SUCCESS' && !isSuccess) return false;
      if (statusFilter === 'ERROR' && isSuccess) return false;

      return email.toLowerCase().includes(query.toLowerCase()) || sync.result.toLowerCase().includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.sync_date).getTime();
        const dateB = new Date(b.sync_date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.downloaded_records - a.downloaded_records : a.downloaded_records - b.downloaded_records;
      }
    });

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedSyncs = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className="w-full text-slate-900 space-y-8">

      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Sincronizaciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Historial de descargas desde Google Health API y estado de cada intento.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {syncs.length > 0 && (
            <button
              onClick={clearHistory}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl shadow-sm transition gap-2 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Vaciar historial</span>
            </button>
          )}
          <button
            onClick={fetchSyncs}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl shadow-sm transition gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Actualizando...' : 'Actualizar datos'}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de métricas superiores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xl shadow-emerald-100/40 transition-all duration-200 hover:-translate-y-1 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-emerald-600">ÉXITOS</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-800">{metrics.success}</p>
        </div>
        <div className="rounded-3xl border border-rose-200/80 bg-white p-5 shadow-xl shadow-rose-100/40 transition-all duration-200 hover:-translate-y-1 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-rose-600">ERRORES</p>
          <p className="mt-2 text-3xl font-extrabold text-rose-800">{metrics.error}</p>
        </div>
        <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xl shadow-blue-100/40 transition-all duration-200 hover:-translate-y-1 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-blue-600">TOTAL PROCESOS</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-800">{metrics.total}</p>
        </div>
      </div>

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40 space-y-6">

        {/* Pestañas de filtrado rápido por estado */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => { setStatusFilter('SUCCESS'); setCurrentPage(1); }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'SUCCESS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Éxitos
            </button>
            <button
              onClick={() => { setStatusFilter('ERROR'); setCurrentPage(1); }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ERROR' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Errores
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-600">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
              </select>
              <span>por página</span>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
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
                  <th className="w-[20%] px-6 py-3.5 font-bold rounded-l-2xl">ID REGISTRO</th>
                  <th className="w-[30%] px-6 py-3.5 font-bold">CUENTA</th>
                  <th
                    className="w-[25%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>INICIO</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                  <th className="w-[15%] px-6 py-3.5 font-bold">RESULTADO</th>
                  <th
                    className="w-[10%] px-6 py-3.5 font-bold rounded-r-2xl cursor-pointer select-none hover:text-blue-600 transition"
                    onClick={() => handleSort('records')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>REGS</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortField === 'records' && sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSyncs.map((sync, index) => {
                  const isSuccess = sync.result.toLowerCase().includes('success');
                  const shortId = sync.id ? `SYNC_${sync.id.substring(0, 6).toUpperCase()}` : `SYNC_${index + 1}`;
                  const accountEmail = getAccountEmail(sync);

                  return (
                    <tr key={sync.id || index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 font-semibold">{shortId}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 truncate" title={accountEmail}>{accountEmail}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">{new Date(sync.sync_date).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border ${
                          isSuccess
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

        {/* Paginación dinámica */}
        {filteredAndSorted.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-slate-400">
              Página {currentPage} de {totalPages} (Mostrando {paginatedSyncs.length} de {filteredAndSorted.length} registros filtrados)
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                ← Anterior
              </button>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-[11px] font-bold text-blue-700">
                {currentPage}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {paginatedSyncs.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">No se encontraron sincronizaciones con los filtros aplicados.</p>
        )}
        {error && (
          <p className="py-12 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Syncs;