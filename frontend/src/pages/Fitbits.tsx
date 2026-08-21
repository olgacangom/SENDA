import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type FitbitItem = {
  fitbit_code: string;
  status: string;
};

const Fitbits: React.FC = () => {
  const { t } = useTranslation();
  const [fitbits, setFitbits] = useState<FitbitItem[]>([]);
  const [summary, setSummary] = useState({ in_use: 0, free: 0, maintenance: 0, inactive: 0 });
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextCode, setNextCode] = useState('F_001');
  const [selectedStatus, setSelectedStatus] = useState('FREE');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [selectedFitbit, setSelectedFitbit] = useState<FitbitItem | null>(null);

  const loadFitbits = () => {
    fetch(`${API_BASE}/api/fitbits/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        const items = data.items || [];
        setFitbits(items);
        setSummary(data.counts || { in_use: 0, free: 0, maintenance: 0, inactive: 0 });

        if (items.length > 0) {
          const codes = items.map((f: FitbitItem) => {
            const match = f.fitbit_code.match(/F_(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          });
          const maxNum = Math.max(...codes, 0);
          setNextCode(`F_${String(maxNum + 1).padStart(3, '0')}`);
        } else {
          setNextCode('F_001');
        }
      })
      .catch(() => setError(t('Error loading fitbits')));
  };

  useEffect(() => {
    loadFitbits();
  }, []);

  const handleCreateFitbit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/api/fitbits/create/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fitbit_code: nextCode, status: selectedStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('Create fitbit error'));
      }

      setSubmitSuccess(`${t('Fitbit registered')} ${nextCode}.`);
      setSelectedStatus('FREE');
      loadFitbits();
      
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
      }, 1200);

    } catch (err: any) {
      setSubmitError(err.message || t('Server connection error'));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = fitbits.filter((fitbit) =>
    fitbit.fitbit_code.toLowerCase().includes(query.toLowerCase()) ||
    fitbit.status.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 relative">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Fitbit</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{filtered.length} {t('Devices Registered')}</p>
        </div>
        <button
          onClick={() => {
            setSubmitError(null);
            setSubmitSuccess(null);
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] hover:text-white text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer"
        >
          <span className="text-base font-bold leading-none">+</span>
          <span className="text-[12px]">{t('Register Fitbit')}</span>
        </button>
      </div>

      {/* Tarjetas de resumen superior */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        {[
          { 
            label: t('In Use'), 
            value: summary.in_use, 
            textColor: 'text-emerald-600 dark:text-emerald-400', 
            backgroundColor: 'bg-[#E6FFEE] dark:bg-emerald-950/40',
            borderColor: 'border-emerald-400 dark:border-emerald-800', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(5,150,105,0.15)] hover:border-emerald-200' 
          },
          { 
            label: t('Free'), 
            value: summary.free, 
            textColor: 'text-blue-600 dark:text-blue-400',
            backgroundColor: 'bg-[#E6F5FF] dark:bg-blue-950/40', 
            borderColor: 'border-blue-400 dark:border-blue-800', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(37,99,235,0.15)] hover:border-blue-200' 
          },
          { 
            label: t('Maintenance'), 
            value: summary.maintenance, 
            textColor: 'text-amber-600 dark:text-amber-400',
            backgroundColor: 'bg-[#FFF3E6] dark:bg-amber-950/40', 
            borderColor: 'border-amber-400 dark:border-amber-800', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(217,119,6,0.15)] hover:border-amber-200' 
          },
          { 
            label: t('Inactive'), 
            value: summary.inactive, 
            textColor: 'text-red-500 dark:text-red-400', 
            backgroundColor: 'bg-[#FFE6E6] dark:bg-red-950/40',
            borderColor: 'border-red-400 dark:border-red-800', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(100,116,139,0.15)] hover:border-red-200' 
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border ${item.backgroundColor} p-5 shadow-lg shadow-slate-100 dark:shadow-none transition-all duration-200 hover:-translate-y-1 text-center ${item.borderColor} ${item.hoverShadow}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${item.textColor}`}>
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors duration-300">
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
            placeholder={t('Search Fitbit')}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 py-3.5 pl-11 pr-4 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 dark:bg-slate-800/80 text-blue-900 dark:text-blue-300 uppercase text-[10px] tracking-wider">
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-l-2xl">{t('Fitbit')}</th>
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-r-2xl">{t('Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((fitbit) => {
                  const statusLower = fitbit.status.toLowerCase();
                  const badgeStyle = statusLower.includes('in_use') || statusLower.includes('uso')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900'
                    : statusLower.includes('free') || statusLower.includes('libre')
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900';

                  return (
                    <tr
                      key={fitbit.fitbit_code}
                      onClick={() => setSelectedFitbit(fitbit)}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold shadow-sm">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        {fitbit.fitbit_code}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 capitalize">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${badgeStyle}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                          {fitbit.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-8 text-center text-xs text-slate-400">{t('No Fitbits found')}</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* MODAL PARA REGISTRAR NUEVA FITBIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('Register New Fitbit')}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateFitbit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('Automatic Code')}
                </label>
                <input
                  type="text"
                  value={nextCode}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('Operational Status')}
                </label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 pr-10 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="FREE">{t('Free')}</option>
                    <option value="IN_USE">{t('In Use')}</option>
                    <option value="MAINTENANCE">{t('Maintenance')}</option>
                    <option value="INACTIVE">{t('Inactive')}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{submitSuccess}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? t('Processing') : t('Save Fitbit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE FITBIT */}
      {selectedFitbit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{t('Fitbit Detail')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('Fitbit Full Info')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFitbit(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 dark:text-blue-400 mb-1">{t('Code')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedFitbit.fitbit_code}</span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 dark:text-blue-400 mb-1">{t('Status')}</span>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold capitalize ${
                    selectedFitbit.status.toLowerCase().includes('in_use') || selectedFitbit.status.toLowerCase().includes('uso')
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : selectedFitbit.status.toLowerCase().includes('free') || selectedFitbit.status.toLowerCase().includes('libre')
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                    {selectedFitbit.status.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={async () => {
                  if (!selectedFitbit) return;
                  if (!confirm(`${t('Delete Fitbit Confirmation')} ${selectedFitbit.fitbit_code}?`)) return;
                  try {
                    const resp = await fetch(`${API_BASE}/api/fitbits/delete/`, {
                      method: 'DELETE',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ fitbit_code: selectedFitbit.fitbit_code }),
                    });
                    const j = await resp.json();
                    if (resp.ok) {
                      setSelectedFitbit(null);
                      loadFitbits();
                    } else {
                      alert(j.error || t('Delete Fitbit error'));
                    }
                  } catch (e) {
                    alert(t('Server connection error'));
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-5 py-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition cursor-pointer"
              >
                {t('Delete Fitbit')}
              </button>

              <button
                onClick={() => setSelectedFitbit(null)}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fitbits;