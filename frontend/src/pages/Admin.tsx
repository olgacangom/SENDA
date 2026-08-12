import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type Researcher = {
  email: string;
  created_at: string;
  is_active: boolean;
};

const Admin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/researchers/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setResearchers(data.items || []))
      .catch(() => setError('No se pudieron cargar los investigadores'));
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
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo crear el investigador');
        return;
      }
      setMessage(`Investigador creado con éxito: ${data.email}`);
      setResearchers((prev) => [{ email: data.email, created_at: new Date().toISOString(), is_active: true }, ...prev]);
      setEmail('');
      setPassword('');
    } catch {
      setError('Error de red al intentar crear el investigador');
    }
  };

  const deleteResearcher = async (researcherEmail: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al investigador ${researcherEmail}?`)) {
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
        setError(data.error || 'No se pudo eliminar el investigador');
        return;
      }
      setMessage(`Investigador eliminado con éxito: ${researcherEmail}`);
      setResearchers((prev) => prev.filter((r) => r.email !== researcherEmail));
    } catch {
      setError('Error de red al intentar eliminar el investigador');
    }
  };

  return (
    <div className="w-full text-slate-900 space-y-8">

      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Gestionar investigadores</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Panel exclusivo para administradores: da de alta y administra cuentas de investigador.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40">
        <form onSubmit={submit} autoComplete="off" className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investigador@senda.es"
              required
              autoComplete="off"
              name="random_email_field_to_prevent_autocomplete"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contraseña de acceso</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                name="random_password_field_to_prevent_autocomplete"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 pr-10 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  // Icono Ojo Cerrado
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  // Icono Ojo Abierto
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] hover:text-white text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer">
              <span className="text-base font-bold leading-none">+</span>
              <span className="text-[12px]">Añadir investigador</span>
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm">{message}</p>}
        {error && <p className="mt-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm">{error}</p>}
      </div>

      {/* Tarjeta contenedora de la tabla de investigadores activos */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">

        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Investigadores activos</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {researchers.length} cuentas registradas
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[40%] px-6 py-3.5 font-bold rounded-l-2xl">CORREO</th>
                  <th className="w-[30%] px-6 py-3.5 font-bold">CREADO</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold">ESTADO</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold rounded-r-2xl text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {researchers.map((r) => (
                  <tr key={r.email} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{r.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border ${r.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-right">
                      <button
                        type="button"
                        onClick={() => deleteResearcher(r.email)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition shadow-sm cursor-pointer"
                        title="Eliminar investigador"
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
          <p className="py-12 text-center text-xs text-slate-400">No hay investigadores registrados.</p>
        )}
      </div>
    </div>
  );
};

export default Admin;