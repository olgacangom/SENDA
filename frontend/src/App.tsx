import React, { useState } from 'react';
import FrontPage from './pages/FrontPage';
import Login from './pages/Login';
import Participants from './pages/Participants';
import Fitbits from './pages/Fitbits';
import Assignments from './pages/Assignments';
import Syncs from './pages/Syncs';
import PhysiologicalData from './pages/PhysiologicalData';
import Alerts from './pages/Alerts';
import Exports from './pages/Exports';
import Admin from './pages/Admin';

const App: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('senda_logged_in') === 'true';
  }); 
  const [role, setRole] = useState<'researcher' | 'admin' | null>(() => {
    return (localStorage.getItem('senda_role') as 'researcher' | 'admin') || null;
  });
  
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('senda_user_email') || '';
  });

  const [page, setPage] = useState<string>(() => {
    const savedPage = localStorage.getItem('senda_current_page');
    if (savedPage) return savedPage;
    return 'front';
  });

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleSetPage = (newPage: string) => {
    setPage(newPage);
    localStorage.setItem('senda_current_page', newPage);
  };

  const handleLogin = (nextPage: string, userRole: 'researcher' | 'admin', email?: string) => {
    const userEmail = email && email.trim() !== '' 
      ? email 
      : (userRole === 'admin' ? 'admin@senda.es' : 'investigador@senda.es');
      
    const defaultPage = userRole === 'researcher' ? 'assignments' : 'participants';
    
    setRole(userRole);
    setPage(defaultPage);
    setLoggedIn(true);
    setCurrentUser(userEmail);

    localStorage.setItem('senda_logged_in', 'true');
    localStorage.setItem('senda_role', userRole);
    localStorage.setItem('senda_user_email', userEmail);
    localStorage.setItem('senda_current_page', defaultPage);
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setPage('front');
    setRole(null);
    setCurrentUser('');
    
    localStorage.removeItem('senda_logged_in');
    localStorage.removeItem('senda_role');
    localStorage.removeItem('senda_user_email');
    localStorage.setItem('senda_current_page', 'front');
  };

  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : 'SE';
  };

  const getMenuItems = (userRole: 'researcher' | 'admin' | null) => {
    const icons = {
      participants: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      fitbit: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      assignments: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      physiological: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      alerts: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      exports: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      syncs: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      admin: (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    };

    if (userRole === 'researcher') {
      return [
        { key: 'assignments', label: 'Asignaciones', icon: icons.assignments },
        { key: 'physiological', label: 'Datos fisiológicos', icon: icons.physiological },
        { key: 'alerts', label: 'Alertas', icon: icons.alerts },
        { key: 'exports', label: 'Exportaciones', icon: icons.exports },
      ];
    } else {
      return [
        { key: 'participants', label: 'Participantes', icon: icons.participants },
        { key: 'fitbits', label: 'Fitbit', icon: icons.fitbit },
        { key: 'assignments', label: 'Asignaciones', icon: icons.assignments },
        { key: 'physiological', label: 'Datos fisiológicos', icon: icons.physiological },
        { key: 'alerts', label: 'Alertas', icon: icons.alerts },
        { key: 'exports', label: 'Exportaciones', icon: icons.exports },
        { key: 'syncs', label: 'Sincronizaciones', icon: icons.syncs },
        { key: 'admin', label: 'Roles y Permisos', icon: icons.admin },
      ];
    }
  };

  const menuItems = getMenuItems(role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!loggedIn ? (
        page === 'login' ? (
          <Login 
            onLogin={handleLogin} 
            onBackToFront={() => {
              setPage('front');
              localStorage.setItem('senda_current_page', 'front');
            }} 
          />
        ) : (
          <FrontPage 
            onGoToLogin={() => {
              setPage('login');
              localStorage.setItem('senda_current_page', 'login');
            }} 
          />
        )
      ) : (
        <div className="flex min-h-screen w-full flex-col lg:flex-row">
          
          {/* BARRA LATERAL RETRÁCTIL POR HOVER */}
          <aside 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`shrink-0 border-b border-slate-200 bg-white py-8 lg:border-r lg:border-b-0 flex flex-col justify-between transition-all duration-300 ease-in-out z-20 shadow-lg lg:shadow-none ${
              isHovered ? 'lg:w-72 px-6' : 'lg:w-20 px-4'
            } w-full`}
          >
            <div>
              {/* Logotipo SENDA */}
              <div className="flex items-center gap-3 mb-8 overflow-hidden whitespace-nowrap">
                <img src="/images/senda.png" alt="SENDA Logo" className="h-[60px] w-[60px] shrink-0 object-contain" />
                <div className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:pointer-events-none'}`}>
                  <p className="text-[25px] font-bold text-green-900 tracking-wider">SENDA</p>
                  <p className="text-[9px] text-slate-400 tracking-tight uppercase">Salud · Neurociencia</p>
                </div>
              </div>

              <div className={`overflow-hidden transition-all duration-300 mb-4 ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:h-0'}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  {role === 'admin' ? 'ADMINISTRACIÓN' : 'INVESTIGACIÓN'}
                </p>
              </div>

              {/* Menú de navegación dinámico */}
              <nav className="space-y-1.5">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSetPage(item.key)}
                    title={!isHovered ? item.label : undefined}
                    className={`flex w-full items-center rounded-2xl py-3 text-left text-xs font-bold transition cursor-pointer ${
                      isHovered ? 'px-4 justify-between' : 'lg:px-3 lg:justify-center px-4 justify-between'
                    } ${
                      page === item.key 
                        ? 'bg-blue-50 text-blue-700 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${page === item.key ? 'text-blue-600' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <span className={`whitespace-nowrap transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                        {item.label}
                      </span>
                    </div>
                    {page === item.key && (
                      <span className={`h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0 ${isHovered ? 'block' : 'lg:hidden'}`}></span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className={`pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-400 flex items-center gap-2 overflow-hidden whitespace-nowrap ${isHovered ? 'opacity-100' : 'lg:opacity-0'}`}>
              <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'lg:opacity-0'}`}>SENDA · Entorno Seguro</span>
            </div>
          </aside>

          {/* CONTENEDOR DERECHO */}
          <div className="flex flex-1 flex-col min-w-0">
            
            {/* BARRA SUPERIOR */}
            <header className="h-[65px] border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
              <div className="w-96">
              </div>

              <div className="flex items-center gap-6">
                {/* FECHA */}
                <span className="text-xs text-slate-400 font-medium capitalize">{currentDate}</span>
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                  <div className="h-9 w-9 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {getInitials(currentUser)}
                  </div>
                  <div className="text-left">
                    {/* USUARIO LOGUEADO */}
                    <p className="text-xs font-bold text-slate-900">{currentUser}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      {role === 'admin' ? 'Administrador' : 'Investigador'}
                    </p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="ml-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </header>

            {/* ÁREA DE CONTENIDO */}
            <main className="flex-1 bg-slate-50 px-8 py-8 overflow-y-auto">
              {page === 'participants' && <Participants />}
              {page === 'fitbits' && <Fitbits />}
              {page === 'assignments' && <Assignments />}
              {page === 'syncs' && <Syncs />}
              {page === 'physiological' && <PhysiologicalData />}
              {page === 'alerts' && <Alerts />}
              {page === 'exports' && <Exports />}
              {page === 'admin' && <Admin />}
            </main>
          </div>

        </div>
      )}
    </div>
  );
};

export default App;