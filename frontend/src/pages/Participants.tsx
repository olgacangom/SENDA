import React, { useEffect, useState } from 'react';

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
      .catch(() => setError('No se pudieron cargar los participantes'));
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
        `¡Autorización exitosa! Cuenta vinculada correctamente al código ${participantCode || ''}.`
      );
      setOauthModalVisible(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const getEmail = (p: Participant): string => {
    return p.email || 'Sin correo';
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

  // Función para truncar los tokens largos (puntos suspensivos)
  const truncateToken = (token: string | null, startLen = 6, endLen = 4): string => {
    if (!token) return '';
    if (token.length <= startLen + endLen) return token;
    return `${token.substring(0, startLen)}...${token.substring(token.length - endLen)}`;
  };

  const handleCreateParticipant = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!newEmail.trim()) {
      setSubmitError('Introduce un correo válido.');
      return;
    }
    if (!newPassword) {
      setSubmitError('Introduce una contraseña.');
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
        setSubmitError(data.error || 'No se pudo crear el participante.');
      } else {
        setSubmitSuccess(`Participante ${data.participant_code} creado correctamente. Redirigiendo a Google Health...`);
        setNewEmail('');
        setNewPassword('');
        setShowModal(false);
        loadParticipants();
        window.location.href = `${API_BASE}/auth/login/`;
      }
    } catch (err) {
      setSubmitError('Error al conectar con el servidor.');
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
    <div className="w-full">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Participantes</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">{filtered.length} personas inscritas en el estudio</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] hover:text-white text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2"
        >
          <span className="text-base font-bold leading-none text-s">+</span>
          <span className="text-[12px]">Registrar participante</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Añadir participante</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateParticipant(); }} className="space-y-4" autoComplete="off">
              <input type="text" style={{ display: 'none' }} name="prevent_autofill" />
              <input type="password" style={{ display: 'none' }} name="prevent_autofill_password" />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Correo</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña</label>
                <input
                  type="password"
                  name="no_autofill_password_field"
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="···········"
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-emerald-600">{submitSuccess}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar participante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle del participante: modal con tokens completos y estado */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Detalle de participante</h2>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-slate-700">
              <div><strong>Código:</strong> {selectedParticipant.participant_code}</div>
              <div><strong>Correo:</strong> {selectedParticipant.email || '—'}</div>
              <div><strong>Estado:</strong> {selectedParticipant.authentication_status || 'PENDING'}</div>
              <div><strong>Token de acceso:</strong>
                <pre className="mt-1 whitespace-normal break-all rounded p-2 bg-slate-50 border border-slate-100 font-mono text-xs">{selectedParticipant.access_token || 'No disponible'}</pre>
              </div>
              <div><strong>Refresh token:</strong>
                <pre className="mt-1 whitespace-normal break-all rounded p-2 bg-slate-50 border border-slate-100 font-mono text-xs">{selectedParticipant.refresh_token || 'No disponible'}</pre>
              </div>
              <div><strong>Caducidad token acceso:</strong> {selectedParticipant.access_token_expiration ? new Date(selectedParticipant.access_token_expiration).toLocaleString('es-ES') : 'No disponible'}</div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedParticipant(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (!selectedParticipant) return;
                  if (!confirm(`¿Eliminar participante ${selectedParticipant.participant_code}? Esta acción es irreversible.`)) return;
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
                      alert(j.error || 'No se pudo eliminar el participante');
                    }
                  } catch (e) {
                    alert('Error al conectar con el servidor');
                  }
                }}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition mr-3"
              >
                Eliminar participante
              </button>
            </div>
          </div>
        </div>
      )}

      {oauthModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Autorización completada</h2>
              <button
                onClick={() => setOauthModalVisible(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-700">{oauthModalMessage}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOauthModalVisible(false)}
                className="rounded-2xl bg-[#3A8FC2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27648A]"
              >
                Cerrar
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
            placeholder="Buscar por código o correo..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-3.5 font-bold rounded-l-2xl">CÓDIGO</th>
                  <th className="w-[25%] px-6 py-3.5 font-bold">CORREO</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">TOKEN ACCESO</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">TOKEN ACTUALIZACIÓN</th>
                  <th className="w-[21%] px-6 py-3.5 font-bold rounded-r-2xl">CADUCIDAD TOKEN ACCESO</th>
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
                            Sin token
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
                            Sin token
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
                            Sin información de token
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
          <p className="py-8 text-center text-xs text-slate-400">No se encontraron participantes</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Participants;