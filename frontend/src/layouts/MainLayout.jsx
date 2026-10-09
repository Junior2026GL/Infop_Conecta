import { NavLink, Outlet } from 'react-router-dom';
import {
  IconDashboard,
  IconTemplate,
  IconSend,
  IconHistory,
  IconUsers,
  IconCost,
  IconWallet,
  IconLogbook,
  IconMessageCircle,
} from '../components/icons.jsx';
import UserMenu from './UserMenu.jsx';

const baseMenu = [
  ['/', 'Dashboard', IconDashboard],
  ['/plantillas', 'Plantillas', IconTemplate],
  ['/campanas', 'Campañas', IconSend],
  ['/historial', 'Historial', IconHistory],
  ['/soporte', 'Soporte', IconMessageCircle],
];

export default function MainLayout() {
  const user = JSON.parse(localStorage.getItem('infop_conecta_user') || 'null');

  const menu = user?.rol === 'SUPER_ADMIN'
    ? [
        ...baseMenu,
        ['/usuarios', 'Usuarios', IconUsers],
        ['/saldos', 'Saldos', IconWallet],
        ['/costos', 'Costos', IconCost],
        ['/auditoria', 'Bitácora', IconLogbook],
      ]
    : baseMenu;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">INFOP <span>Conecta</span></div>
          <div className="brand-subtitle">Mensajes de WhatsApp</div>
        </div>

        <nav>
          {menu.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <UserMenu user={user} />
        </header>

        <main className="content">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="app-footer-brand">
            <span className="app-footer-mark">IC</span>
            INFOP <span>Conecta</span>
          </div>
          <div className="app-footer-meta">
            <span>© {new Date().getFullYear()} · Mensajería Virtual</span>
            <span className="app-footer-version">v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

