import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../components/CustomSelect';
import { Pagination } from '../components/Pagination';
import { SectionHeader } from '../components/SectionHeader';

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

  const [pageSize, setPageSize] = useState<number>(() => {
    const savedLimit = localStorage.getItem(settingsKey);
    return savedLimit ? Number(savedLimit) : 5;
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [history, setHistory] = useState<ExportLog[]>(() => {
    const savedHistory = localStorage.getItem(storageKey);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, storageKey]);

  useEffect(() => {
    localStorage.setItem(settingsKey, pageSize.toString());
    setCurrentPage(1);
  }, [pageSize, settingsKey]);

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
          <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'fitbits':
        return (
          <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'assignments':
        return (
          <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'syncs':
        return (
          <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'alerts':
        return (
          <svg className="h-6 w-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'researchers':
        return (
          <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTableIcon = (type: string) => {
    switch (type) {
      case 'participants':
        return <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>;
      case 'fitbits':
        return <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
      case 'assignments':
        return <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>;
      case 'syncs':
        return <div className="h-7 w-7 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div>;
      case 'alerts':
        return <div className="h-7 w-7 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></div>;
      case 'researchers':
        return <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>;
      default:
        return <div className="h-7 w-7 rounded-full bg-senda-light dark:bg-senda-input text-senda-main dark:text-slate-400 flex items-center justify-center"></div>;
    }
  };

  const totalPages = Math.ceil(history.length / pageSize) || 1;
  const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageSizeOptions = [
    { label: 5, value: 5 },
    { label: 10, value: 10 },
    { label: 15, value: 15 },
    { label: 20, value: 20 },
    { label: 25, value: 25 },
  ];

  return (
    <div className="w-full text-senda-main dark:text-senda-darktext space-y-8">
      <SectionHeader
        title={t('Exports Title')}
        subtitle={t('Exports Subtitle')}
      />

      <div className="rounded-2xl border border-[#2D6B40] dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/30 p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-blue-900 dark:text-blue-200">
          {t('Export Notice')}{' '}
          <span
            onClick={() => onNavigate && onNavigate('physiological')}
            className="font-bold underline cursor-pointer text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-blue-300 transition"
          >
            {t('Physiological Data Title')}
          </span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: t('Participants Resource'), type: 'participants', description: t('Participants Desc') },
          { label: t('Fitbits Resource'), type: 'fitbits', description: t('Fitbits Desc') },
          { label: t('Assignments Resource'), type: 'assignments', description: t('Assigments Desc') },
          { label: t('Syncs Resource'), type: 'syncs', description: t('Syncs Desc') },
          { label: t('Alerts Resource'), type: 'alerts', description: t('Alerts Desc') },
          { label: t('Researchers Resource'), type: 'researchers', description: t('Researchers Desc') },
        ].map((item) => (
          <div key={item.type} className="rounded-3xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-card p-6 shadow-sm flex flex-col justify-between transition-colors duration-300">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-senda-light dark:bg-senda-input flex items-center justify-center border border-senda-border dark:border-senda-darkborder">
                  {getCardIcon(item.type)}
                </div>
                <h2 className="text-xs font-semibold tracking-wide text-senda-main dark:text-white">{item.label}</h2>
              </div>
              <p className="text-xs text-[#6B6F66] dark:text-[#9AA093] leading-relaxed mb-6">{item.description}</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => download(item.type, item.label, 'csv')}
                className="w-full grid grid-cols-[1fr_auto_1fr] items-center rounded-xl bg-senda-primary hover:bg-[#184232] dark:bg-senda-accent dark:text-senda-dark dark:hover:bg-[#59a67e] px-4 py-3 text-[11px] font-bold text-white transition shadow-md shadow-emerald-500/20 cursor-pointer"
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
                className="w-full grid grid-cols-[1fr_auto_1fr] items-center rounded-xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-input hover:bg-senda-light dark:hover:bg-slate-700 px-4 py-3 text-[11px] font-bold text-senda-main dark:text-slate-300 transition shadow-sm cursor-pointer"
              >
                <span></span>
                <span className="text-center">{t('Download Excel')}</span>
                <div className="flex justify-end">
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono">.XLSX</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-card p-6 shadow-xl transition-colors duration-300 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-senda-main dark:text-white">{t('Latest Downloads')}</h2>
              <p className="text-[11px] text-[#6B6F66] dark:text-[#9AA093]">{t('Logs History Desc', { count: pageSize })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-senda-input px-3 h-[37px] text-xs font-bold text-rose-500 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer shadow-sm flex items-center"
              >
                {t('Clear History')}
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

        {paginatedHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-senda-border dark:border-senda-darkborder text-[10px] font-bold tracking-wider text-[#6B6F66] dark:text-[#9AA093] uppercase">
                  <th className="pb-3 pl-2">{t('Resource')}</th>
                  <th className="pb-3">{t('Format')}</th>
                  <th className="pb-3">{t('Date and Time')}</th>
                  <th className="pb-3 pr-2 text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-senda-border dark:divide-senda-darkborder text-xs">
                {paginatedHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-senda-light/80 dark:hover:bg-senda-dark/50 transition-colors duration-150">
                    <td className="py-3.5 pl-2 flex items-center gap-3">
                      {getTableIcon(log.type)}
                      <span className="font-semibold text-senda-main dark:text-slate-200 first-letter:uppercase lowercase">{log.label}</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold ring-1 ring-inset ${
                        log.format === 'XLSX'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900'
                          : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-900'
                      }`}>
                        {log.format}
                      </span>
                    </td>
                    <td className="py-3.5 text-[#6B6F66] dark:text-[#9AA093] font-medium">
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-input text-[#6B6F66] dark:text-slate-300 hover:bg-senda-light dark:hover:bg-slate-700 hover:text-senda-primary dark:hover:text-senda-accent transition shadow-sm cursor-pointer"
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default Exports;