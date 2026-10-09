import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import { IconSearch, IconSend, IconCheck, IconEye, IconAlert } from '../../../components/icons.jsx';
import { listMessages } from '../services/messages.service.js';

const PAGE_SIZE = 20;

const estadoLabels = {
  PENDIENTE: 'Pendiente',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  READ: 'Leído',
  FAILED: 'Fallido',
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function formatFecha(valor) {
  if (!valor) return '-';
  return new Date(valor.replace(' ', 'T')).toLocaleString('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MessageHistoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    listMessages().then(setItems).catch(console.error);
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      item.nombre_completo?.toLowerCase().includes(term) ||
      item.telefono?.toLowerCase().includes(term) ||
      item.template_name?.toLowerCase().includes(term) ||
      item.campania_nombre?.toLowerCase().includes(term)
    );
  }), [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const total = items.length;

  const cards = [
    { label: 'Total', value: total, Icon: IconSend, tone: 'blue', isTotal: true },
    { label: 'Enviados', value: items.filter((i) => i.estado === 'SENT').length, Icon: IconCheck, tone: 'green' },
    { label: 'Leídos', value: items.filter((i) => i.estado === 'READ').length, Icon: IconEye, tone: 'purple' },
    { label: 'Fallidos', value: items.filter((i) => i.estado === 'FAILED').length, Icon: IconAlert, tone: 'red' },
  ];

  return (
    <>
      <PageHeader
        title="Historial"
        description="Seguimiento de mensajes enviados, entregados, leídos o fallidos."
        actions={
          <div className="input-icon" style={{ minWidth: 260 }}>
            <IconSearch />
            <input
              placeholder="Buscar por nombre, teléfono o plantilla..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="history-content">
        <div className="dash-kpi-grid">
          {cards.map(({ label, value, Icon, tone, isTotal }) => (
            <div className={`dash-kpi ${tone}`} key={label}>
              <div className="dash-kpi-top">
                <span className={`dash-kpi-icon ${tone}`}><Icon /></span>
                {!isTotal && total > 0 && (
                  <span className={`dash-chip ${tone}`}>{Math.round((value / total) * 100)}%</span>
                )}
              </div>
              <span className="dash-kpi-label">{label}</span>
              <strong className="dash-kpi-value">{value.toLocaleString('es-HN')}</strong>
            </div>
          ))}
        </div>

        <div className="panel table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Destinatario</th>
                <th>Campaña</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(item => (
                <tr key={item.id}>
                  <td>{formatFecha(item.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar sm">{initials(item.nombre_completo)}</span>
                      {item.nombre_completo || '-'}
                    </div>
                  </td>
                  <td>{item.campania_nombre || '-'}</td>
                  <td>
                    <span className={`status ${String(item.estado).toLowerCase()}`}>
                      {estadoLabels[item.estado] || item.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <span className="empty-state-icon">📭</span>
                      <div className="empty-state-title">Sin mensajes todavía</div>
                      Los mensajes enviados desde Campañas aparecerán aquí.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </div>
    </>
  );
}
