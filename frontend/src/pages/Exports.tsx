import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ExportLog = {
  id: string;
  type: string;
  label: string;
  format: string;
  dateStr: string;
  timeStr: string;
};

const API_BASE = 'http://localhost:1574';

interface ExportsProps {
  userEmail: string;
  onNavigate?: (view: string) => void;
}

const Exports: React.FC<ExportsProps> = ({ onNavigate, userEmail }) => {
  const { t } = useTranslation();
  const storageKey = userEmail ? `export_history_${userEmail}` : 'export_history_guest';
  const settingsKey = userEmail ? `export_max_logs_${userEmail}` : 'export_max_logs_guest';

  const [maxLogs, setMaxLogs] = useState<number>(() => {
    const savedLimit = localStorage.getItem(settingsKey);
    return savedLimit ? Number(savedLimit) : 5;
  });

  const [history, setHistory] = useState<ExportLog[]>(() => {
    const savedHistory = localStorage.getItem(storageKey);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // Sincronizar historial con el usuario logueado
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, storageKey]);

  useEffect(() => {
    localStorage.setItem(settingsKey, maxLogs.toString());
  }, [maxLogs, settingsKey]);

  const download = (type: string, label: string, format: string = 'csv') => {
    window.open(`${API_BASE}/api/export/?type=${type}&format=${format}`, '_blank');

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog: ExportLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      label,
      format: format.toUpperCase(),
      dateStr,
      timeStr,
    };

    setHistory((prev) => [newLog, ...prev].slice(0, 25));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'participants':
        return (
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'fitbits':
        return (
          <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'syncs':
        return (
          <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'physiological':
        return (
          <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTableIcon = (type: string) => {
    switch (type) {
      case 'participants':
        return <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>;
      case 'fitbits':
        return <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
      case 'syncs':
        return <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div>;
      case 'physiological':
        return <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></div>;
      default:
        return <div className="h-7 w-7 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center"></div>;
    }
  };

  const displayedHistory = history.slice(0, maxLogs);

  return (
    <div className="w-full text-slate-900 space-y-8">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Exports Title')}</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">{t('Exports Subtitle')}</p>
      </div>

      {/* Tarjeta informativa superior */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-blue-900">
          {t('Export Notice')}{' '}
          <span
            onClick={() => onNavigate && onNavigate('physiological')}
            className="font-bold underline cursor-pointer text-blue-700 hover:text-blue-900 transition"
          >
            {t('Physiological Data Title')}
          </span>.
        </p>
      </div>

      {/* Cuadrícula de tarjetas de exportación */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t('Participants Resource'), type: 'participants', description: t('Participants Desc') },
          { label: t('Fitbits Resource'), type: 'fitbits', description: t('Fitbits Desc') },
          { label: t('Syncs Resource'), type: 'syncs', description: t('Syncs Desc') },
          { label: t('Physiological Resource'), type: 'physiological', description: t('Physiological Desc') },
        ].map((item) => (
          <div key={item.type} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {getCardIcon(item.type)}
                </div>
                <h2 className="text-xs font-semibold tracking-wide text-slate-900">{item.label}</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{item.description}</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => download(item.type, item.label, 'csv')}
                className="w-full grid grid-cols-[1fr_auto_1fr] items-center rounded-xl bg-[#3A8FC2] hover:bg-[#27648A] px-4 py-3 text-[11px] font-bold text-white transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span></span>
                <span className="text-center">{t('Download CSV')}</span>
                <div className="flex justify-end">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </button>

              <button
                type="button"
                onClick={() => download(item.type, item.label, 'xlsx')}
                className="w-full grid grid-cols-[1fr_auto_1fr] items-center rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-100 px-4 py-3 text-[11px] font-bold text-slate-700 transition shadow-sm cursor-pointer"
              >
                <span></span>
                <span className="text-center">{t('Download Excel')}</span>
                <div className="flex justify-end">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">.XLSX</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sección de registro */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">{t('Latest Downloads')}</h2>
              <p className="text-[11px] text-slate-400">{t('Logs History Desc', { count: maxLogs })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-600">
              <select
                value={maxLogs}
                onChange={(e) => setMaxLogs(Number(e.target.value))}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
              </select>
              <span>{t('Records Count')}</span>
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-500 transition hover:bg-rose-50 cursor-pointer shadow-sm"
              >
                {t('Clear History')}
              </button>
            )}
          </div>
        </div>

        {displayedHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="pb-3 pl-2">{t('Resource')}</th>
                  <th className="pb-3">{t('Format')}</th>
                  <th className="pb-3">{t('Date and Time')}</th>
                  <th className="pb-3 pr-2 text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {displayedHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-3.5 pl-2 flex items-center gap-3">
                      {getTableIcon(log.type)}
                      <span className="font-semibold text-slate-800 first-letter:uppercase lowercase">{log.label}</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold ring-1 ring-inset ${log.format === 'XLSX'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-sky-50 text-sky-700 ring-sky-200'
                        }`}>
                        {log.format}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {log.dateStr} &nbsp;&nbsp;
                        <svg className="h-3.5 w-3.5 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {log.timeStr}
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        onClick={() => download(log.type, log.label, log.format.toLowerCase() === 'xlsx' ? 'xlsx' : 'csv')}
                        title="Volver a descargar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition shadow-sm cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-slate-400">{t('No Downloads')}</p>
        )}
      </div>
    </div>
  );
};

export default Exports;