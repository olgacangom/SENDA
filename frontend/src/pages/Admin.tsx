import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type Researcher = {
  email: string;
  created_at: string;
  is_active: boolean;
};

const Admin: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/researchers/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setResearchers(data.items || []))
      .catch(() => setError(t('Error loading researchers')));
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/researchers/create/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('Create researcher error'));
        return;
      }
      setMessage(`${t('Email sent to researcher')} ${data.email} ${t('pending acceptance')}.`);
      setResearchers((prev) => [{ email: data.email, created_at: new Date().toISOString(), is_active: false }, ...prev]);
      setEmail('');
    } catch {
      setError(t('Server connection error'));
    }
  };

  const deleteResearcher = async (researcherEmail: string) => {
    if (!window.confirm(`${t('Delete researcher confirmation')} ${researcherEmail}?`)) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/researchers/delete/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: researcherEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('Delete researcher error'));
        return;
      }
      setMessage(`${t('Researcher deleted successfully')}: ${researcherEmail}`);
      setResearchers((prev) => prev.filter((r) => r.email !== researcherEmail));
    } catch {
      setError(t('Server connection error'));
    }
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 space-y-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('Admin Title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('Admin Subtitle')}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors duration-300">
        <form onSubmit={submit} autoComplete="off" className="grid gap-6 sm:grid-cols-2 items-end">
          <div className="col-span-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{t('Researcher Email Input')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investigador@senda.es"
              required
              autoComplete="off"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 px-4 py-3.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
          <div className="col-span-1 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center px-5 py-3.5 bg-[#3A8FC2] hover:bg-[#27648A] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer"
            >
              <span className="text-base font-bold leading-none">+</span>
              <span className="text-[12px]">{t('Authorize Btn')}</span>
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 p-4 rounded-2xl shadow-sm">{message}</p>}
        {error && <p className="mt-4 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl shadow-sm">{error}</p>}
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors duration-300">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t('Authorized Researchers')}</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
            {researchers.length} {t('Accounts Registered')}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 dark:bg-slate-800/80 text-blue-900 dark:text-blue-300 uppercase text-[10px] tracking-wider">
                  <th className="w-[40%] px-6 py-3.5 font-bold rounded-l-2xl">{t('Email')}</th>
                  <th className="w-[30%] px-6 py-3.5 font-bold">{t('Created')}</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold">{t('Status')}</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold rounded-r-2xl text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {researchers.map((r) => (
                  <tr key={r.email} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">{r.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border ${
                        r.is_active 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' 
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {r.is_active ? t('Active') : t('Pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-right">
                      <button
                        type="button"
                        onClick={() => deleteResearcher(r.email)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 transition shadow-sm cursor-pointer"
                        title={t('Delete Researcher')}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {researchers.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">{t('No Researchers')}</p>
        )}
      </div>
    </div>
  );
};

export default Admin;