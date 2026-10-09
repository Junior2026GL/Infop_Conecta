import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import TemplatesPage from '../features/templates/pages/TemplatesPage.jsx';
import MessageHistoryPage from '../features/messages/pages/MessageHistoryPage.jsx';
import CampaignsPage from '../features/campaigns/pages/CampaignsPage.jsx';
import UsersPage from '../features/users/pages/UsersPage.jsx';
import CostsPage from '../features/settings/pages/CostsPage.jsx';
import BalancesPage from '../features/settings/pages/BalancesPage.jsx';
import SupportPage from '../features/settings/pages/SupportPage.jsx';
import AuditPage from '../features/audit/pages/AuditPage.jsx';
import MainLayout from '../layouts/MainLayout.jsx';

function SupportRoute() {
  const user = JSON.parse(localStorage.getItem('infop_conecta_user') || 'null');
  return <SupportPage isSuperAdmin={user?.rol === 'SUPER_ADMIN'} />;
}

function Protected({ children, roles }) {
  const token = localStorage.getItem('infop_conecta_token');
  if (!token) return <Navigate to="/login" replace />;

  if (roles) {
    const user = JSON.parse(localStorage.getItem('infop_conecta_user') || 'null');
    if (!user || !roles.includes(user.rol)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/',
    element: (
      <Protected>
        <MainLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'plantillas', element: <TemplatesPage /> },
      { path: 'campanas', element: <CampaignsPage /> },
      { path: 'historial', element: <MessageHistoryPage /> },
      { path: 'soporte', element: <SupportRoute /> },
      {
        path: 'usuarios',
        element: (
          <Protected roles={['SUPER_ADMIN']}>
            <UsersPage />
          </Protected>
        ),
      },
      {
        path: 'costos',
        element: (
          <Protected roles={['SUPER_ADMIN']}>
            <CostsPage />
          </Protected>
        ),
      },
      {
        path: 'saldos',
        element: (
          <Protected roles={['SUPER_ADMIN']}>
            <BalancesPage />
          </Protected>
        ),
      },
      {
        path: 'auditoria',
        element: (
          <Protected roles={['SUPER_ADMIN']}>
            <AuditPage />
          </Protected>
        ),
      },
    ],
  },
]);

