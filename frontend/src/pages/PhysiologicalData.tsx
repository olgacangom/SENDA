import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type PhysiologicalDataItem = {
  participant_code: string;
  fitbit_code: string;
  variable_type: string;
  physical_time: string;
  metric_value: number;
};

const API_BASE = 'http://localhost:1574';

const VARIABLE_OPTIONS = [
  // --- Datos diarios de sueño ---
  'SLEEP_DURATION', 'SLEEP_LIGHT', 'SLEEP_DEEP', 'SLEEP_REM',
  'SLEEP_AWAKE', 'SLEEP_START', 'SLEEP_END', 'SLEEP_MINUTES_TO_FALL_ASLEEP',
  'SLEEP_MINUTES_ASLEEP', 'SLEEP_AFTER_WAKE_UP',

  // --- Frecuencia respiratoria nocturna ---
  'RESPIRATORY_RATE_NOCTURNAL', 'RESPIRATORY_RATE_LIGHT',
  'RESPIRATORY_RATE_DEEP', 'RESPIRATORY_RATE_REM',

  // --- Variables fisiológicas diarias ---
  'HEART_RATE', 'HEART_RATE_RESTING', 'HRV_AVERAGE_MS', 'HRV_RMSSD',
  'HRV_NON_REM_HR', 'HRV_ENTROPY',

  // --- Actividad y zonas de frecuencia cardíaca ---
  'HR_ZONE_FAT_BURN', 'HR_ZONE_CARDIO', 'HR_ZONE_PEAK',
  'ACTIVE_ZONE_MINUTES', 'STEPS', 'DISTANCE'
];

const CustomMultiSearchableSelect: React.FC<{
  label: string;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder?: string;
}> = ({ label, selectedValues, onChange, options, placeholder = "Buscar..." }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return `${t('All')} ${label.toLowerCase()}s`;
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} ${label.toLowerCase()}s ${t('Selected plural')}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer transition hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800"
      >
        <span className="truncate">{getDisplayText()}</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          {selectedValues.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
              title={t('Clear selection')}
            >
              ✕
            </span>
          )}
          <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-2xl">
          <div className="relative mb-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            <div
              onClick={() => onChange([])}
              className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${selectedValues.length === 0 ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {t('All (Clear selection)')}
            </div>
            {filtered.map(opt => {
              const isSelected = selectedValues.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center justify-between cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${isSelected ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <span className="truncate mr-2">{opt}</span>
                  <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {isSelected && (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">{t('No results found')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PhysiologicalData: React.FC = () => {
  const { t } = useTranslation();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedFitbits, setSelectedFitbits] = useState<string[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const [data, setData] = useState<PhysiologicalDataItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [sortOrderDate, setSortOrderDate] = useState<'desc' | 'asc'>('desc');
  const [sortOrderValue, setSortOrderValue] = useState<'desc' | 'asc'>('desc');

  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [fitbitsList, setFitbitsList] = useState<string[]>([]);
  const [participantsStatusMap, setParticipantsStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/participants/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/fitbits/list/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/physiological-data/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/assignments/`, { credentials: 'include' }).then(r => r.json())
    ])
      .then(([partData, fitData, physData, assignData]) => {
        const itemsPart = partData.items || partData || [];
        setParticipantsList(itemsPart.map((p: any) => p.participant_code));
        setFitbitsList(fitData.items || []);

        const statusMap: Record<string, string> = {};
        const assignments = assignData.items || assignData || [];

        itemsPart.forEach((p: any) => {
          const assign = assignments.find((a: any) => {
            const aCode = typeof a.participant === 'string'
              ? a.participant
              : a.participant?.participant_code || a.participant_code;
            return aCode === p.participant_code;
          });

          if (!assign) {
            statusMap[p.participant_code] = 'PENDING';
          } else if (assign.real_end_date && new Date(assign.real_end_date) <= new Date()) {
            statusMap[p.participant_code] = 'COMPLETED';
          } else {
            statusMap[p.participant_code] = 'ACTIVE';
          }
        });
        setParticipantsStatusMap(statusMap);
      })
      .catch((err) => console.error("Error cargando metadatos", err));
  }, []);

  const loadData = () => {
    setError(null);
    const params = new URLSearchParams();
    if (selectedParticipants.length > 0) params.append('participant', selectedParticipants.join(','));
    if (selectedFitbits.length > 0) params.append('fitbit', selectedFitbits.join(','));
    if (selectedVariables.length > 0) params.append('variable_type', selectedVariables.join(','));
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);

    fetch(`${API_BASE}/api/physiological-data/?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((result) => {
        setData(result.items || []);
        setCurrentPage(1);
      })
      .catch(() => setError(t('Error loading physiological data')));
  };

  useEffect(() => {
    loadData();
  }, [selectedParticipants, selectedFitbits, selectedVariables, from, to, statusFilter]);

  const filteredDataByStatus = data.filter((item) => {
    const pStatus = participantsStatusMap[item.participant_code] || 'ACTIVE';
    if (statusFilter === 'ALL') return true;
    return pStatus === statusFilter;
  });

  const totalPages = Math.ceil(filteredDataByStatus.length / pageSize) || 1;
  const paginatedData = filteredDataByStatus.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clearFilters = () => {
    setSelectedParticipants([]);
    setSelectedFitbits([]);
    setSelectedVariables([]);
    setFrom('');
    setTo('');
    setStatusFilter('ALL');
    setSortOrderDate('desc');
    setSortOrderValue('desc');
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.append('type', 'physiological');
    params.append('format', format);
    if (selectedParticipants.length > 0) params.append('participant', selectedParticipants.join(','));
    if (selectedFitbits.length > 0) params.append('fitbit', selectedFitbits.join(','));
    if (selectedVariables.length > 0) params.append('variable_type', selectedVariables.join(','));
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);

    window.open(`${API_BASE}/api/export/?${params.toString()}`, '_blank');
  };

  const toggleSortOrderDate = () => {
    const newOrder = sortOrderDate === 'desc' ? 'asc' : 'desc';
    setSortOrderDate(newOrder);

    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.physical_time).getTime();
      const dateB = new Date(b.physical_time).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setData(sortedData);
  };

  const toggleSortOrderValue = () => {
    const newOrder = sortOrderValue === 'desc' ? 'asc' : 'desc';
    setSortOrderValue(newOrder);

    const sortedData = [...data].sort((a, b) => {
      return newOrder === 'desc' ? b.metric_value - a.metric_value : a.metric_value - b.metric_value;
    });
    setData(sortedData);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 space-y-8">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('Physiological Data Title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('Physiological Subtitle')}</p>
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ALL'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          {t('All')}
        </button>
        <button
          onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ACTIVE'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          {t('Active')}
        </button>
        <button
          onClick={() => { setStatusFilter('COMPLETED'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'COMPLETED'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          {t('Completed')}
        </button>
      </div>

      {/* FILTROS */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors duration-300">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleExport('csv')}
                className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition shadow-sm cursor-pointer"
              >
                {t('Export CSV')}
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition shadow-sm cursor-pointer"
              >
                {t('Export Excel')}
              </button>
            </div>
            <button
              onClick={clearFilters}
              className="ml-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] font-bold text-rose-500 dark:text-rose-400 transition hover:bg-rose-500 hover:text-white cursor-pointer shadow-sm"
            >
              {t('Clear Filters')}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CustomMultiSearchableSelect
            label={t('Participants Resource')}
            selectedValues={selectedParticipants}
            onChange={setSelectedParticipants}
            options={participantsList}
            placeholder={t('Search Participant')}
          />

          <CustomMultiSearchableSelect
            label={t('Fitbit')}
            selectedValues={selectedFitbits}
            onChange={setSelectedFitbits}
            options={fitbitsList}
            placeholder={t('Search Fitbit')}
          />

          <CustomMultiSearchableSelect
            label={t('Variable')}
            selectedValues={selectedVariables}
            onChange={setSelectedVariables}
            options={VARIABLE_OPTIONS}
            placeholder={t('Search Variable')}
          />

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{t('From')}</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 px-4 py-3 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{t('To')}</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 px-4 py-3 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors duration-300">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t('Detailed Records')}</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
            {t('Showing Filtered Records', { count: paginatedData.length, total: filteredDataByStatus.length })}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 dark:bg-slate-800/80 text-blue-900 dark:text-blue-300 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-3.5 font-bold rounded-l-2xl">{t('Participants Resource')}</th>
                  <th className="w-[17%] px-6 py-3.5 font-bold">{t('Status')}</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">{t('Fitbit')}</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">{t('Variable')}</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition" onClick={toggleSortOrderDate}>
                    <div className="flex items-center gap-1.5">
                      <span>{t('Time')}</span>
                    </div>
                  </th>
                  <th className="w-[14%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition rounded-r-2xl" onClick={toggleSortOrderValue}>
                    <div className="flex items-center gap-1.5">
                      <span>{t('Value')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((item, index) => {
                  const status = participantsStatusMap[item.participant_code] || 'ACTIVE';
                  return (
                    <tr key={`${item.participant_code}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">{item.participant_code}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold ${status === 'COMPLETED'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900'
                          }`}>
                          {status === 'COMPLETED' ? t('Completed') : t('Active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-blue-600 dark:text-blue-400">{item.fitbit_code}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900">
                          {item.variable_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{new Date(item.physical_time).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                        {item.metric_value !== null && item.metric_value !== undefined ? (() => {
                          const v = item.variable_type;
                          const val = item.metric_value;

                          if (v.startsWith('SLEEP_') && v !== 'SLEEP_START' && v !== 'SLEEP_END') return `${val} ${t('unit_min')}`;
                          if (v.includes('ZONE') || v === 'ACTIVE_ZONE_MINUTES') return `${val} ${t('unit_min')}`;
                          if (v === 'HEART_RATE' || v === 'HEART_RATE_RESTING' || v === 'HRV_NON_REM_HR') return `${val} ${t('unit_bpm')}`;
                          if (v.startsWith('RESPIRATORY_RATE_')) return `${val} ${t('unit_resp')}`;
                          if (v === 'HRV_AVERAGE_MS' || v === 'HRV_RMSSD') return `${val} ${t('unit_ms')}`;
                          if (v === 'HRV_ENTROPY') return `${val}`;
                          if (v === 'DISTANCE') return `${Number(val).toFixed(4)} ${t('unit_km')}`;
                          if (v === 'STEPS') return `${val} ${t('unit_steps')}`;

                          return val;
                        })() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {filteredDataByStatus.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-slate-400">
              {t('Page', { page: currentPage, totalPages })}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {t('Previous')}
              </button>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-950 px-4 py-2 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                {currentPage}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {t('Next')}
              </button>
            </div>
          </div>
        )}

        {filteredDataByStatus.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">{t('No Physiological Data')}</p>
        )}
        {error && (
          <p className="py-12 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default PhysiologicalData;