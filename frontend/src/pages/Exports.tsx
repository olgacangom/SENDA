import React, { useState } from 'react';

type ExportLog = {
  id: string;
  label: string;
  format: string;
  timestamp: string;
};

const API_BASE = 'http://localhost:1574';

const Exports: React.FC = () => {
  const [history, setHistory] = useState<ExportLog[]>([]);

  const download = (type: string, label: string, format: string = 'csv') => {
    window.open(`${API_BASE}/api/export/?type=${type}&format=${format}`, '_blank');

    const newLog: ExportLog = {
      id: Math.random().toString(36).substring(2, 9),
      label,
      format: format.toUpperCase(),
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setHistory((prev) => [newLog, ...prev.slice(0, 4)]); // Mantiene los últimos 5 registros
  };

  return (
    <div className="w-full text-slate-900 space-y-8">
      
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Exportaciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Descarga conjuntos de datos globales para análisis estadístico.</p>
        </div>
      </div>

      {/* Tarjeta informativa */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-bold text-blue-900">Nota sobre los datos fisiológicos</p>
          <p className="text-[11px] text-blue-700 mt-0.5">Si necesitas exportar rangos o participantes específicos, utiliza los filtros avanzados en la sección de <span className="font-bold underline cursor-pointer">Datos fisiológicos</span>.</p>
        </div>
      </div>

      {/* Cuadrícula de tarjetas de exportación */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { 
            label: 'Participantes', 
            type: 'participants', 
            description: 'Listado completo e información demográfica.' 
          },
          { 
            label: 'Fitbit registradas', 
            type: 'fitbits', 
            description: 'Estado y asignación de pulseras.' 
          },
          { 
            label: 'Sincronizaciones', 
            type: 'syncs', 
            description: 'Historial de descargas y errores.' 
          },
          { 
            label: 'Datos fisiológicos', 
            type: 'physiological', 
            description: 'Volcado masivo de métricas globales.' 
          },
        ].map((item) => (
          <div key={item.type} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-100/50 flex flex-col justify-between transition hover:border-slate-300">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 mb-3">
                {item.label}
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600">{item.description}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => download(item.type, item.label, 'csv')}
                className="w-full rounded-xl bg-[#3A8FC2] hover:bg-[#27648A] px-3 py-2 text-[11px] font-bold text-white transition text-center shadow-md shadow-blue-500/20"
              >
                Descargar CSV
              </button>
              <button
                type="button"
                onClick={() => download(item.type, item.label, 'xlsx')}
                className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700 transition text-center shadow-sm"
              >
                Descargar Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE REGISTRO */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Registro de actividad</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ficheros solicitados durante la sesión actual.</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
            {history.length} registros
          </span>
        </div>

        {history.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-4">
              {history.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-4">
                    {logIdx !== history.length - 1 ? (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true"></span>
                    ) : null}
                    <div className="relative flex space-x-3 items-center">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center ring-8 ring-white">
                          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 items-center">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{log.label}</p>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                            {log.format}
                          </span>
                        </div>
                        <div className="text-right text-[11px] font-medium text-slate-400 whitespace-nowrap">
                          <time dateTime={log.timestamp}>{log.timestamp}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-slate-400">No se ha realizado ninguna exportación en esta sesión todavía.</p>
        )}
      </div>

    </div>
  );
};

export default Exports;