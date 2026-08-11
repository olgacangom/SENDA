import React, { useEffect, useState } from 'react';

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
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [fitbitsList, setFitbitsList] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);

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
      .catch(() => setError('No se pudieron cargar las asignaciones'));
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
        throw new Error(data.error || 'No se pudo crear la asignación');
      }

      setSubmitSuccess('Asignación creada correctamente.');
      setNewParticipantCode('');
      setNewFitbitCode('');
      setNewStartDate('');
      setNewEstimatedEndDate('');
      setNewRealEndDate('');
      loadAssignments();

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
        window.location.reload();
      }, 1200);

    } catch (err: any) {
      setSubmitError(err.message || 'Error al registrar la asignación');
    } finally {
      setSubmitting(false);
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
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Asignaciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">{filtered.length} asignaciones registradas en el estudio</p>
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
          <span className="text-[12px]">Nueva asignación</span>
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
            placeholder="Buscar por código de participante, pulsera o estado..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-4 font-bold rounded-l-2xl">PARTICIPANTE</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FITBIT</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA INICIO</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA FIN ESTIMADA</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA FIN REAL</th>
                  <th className="w-[18%] px-6 py-4 font-bold rounded-r-2xl">ESTADO</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item, index) => {
                  const pCode = getParticipantCode(item);
                  const fCode = getFitbitCode(item);

                  const isActive =
                    item.status?.toLowerCase().includes("active") ||
                    item.status?.toLowerCase().includes("en uso");

                  return (
                    <tr
                      key={item.id || index}
                      onClick={() => setSelectedAssignment(item)}
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
                          <span className="italic text-slate-400">En curso</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
                            isActive
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
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
          <p className="py-8 text-center text-xs text-slate-400">No se encontraron asignaciones.</p>
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
              <h2 className="text-lg font-bold text-slate-900">Nueva asignación</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código de Participante</label>
                <div className="relative">
                  <select
                    value={newParticipantCode}
                    onChange={(e) => setNewParticipantCode(e.target.value)}
                    required
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Selecciona un participante</option>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código de Fitbit</label>
                <div className="relative">
                  <select
                    value={newFitbitCode}
                    onChange={(e) => setNewFitbitCode(e.target.value)}
                    required
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Selecciona una pulsera</option>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de inicio</label>
                <input
                  type="datetime-local"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha fin estimada</label>
                <input
                  type="datetime-local"
                  value={newEstimatedEndDate}
                  onChange={(e) => setNewEstimatedEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha fin real (opcional)</label>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE ASIGNACIÓN */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Detalle de asignación</h2>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-slate-700">
              <div><strong>Participante:</strong> {getParticipantCode(selectedAssignment)}</div>
              <div><strong>Pulsera Fitbit:</strong> {getFitbitCode(selectedAssignment)}</div>
              <div><strong>Fecha de inicio:</strong> {selectedAssignment.start_date ? new Date(selectedAssignment.start_date).toLocaleString('es-ES') : '—'}</div>
              <div><strong>Fecha fin estimada:</strong> {selectedAssignment.estimated_end_date ? new Date(selectedAssignment.estimated_end_date).toLocaleString('es-ES') : '—'}</div>
              <div><strong>Fecha fin real:</strong> {selectedAssignment.real_end_date ? new Date(selectedAssignment.real_end_date).toLocaleString('es-ES') : 'En curso'}</div>
              <div><strong>Estado:</strong> {selectedAssignment.status}</div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (!selectedAssignment || !selectedAssignment.id) return;
                  if (!confirm(`¿Eliminar la asignación de ${getParticipantCode(selectedAssignment)}?`)) return;
                  try {
                    const resp = await fetch(`${API_BASE}/api/assignments/delete/`, {
                      method: 'DELETE',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: selectedAssignment.id }),
                    });
                    const j = await resp.json();
                    if (resp.ok) {
                      setSelectedAssignment(null);
                      loadAssignments();
                    } else {
                      alert(j.error || 'No se pudo eliminar la asignación');
                    }
                  } catch (e) {
                    alert('Error al conectar con el servidor');
                  }
                }}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 transition cursor-pointer"
              >
                Eliminar asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;