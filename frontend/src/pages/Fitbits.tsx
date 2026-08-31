import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../components/CustomSelect';
import { Pagination } from '../components/Pagination';
import { SectionHeader } from '../components/SectionHeader';

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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextCode, setNextCode] = useState('F_001');
  const [selectedStatus, setSelectedStatus] = useState('FREE');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [selectedFitbit, setSelectedFitbit] = useState<FitbitItem | null>(null);

  const [pageSize, setPageSize] = useState<number>(() => {
    const savedSize = localStorage.getItem('fitbits_page_size');
    return savedSize ? Number(savedSize) : 10;
  });
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    localStorage.setItem('fitbits_page_size', pageSize.toString());
    setCurrentPage(1);
  }, [pageSize]);

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

  const filtered = fitbits.filter((fitbit) => {
    const matchesQuery =
      fitbit.fitbit_code.toLowerCase().includes(query.toLowerCase()) ||
      fitbit.status.toLowerCase().includes(query.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || fitbit.status.toUpperCase() === selectedStatusFilter.toUpperCase();

    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedFitbits = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageSizeOptions = [
    { label: 5, value: 5 },
    { label: 10, value: 10 },
    { label: 15, value: 15 },
    { label: 20, value: 20 },
    { label: 25, value: 25 },
  ];

  return (
    <div className="w-full text-senda-main dark:text-senda-darktext relative space-y-8">
      <SectionHeader
        title="Fitbit"
        subtitle={`${filtered.length} ${t('Devices Registered')}`}
        actionLabel={t('Register Fitbit')}
        onAction={() => {
          setSubmitError(null);
          setSubmitSuccess(null);
          setIsModalOpen(true);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            statusKey: 'IN_USE',
            label: t('In Use'),
            value: summary.in_use,
            textColor: 'text-emerald-700 dark:text-emerald-400',
            backgroundColor: 'bg-[#EAF1EA] dark:bg-senda-card',
            borderColor: 'border-[#8DC29A]/40 dark:border-senda-darkborder',
            activeRing: 'border-senda-primary dark:border-senda-accent ring-2 ring-emerald-600/20',
            hoverShadow: 'hover:shadow-md'
          },
          {
            statusKey: 'FREE',
            label: t('Free'),
            value: summary.free,
            textColor: 'text-blue-700 dark:text-blue-400',
            backgroundColor: 'bg-blue-50/50 dark:bg-senda-card',
            borderColor: 'border-blue-200 dark:border-blue-900',
            activeRing: 'border-blue-500 ring-2 ring-blue-600/20',
            hoverShadow: 'hover:shadow-md'
          },
          {
            statusKey: 'MAINTENANCE',
            label: t('Maintenance'),
            value: summary.maintenance,
            textColor: 'text-amber-700 dark:text-amber-400',
            backgroundColor: 'bg-amber-50/50 dark:bg-senda-card',
            borderColor: 'border-amber-200 dark:border-amber-900',
            activeRing: 'border-amber-500 ring-2 ring-amber-600/20',
            hoverShadow: 'hover:shadow-md'
          },
          {
            statusKey: 'INACTIVE',
            label: t('Inactive'),
            value: summary.inactive,
            textColor: 'text-red-600 dark:text-red-400',
            backgroundColor: 'bg-red-50/50 dark:bg-senda-card',
            borderColor: 'border-red-200 dark:border-red-900',
            activeRing: 'border-red-500 ring-2 ring-red-600/20',
            hoverShadow: 'hover:shadow-md'
          },
        ].map((item) => {
          const isSelected = selectedStatusFilter === item.statusKey;
          return (
            <div
              key={item.label}
              onClick={() => {
                setSelectedStatusFilter(isSelected ? 'ALL' : item.statusKey);
                setCurrentPage(1);
              }}
              className={`cursor-pointer rounded-2xl border ${item.backgroundColor} p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 text-center ${item.hoverShadow} ${isSelected ? item.activeRing : item.borderColor
                }`}
            >
              <p className={`text-[11px] font-extrabold uppercase tracking-[0.25em] ${item.textColor}`}>
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-extrabold text-senda-main dark:text-white" style={{ fontFamily: 'Fraunces, serif' }}>{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-card p-6 shadow-xl space-y-6 transition-colors duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              placeholder={t('Search Fitbit')}
              className="w-full rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light/60 dark:bg-senda-dark/80 h-[37px] pl-11 pr-4 text-xs text-senda-main dark:text-white outline-none transition focus:border-senda-secondary"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            {selectedStatusFilter !== 'ALL' && (
              <button
                onClick={() => { setSelectedStatusFilter('ALL'); setCurrentPage(1); }}
                className="rounded-xl border border-senda-border dark:border-senda-darkborder bg-senda-light dark:bg-senda-input px-4 h-[37px] text-xs font-bold text-[#6B6F66] dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer flex items-center"
              >
                {t('Clear filter')} ({selectedStatusFilter})
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-senda-light dark:bg-senda-input px-3 h-[37px] rounded-2xl text-xs font-semibold text-[#6B6F66] dark:text-[#9AA093] border border-senda-border dark:border-senda-darkborder">
              <CustomSelect
                value={pageSize}
                onChange={(val) => setPageSize(Number(val))}
                options={pageSizeOptions}
                width="w-28"
              />
              <span>{t('Per Page')}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-[#DCEBE1]/60 dark:bg-senda-darkborder/80 text-senda-primary dark:text-senda-accent uppercase text-[10px] tracking-wider">
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-l-2xl">{t('Fitbit')}</th>
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-r-2xl">{t('Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-senda-border dark:divide-senda-darkborder">
                {paginatedFitbits.map((fitbit) => {
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
                      className="cursor-pointer hover:bg-senda-light/80 dark:hover:bg-senda-dark/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-senda-main dark:text-white flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-senda-light dark:bg-senda-dark text-[#6B6F66] dark:text-[#9AA093] flex items-center justify-center font-bold shadow-sm border border-senda-border dark:border-senda-darkborder">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        {fitbit.fitbit_code}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#6B6F66] dark:text-[#9AA093] capitalize">
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {filtered.length === 0 && !error && (
          <p className="py-8 text-center text-xs text-slate-400">{t('No Fitbits found')}</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-senda-card border border-senda-border dark:border-senda-darkborder p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-senda-main dark:text-white" style={{ fontFamily: 'Fraunces, serif' }}>{t('Register New Fitbit')}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6B6F66] dark:text-[#9AA093] hover:text-senda-main dark:hover:text-white cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateFitbit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B6F66] dark:text-[#9AA093] mb-1">
                  {t('Automatic Code')}
                </label>
                <input
                  type="text"
                  value={nextCode}
                  disabled
                  className="w-full rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light dark:bg-senda-input px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B6F66] dark:text-[#9AA093] mb-1">
                  {t('Operational Status')}
                </label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light dark:bg-senda-input px-4 py-3 pr-10 text-sm text-senda-main dark:text-white outline-none focus:border-senda-secondary cursor-pointer"
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
                  className="rounded-2xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-input px-5 py-3 text-sm font-semibold text-senda-main dark:text-slate-300 hover:bg-senda-light dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-senda-primary hover:bg-[#184232] dark:bg-senda-accent dark:text-senda-dark dark:hover:bg-[#59a67e] px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? t('Processing') : t('Save Fitbit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedFitbit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-senda-card border border-senda-border dark:border-senda-darkborder p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBE1] dark:bg-senda-darkborder text-senda-primary dark:text-senda-accent">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-senda-main dark:text-white" style={{ fontFamily: 'Fraunces, serif' }}>{t('Fitbit Detail')}</h2>
                  <p className="text-xs text-[#6B6F66] dark:text-[#9AA093]">{t('Fitbit Full Info')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFitbit(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-senda-light dark:bg-senda-input text-[#6B6F66] dark:text-slate-300 hover:border-senda-border dark:hover:bg-slate-700 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light/70 dark:bg-senda-input/50 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-senda-secondary dark:text-senda-accent mb-1">{t('Code')}</span>
                <span className="text-sm font-bold text-senda-main dark:text-white">{selectedFitbit.fitbit_code}</span>
              </div>

              <div className="rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light/70 dark:bg-senda-input/50 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-senda-secondary dark:text-senda-accent mb-1">{t('Status')}</span>
                <div className="flex flex-col gap-2">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold capitalize ${selectedFitbit.status.toLowerCase().includes('in_use') || selectedFitbit.status.toLowerCase().includes('uso')
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : selectedFitbit.status.toLowerCase().includes('free') || selectedFitbit.status.toLowerCase().includes('libre')
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {selectedFitbit.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>

                  <select
                    value={selectedFitbit.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        const resp = await fetch(`${API_BASE}/api/fitbits/update/status/`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fitbit_code: selectedFitbit.fitbit_code, status: newStatus }),
                        });
                        if (resp.ok) {
                          setSelectedFitbit({ ...selectedFitbit, status: newStatus });
                          loadFitbits();
                        } else {
                          alert(t('Error updating status'));
                        }
                      } catch {
                        alert(t('Server connection error'));
                      }
                    }}
                    className="w-full rounded-xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-dark px-3 py-2 text-xs text-senda-main dark:text-white outline-none cursor-pointer mt-1"
                  >
                    <option value="FREE">{t('Free')}</option>
                    <option value="IN_USE">{t('In Use')}</option>
                    <option value="MAINTENANCE">{t('Maintenance')}</option>
                    <option value="INACTIVE">{t('Inactive')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-senda-border dark:border-senda-darkborder">
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
                className="w-full sm:w-auto rounded-2xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-input px-6 py-3 text-xs font-bold text-senda-main dark:text-slate-300 hover:bg-senda-light dark:hover:bg-slate-700 transition cursor-pointer"
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