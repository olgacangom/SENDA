import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type Participant = {
  participant_code: string;
  googleaccount?: {
    email: string;
    authentication_status: string;
    access_token_expiration: string | null;
  } | null;
  email?: string | null; 
};

const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/participants/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.results || [];
        setParticipants(list);
      })
      .catch(() => setError('No se pudieron cargar los participantes'));
  }, []);

  const getEmail = (p: Participant): string => {
    if (p.email) return p.email;
    if (p.googleaccount && p.googleaccount.email) return p.googleaccount.email;
    return 'Sin correo';
  };

  const getExpiration = (p: Participant): string | null => {
    if (p.googleaccount && p.googleaccount.access_token_expiration) {
      return p.googleaccount.access_token_expiration;
    }
    return null;
  };

  const filtered = participants.filter((person) => {
    const emailStr = getEmail(person);
    return (
      person.participant_code.toLowerCase().includes(query.toLowerCase()) ||
      emailStr.toLowerCase().includes(query.toLowerCase())
    );
  });

  // Colores dinámicos y amigables para los iconos de los avatares de la tabla
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
        <button className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2">
          <span>+ Añadir participante</span>
        </button>
      </div>

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        
        {/* Barra de búsqueda interna con icono de lupa */}
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
                  <th className="w-[30%] px-6 py-3.5 font-bold rounded-l-2xl">CÓDIGO</th>
                  <th className="w-[40%] px-6 py-3.5 font-bold">CORREO</th>
                  <th className="w-[30%] px-6 py-3.5 font-bold rounded-r-2xl">CADUCIDAD TOKEN ACCESO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant, idx) => {
                  const emailVal = getEmail(participant);
                  const expirationVal = getExpiration(participant);
                  const colorStyle = avatarColors[idx % avatarColors.length];

                  return (
                    <tr 
                      key={participant.participant_code} 
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
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