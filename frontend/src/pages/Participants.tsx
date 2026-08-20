import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type Participant = {
  participant_code: string;
  email?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_expiration?: string | null;
  authentication_status?: string;
};

const Participants: React.FC = () => {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [oauthModalVisible, setOauthModalVisible] = useState(false);
  const [oauthModalMessage, setOauthModalMessage] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadParticipants = () => {
    fetch(`${API_BASE}/api/participants/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.results || [];
        setParticipants(list);
      })
      .catch(() => setError(t('Error loading participants')));
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const participantCode = params.get('participant_code');

    if (oauthStatus === 'success') {
      setOauthModalMessage(
        `${t('Authorization success')} ${participantCode || ''}.`
      );
      setOauthModalVisible(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const getEmail = (p: Participant): string => {
    return p.email || t('No email');
  };

  const getAccessToken = (p: Participant): string | null => {
    return p.access_token || null;
  };

  const getRefreshToken = (p: Participant): string | null => {
    return p.refresh_token || null;
  };

  const getExpiration = (p: Participant): string | null => {
    return p.access_token_expiration || null;
  };

  const truncateToken = (token: string | null, startLen = 6, endLen = 4): string => {
    if (!token) return '';
    if (token.length <= startLen + endLen) return token;
    return `${token.substring(0, startLen)}...${token.substring(token.length - endLen)}`;
  };

  const handleCreateParticipant = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!newEmail.trim()) {
      setSubmitError(t('Valid email error'));
      return;
    }
    if (!newPassword) {
      setSubmitError(t('Password error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/participants/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || t('Create participant error'));
      } else {
        setSubmitSuccess(`${t('Participant created')} ${data.participant_code}.`);
        setNewEmail('');
        setNewPassword('');
        setShowModal(false);
        loadParticipants();
        window.location.href = `${API_BASE}/auth/login/`;
      }
    } catch (err) {
      setSubmitError(t('Server connection error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = participants.filter((person) => {
    const emailStr = getEmail(person);
    return (
      person.participant_code.toLowerCase().includes(query.toLowerCase()) ||
      emailStr.toLowerCase().includes(query.toLowerCase())
    );
  });

  const avatarColors = [
    { bg: 'bg-sky-50 text-sky-600', border: 'border-sky-100' },
    { bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    { bg: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
  ];

  return (
    <div className="w-full text-slate-900 relative">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t('Participants Title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">{filtered.length} {t('Enrolled People')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] hover:text-white text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer"
        >
          <span className="text-base font-bold leading-none text-s">+</span>
          <span className="text-[12px]">{t('Register Participant')}</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('Add Participant')}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateParticipant(); }} className="space-y-4" autoComplete="off">
              <input type="text" style={{ display: 'none' }} name="prevent_autofill" />
              <input type="password" style={{ display: 'none' }} name="prevent_autofill_password" />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Email')}</label>
                <input
                  type="email"
                  name="no_autofill_email_field"
                  value={newEmail}
                  autoComplete="off"
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="usuario@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Password')}</label>
                <input
                  type="password"
                  name="no_autofill_password_field"
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder={t('Password Placeholder')}
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-emerald-600">{submitSuccess}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? t('Processing') : t('Save Participant')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE PARTICIPANTE */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{t('Participant Detail')}</h2>
                  <p className="text-xs text-slate-500">{t('Full Info')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Code')}</span>
                <span className="text-sm font-bold text-slate-900">{selectedParticipant.participant_code}</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Email')}</span>
                <span className="text-xs font-semibold text-slate-800">{selectedParticipant.email || '—'}</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Status')}</span>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                    selectedParticipant.authentication_status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                    {selectedParticipant.authentication_status || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Token Expiration')}</span>
                <span className="text-xs font-semibold text-slate-800">
                  {selectedParticipant.access_token_expiration ? new Date(selectedParticipant.access_token_expiration).toLocaleString('es-ES') : t('Not available')}
                </span>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Access Token')}</span>
                <pre className="mt-1 whitespace-normal break-all rounded-xl p-3 bg-white border border-slate-200 font-mono text-[11px] text-slate-700">
                  {selectedParticipant.access_token || t('Not available')}
                </pre>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Refresh Token')}</span>
                <pre className="mt-1 whitespace-normal break-all rounded-xl p-3 bg-white border border-slate-200 font-mono text-[11px] text-slate-700">
                  {selectedParticipant.refresh_token || t('Not available')}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    if (!selectedParticipant) return;
                    if (!confirm(`${t('Delete confirmation')} ${selectedParticipant.participant_code}?`)) return;
                    try {
                      const resp = await fetch(`${API_BASE}/api/participants/`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ participant_code: selectedParticipant.participant_code }),
                      });
                      const j = await resp.json();
                      if (resp.ok) {
                        setSelectedParticipant(null);
                        loadParticipants();
                      } else {
                        alert(j.error || t('Delete participant error'));
                      }
                    } catch (e) {
                      alert(t('Server connection error'));
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('Delete Participant')}
                </button>

                {/* BOTÓN DE RECONEXIÓN RÁPIDA DE GOOGLE */}
                <a
                  href={`${API_BASE}/auth/login/`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-xs font-bold text-sky-700 hover:bg-sky-100 transition cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('Reconnect Google')}
                </a>
              </div>

              <button
                onClick={() => setSelectedParticipant(null)}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {oauthModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('Authorization Completed Title')}</h2>
              <button
                onClick={() => setOauthModalVisible(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-700">{oauthModalMessage}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOauthModalVisible(false)}
                className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] cursor-pointer"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
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
            placeholder={t('Search Participant')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-3.5 font-bold rounded-l-2xl">{t('Code')}</th>
                  <th className="w-[25%] px-6 py-3.5 font-bold">{t('Email')}</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">{t('Access Token')}</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">{t('Refresh Token')}</th>
                  <th className="w-[21%] px-6 py-3.5 font-bold rounded-r-2xl">{t('Token Expiration')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant, idx) => {
                  const emailVal = getEmail(participant);
                  const accessToken = getAccessToken(participant);
                  const refreshToken = getRefreshToken(participant);
                  const expirationVal = getExpiration(participant);
                  const colorStyle = avatarColors[idx % avatarColors.length];

                  return (
                    <tr
                      key={participant.participant_code}
                      onClick={() => setSelectedParticipant(participant)}
                      className="cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl ${colorStyle.bg} flex items-center justify-center font-bold shadow-sm`}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        {participant.participant_code}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{emailVal}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {accessToken ? (
                          <span
                            title={accessToken}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 font-mono"
                          >
                            <svg className="h-3.5 w-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {truncateToken(accessToken)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-blue-50/80 text-blue-700 border border-blue-100/60">
                            <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('No token')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {refreshToken ? (
                          <span
                            title={refreshToken}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 font-mono"
                          >
                            <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {truncateToken(refreshToken)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-blue-50/80 text-blue-700 border border-blue-100/60">
                            <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('No token')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {expirationVal ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(expirationVal).toLocaleString('es-ES')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-blue-50/80 text-blue-700 border border-blue-100/60">
                            <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('No token info')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-8 text-center text-xs text-slate-400">{t('No participants found')}</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Participants;