import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type AssignmentItem = {
  id?: string | number;
  participant?: { participant_code?: string } | string | null;
  participant_code?: string | null;
  fitbit?: { fitbit_code?: string } | string | null;
  fitbit_code?: string | null;
  start_date: string;
  estimated_end_date?: string;
  real_end_date?: string | null;
  status: string;
};

const Assignments: React.FC = () => {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [fitbitsList, setFitbitsList] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEstimatedEndDate, setEditEstimatedEndDate] = useState('');
  const [editRealEndDate, setEditRealEndDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [newParticipantCode, setNewParticipantCode] = useState('');
  const [newFitbitCode, setNewFitbitCode] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEstimatedEndDate, setNewEstimatedEndDate] = useState('');
  const [newRealEndDate, setNewRealEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadAssignments = () => {
    fetch(`${API_BASE}/api/assignments/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.results || [];
        setAssignments(list);
      })
      .catch(() => setError(t('Error loading assignments')));
  };

  const loadDropdownLists = async () => {
    try {
      const [partRes, fitRes] = await Promise.all([
        fetch(`${API_BASE}/api/participants/list/`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/fitbits/list/`, { credentials: 'include' })
      ]);
      if (partRes.ok) {
        const partData = await partRes.json();
        setParticipantsList(partData.items || []);
      }
      if (fitRes.ok) {
        const fitData = await fitRes.json();
        setFitbitsList(fitData.items || []);
      }
    } catch (err) {
      console.error('Error cargando listas para desplegables', err);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadDropdownLists();
  }, []);

  const getParticipantCode = (item: AssignmentItem): string => {
    if (typeof item.participant === 'string') return item.participant;
    if (item.participant && typeof item.participant === 'object' && item.participant.participant_code) {
      return item.participant.participant_code;
    }
    if (item.participant_code) return item.participant_code;
    return 'N/A';
  };

  const getFitbitCode = (item: AssignmentItem): string => {
    if (typeof item.fitbit === 'string') return item.fitbit;
    if (item.fitbit && typeof item.fitbit === 'object' && item.fitbit.fitbit_code) {
      return item.fitbit.fitbit_code;
    }
    if (item.fitbit_code) return item.fitbit_code;
    return 'N/A';
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/api/assignments/create/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_code: newParticipantCode.trim(),
          fitbit_code: newFitbitCode.trim(),
          start_date: newStartDate,
          estimated_end_date: newEstimatedEndDate || null,
          real_end_date: newRealEndDate || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('Create assignment error'));
      }

      setSubmitSuccess(t('Assignment created successfully'));
      setNewParticipantCode('');
      setNewFitbitCode('');
      setNewStartDate('');
      setNewEstimatedEndDate('');
      setNewRealEndDate('');
      loadAssignments();

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

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !selectedAssignment.id) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`${API_BASE}/api/assignments/update/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAssignment.id,
          start_date: editStartDate,
          estimated_end_date: editEstimatedEndDate || null,
          real_end_date: editRealEndDate || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('Update assignment error'));
      }

      setIsEditing(false);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (err: any) {
      setEditError(err.message || t('Server connection error'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const toLocalDateTimeInput = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
      return adjustedDate.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const filtered = assignments.filter((item) => {
    const pCode = getParticipantCode(item).toLowerCase();
    const fCode = getFitbitCode(item).toLowerCase();
    const statusStr = item.status ? item.status.toLowerCase() : '';
    const searchLower = query.toLowerCase();

    return pCode.includes(searchLower) || fCode.includes(searchLower) || statusStr.includes(searchLower);
  });

  return (
    <div className="w-full text-slate-900 relative">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t('Assignments Title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">{filtered.length} {t('Assignments Registered')}</p>
        </div>
        <button
          onClick={() => {
            setSubmitError(null);
            setSubmitSuccess(null);
            loadDropdownLists();
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] hover:text-white text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer"
        >
          <span className="text-base font-bold leading-none text-s">+</span>
          <span className="text-[12px]">{t('New Assignment')}</span>
        </button>
      </div>

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
            placeholder={t('Search Assignment')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-4 font-bold rounded-l-2xl">{t('Participants Resource')}</th>
                  <th className="w-[18%] px-6 py-4 font-bold">{t('Fitbit')}</th>
                  <th className="w-[18%] px-6 py-4 font-bold">{t('Start Date')}</th>
                  <th className="w-[18%] px-6 py-4 font-bold">{t('Estimated End Date')}</th>
                  <th className="w-[18%] px-6 py-4 font-bold">{t('Real End Date')}</th>
                  <th className="w-[18%] px-6 py-4 font-bold rounded-r-2xl">{t('Status')}</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item, index) => {
                  const pCode = getParticipantCode(item);
                  const fCode = getFitbitCode(item);

                  return (
                    <tr
                      key={item.id || index}
                      onClick={() => {
                        setSelectedAssignment(item);
                        setIsEditing(false);
                        setEditStartDate(toLocalDateTimeInput(item.start_date));
                        setEditEstimatedEndDate(toLocalDateTimeInput(item.estimated_end_date));
                        setEditRealEndDate(toLocalDateTimeInput(item.real_end_date));
                        setEditError(null);
                      }}
                      className="cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-5 text-xs font-bold text-slate-900">
                        {pCode}
                      </td>

                      <td className="px-6 py-5 text-xs font-semibold text-blue-600">
                        {fCode}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.start_date
                          ? new Date(item.start_date).toLocaleDateString("es-ES")
                          : "-"}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.estimated_end_date
                          ? new Date(item.estimated_end_date).toLocaleDateString("es-ES")
                          : "-"}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.real_end_date ? (
                          new Date(item.real_end_date).toLocaleDateString("es-ES")
                        ) : (
                          <span className="italic text-slate-400">{t('In Progress')}</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${item.status?.toLowerCase() === 'active'
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : item.status?.toLowerCase() === 'pending'
                                ? "border-blue-100 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${item.status?.toLowerCase() === 'active'
                                ? "bg-emerald-500"
                                : item.status?.toLowerCase() === 'pending'
                                  ? "bg-blue-500"
                                  : "bg-slate-400"
                              }`}
                          />
                          {item.status}
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
          <p className="py-8 text-center text-xs text-slate-400">{t('No assignments found')}</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* MODAL PARA NUEVA ASIGNACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('New Assignment')}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Select Participant Label')}</label>
                <div className="relative">
                  <select
                    value={newParticipantCode}
                    onChange={(e) => setNewParticipantCode(e.target.value)}
                    required
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">{t('Select a participant')}</option>
                    {participantsList.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Select Fitbit Label')}</label>
                <div className="relative">
                  <select
                    value={newFitbitCode}
                    onChange={(e) => setNewFitbitCode(e.target.value)}
                    required
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">{t('Select a bracelet')}</option>
                    {fitbitsList.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Start Date')}</label>
                <input
                  type="datetime-local"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Estimated End Date')}</label>
                <input
                  type="datetime-local"
                  value={newEstimatedEndDate}
                  onChange={(e) => setNewEstimatedEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Real End Date Optional')}</label>
                <input
                  type="datetime-local"
                  value={newRealEndDate}
                  onChange={(e) => setNewRealEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-emerald-600">{submitSuccess}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? t('Processing') : t('Save Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE Y EDICIÓN DE ASIGNACIÓN */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {isEditing ? t('Edit Assignment') : t('Assignment Detail')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isEditing ? t('Edit Assignment Subtitle') : t('Assignment Detail Subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedAssignment(null); setIsEditing(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {!isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Participants Resource')}</span>
                    <span className="text-sm font-bold text-slate-900">{getParticipantCode(selectedAssignment)}</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Fitbit')}</span>
                    <span className="text-sm font-bold text-emerald-900">{getFitbitCode(selectedAssignment)}</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Start Date')}</span>
                    <span className="text-xs font-semibold text-slate-800">
                      {selectedAssignment.start_date ? new Date(selectedAssignment.start_date).toLocaleString('es-ES') : '—'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Estimated End Date')}</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {selectedAssignment.estimated_end_date ? new Date(selectedAssignment.estimated_end_date).toLocaleString('es-ES') : '—'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Real End Date')}</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {selectedAssignment.real_end_date ? new Date(selectedAssignment.real_end_date).toLocaleString('es-ES') : t('In Progress')}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-blue-900 mb-1">{t('Status')}</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${selectedAssignment.status?.toLowerCase() === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedAssignment.status?.toLowerCase() === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedAssignment.status?.toLowerCase() === 'active'
                            ? 'bg-emerald-600'
                            : selectedAssignment.status?.toLowerCase() === 'pending'
                              ? 'bg-blue-600'
                              : 'bg-slate-600'
                          }`} />
                        {selectedAssignment.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      if (!selectedAssignment || !selectedAssignment.id) return;
                      if (!confirm(`${t('Delete Assignment Confirmation')} ${getParticipantCode(selectedAssignment)}?`)) return;
                      try {
                        const resp = await fetch(`${API_BASE}/api/assignments/delete/`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: selectedAssignment.id }),
                        });
                        const j = await resp.json();
                        if (resp.ok) {
                          setSelectedAssignment(null);
                          loadAssignments();
                        } else {
                          alert(j.error || t('Delete assignment error'));
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
                    {t('Delete Assignment')}
                  </button>

                  <div className="flex w-full sm:w-auto gap-3">
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className="flex-1 sm:flex-none rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      {t('Close')}
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-lg shadow-blue-500/20"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('Modify')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdateAssignment} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div><span className="text-[11px] text-slate-400 block">{t('Participants Resource')}</span><strong className="text-slate-900">{getParticipantCode(selectedAssignment)}</strong></div>
                  <div><span className="text-[11px] text-slate-400 block">{t('Fitbit')}</span><strong className="text-blue-600">{getFitbitCode(selectedAssignment)}</strong></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Start Date')}</label>
                  <input
                    type="datetime-local"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Estimated End Date')}</label>
                  <input
                    type="datetime-local"
                    value={editEstimatedEndDate}
                    onChange={(e) => setEditEstimatedEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('Real End Date Optional')}</label>
                  <input
                    type="datetime-local"
                    value={editRealEndDate}
                    onChange={(e) => setEditRealEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {editError && <p className="text-xs text-red-600 font-medium">{editError}</p>}

                <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    {editSubmitting ? t('Processing') : t('Save Changes')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;