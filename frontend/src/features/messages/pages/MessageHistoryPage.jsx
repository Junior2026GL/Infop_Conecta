import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import { IconSearch, IconSend, IconCheck, IconEye, IconAlert } from '../../../components/icons.jsx';
import { SHOW_DELIVERY_STATS } from '../../../config/env.js';
import { listMessages } from '../services/messages.service.js';
import { listCampaigns } from '../../campaigns/services/campaigns.service.js';

const PAGE_SIZE = 20;

const estadoLabels = {
  PENDIENTE: 'Pendiente',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  READ: 'Leído',
  FAILED: 'Fallido',
};

// Sin webhooks de Meta solo se conocen estos dos estados.
const estadosFiltro = SHOW_DELIVERY_STATS
  ? ['SENT', 'DELIVERED', 'READ', 'FAILED']
  : ['SENT', 'FAILED'];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function formatFecha(valor) {
  if (!valor) return '-';
  return new Date(String(valor).replace(' ', 'T')).toLocaleString('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function csvCell(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

// CSV con BOM y separador explícito (;) para que Excel lo abra en columnas y con tildes.
function exportarCsv(rows) {
  const encabezado = ['Fecha', 'Destinatario', 'Teléfono', 'Campaña', 'Plantilla', 'Estado', 'Detalle del error'];
  const lineas = rows.map((item) => [
    formatFecha(item.created_at),
    item.nombre_completo,
    item.telefono,
    item.campania_nombre,
    item.template_name,
    estadoLabels[item.estado] || item.estado,
    item.error_mensaje,
  ].map(csvCell).join(';'));

  const contenido = `﻿sep=;\r\n${[encabezado.map(csvCell).join(';'), ...lineas].join('\r\n')}`;
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `historial-mensajes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export default function MessageHistoryPage() {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [campaniaId, setCampaniaId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    listCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    listMessages({
      estado: estado || undefined,
      campaniaId: campaniaId || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [estado, campaniaId, desde, hasta]);

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
  }, [search, estado, campaniaId, desde, hasta]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const hayFiltros = Boolean(search || estado || campaniaId || desde || hasta);

  function limpiarFiltros() {
    setSearch('');
    setEstado('');
    setCampaniaId('');
    setDesde('');
    setHasta('');
  }

  const total = filtered.length;
  const fallidos = filtered.filter((i) => i.estado === 'FAILED').length;

  const cards = SHOW_DELIVERY_STATS
    ? [
        { label: 'Total', value: total, Icon: IconSend, tone: 'blue', isTotal: true },
        { label: 'Enviados', value: filtered.filter((i) => i.estado === 'SENT').length, Icon: IconCheck, tone: 'green' },
        { label: 'Leídos', value: filtered.filter((i) => i.estado === 'READ').length, Icon: IconEye, tone: 'purple' },
        { label: 'Fallidos', value: fallidos, Icon: IconAlert, tone: 'red' },
      ]
    : [
        { label: 'Total', value: total, Icon: IconSend, tone: 'blue', isTotal: true },
        { label: 'Enviados a WhatsApp', value: total - fallidos, Icon: IconCheck, tone: 'green' },
        { label: 'Fallidos', value: fallidos, Icon: IconAlert, tone: 'red' },
      ];

  return (
    <>
      <PageHeader
        title="Historial"
        description={
          SHOW_DELIVERY_STATS
            ? 'Seguimiento de mensajes enviados, entregados, leídos o fallidos.'
            : 'Seguimiento de los mensajes enviados y fallidos.'
        }
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="input-icon" style={{ minWidth: 260 }}>
              <IconSearch />
              <input
                placeholder="Buscar por nombre, teléfono o plantilla..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-outline"
              onClick={() => exportarCsv(filtered)}
              disabled={filtered.length === 0}
              title="Descargar los mensajes filtrados en un archivo que abre Excel"
            >
              Exportar a Excel
            </button>
          </div>
        }
      />

      <div className="history-content">
        <div className="history-filters">
          <label>
            <span>Campaña</span>
            <select value={campaniaId} onChange={(e) => setCampaniaId(e.target.value)}>
              <option value="">Todas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {estadosFiltro.map((value) => (
                <option key={value} value={value}>{estadoLabels[value]}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Desde</span>
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </label>

          <label>
            <span>Hasta</span>
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
          </label>

          {hayFiltros && (
            <button type="button" className="btn-link" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>

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
                    <span
                      className={`status ${String(item.estado).toLowerCase()}`}
                      title={item.error_mensaje || undefined}
                    >
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
                      <div className="empty-state-title">
                        {loading ? 'Cargando mensajes…' : hayFiltros ? 'Sin resultados' : 'Sin mensajes todavía'}
                      </div>
                      {!loading && (hayFiltros
                        ? 'Prueba con otros filtros o limpia los filtros actuales.'
                        : 'Los mensajes enviados desde Campañas aparecerán aquí.')}
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
