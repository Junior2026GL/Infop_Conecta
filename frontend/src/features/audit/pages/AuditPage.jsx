import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import {
  IconSearch,
  IconHistory,
  IconUser,
  IconUsers,
  IconAlert,
  IconKey,
  IconLock,
  IconPlus,
  IconEdit,
  IconPower,
  IconSend,
  IconWallet,
  IconShield,
  IconTemplate,
  IconCost,
  IconCalendar,
  IconClock,
} from '../../../components/icons.jsx';
import { listAudit } from '../services/audit.service.js';

const PAGE_SIZE = 20;

const moduloLabels = {
  AUTENTICACION: 'Autenticación',
  USUARIOS: 'Usuarios',
  PLANTILLAS: 'Plantillas',
  CAMPANAS: 'Campañas',
  SALDOS: 'Saldos',
  CONFIGURACION: 'Configuración',
};

const moduloTones = {
  AUTENTICACION: 'gray',
  USUARIOS: 'blue',
  PLANTILLAS: 'purple',
  CAMPANAS: 'green',
  SALDOS: 'amber',
  CONFIGURACION: 'gray',
};

const accionLabels = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Inicio fallido',
  CAMBIO_PASSWORD: 'Cambio de contraseña',
  CREAR: 'Creación',
  ACTUALIZAR: 'Actualización',
  ACTIVAR: 'Activación',
  DESACTIVAR: 'Desactivación',
  RESET_PASSWORD: 'Restablecer contraseña',
  ENVIO: 'Envío',
  RECARGA: 'Recarga',
};

const accionTones = {
  LOGIN: 'green',
  LOGIN_FALLIDO: 'red',
  CAMBIO_PASSWORD: 'purple',
  CREAR: 'blue',
  ACTUALIZAR: 'amber',
  ACTIVAR: 'green',
  DESACTIVAR: 'red',
  RESET_PASSWORD: 'purple',
  ENVIO: 'blue',
  RECARGA: 'green',
};

const moduloIcons = {
  AUTENTICACION: IconShield,
  USUARIOS: IconUsers,
  PLANTILLAS: IconTemplate,
  CAMPANAS: IconSend,
  SALDOS: IconWallet,
  CONFIGURACION: IconCost,
};

const accionIcons = {
  LOGIN: IconUser,
  LOGIN_FALLIDO: IconAlert,
  CAMBIO_PASSWORD: IconKey,
  CREAR: IconPlus,
  ACTUALIZAR: IconEdit,
  ACTIVAR: IconPower,
  DESACTIVAR: IconPower,
  RESET_PASSWORD: IconLock,
  ENVIO: IconSend,
  RECARGA: IconWallet,
};

// Acciones que merecen atención: se resaltan en la lista.
const ACCIONES_ALERTA = new Set(['LOGIN_FALLIDO', 'DESACTIVAR']);

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function parseFecha(valor) {
  return new Date(String(valor).replace(' ', 'T'));
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHora(valor) {
  if (!valor) return '-';
  return parseFecha(valor).toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit' });
}

function diaClave(valor) {
  return valor ? toDateInput(parseFecha(valor)) : 'sin-fecha';
}

function diaEtiqueta(clave) {
  if (clave === 'sin-fecha') return 'Sin fecha';

  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (clave === toDateInput(hoy)) return 'Hoy';
  if (clave === toDateInput(ayer)) return 'Ayer';

  const [y, m, d] = clave.split('-').map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString('es-HN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function rangoRapido(dias) {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(hasta.getDate() - (dias - 1));
  return { desde: toDateInput(desde), hasta: toDateInput(hasta) };
}

const RANGOS = [
  { label: 'Hoy', dias: 1 },
  { label: '7 días', dias: 7 },
  { label: '30 días', dias: 30 },
];

export default function AuditPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [search, setSearch] = useState('');
  const [modulo, setModulo] = useState('TODOS');
  const [accion, setAccion] = useState('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);

  const hayFiltros = search || modulo !== 'TODOS' || accion !== 'TODOS' || desde || hasta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      listAudit({
        q: search || undefined,
        modulo: modulo !== 'TODOS' ? modulo : undefined,
        accion: accion !== 'TODOS' ? accion : undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((data) => {
          setItems(data.items);
          setTotal(data.total);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'No se pudo cargar la bitácora');
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, modulo, accion, desde, hasta, page, recarga]);

  useEffect(() => {
    setPage(1);
  }, [search, modulo, accion, desde, hasta]);

  function limpiarFiltros() {
    setSearch('');
    setModulo('TODOS');
    setAccion('TODOS');
    setDesde('');
    setHasta('');
  }

  function aplicarRango(dias) {
    const rango = rangoRapido(dias);
    // Pulsar el rango activo lo quita.
    if (desde === rango.desde && hasta === rango.hasta) {
      setDesde('');
      setHasta('');
      return;
    }
    setDesde(rango.desde);
    setHasta(rango.hasta);
  }

  const grupos = useMemo(() => {
    const porDia = new Map();
    for (const item of items) {
      const clave = diaClave(item.created_at);
      if (!porDia.has(clave)) porDia.set(clave, []);
      porDia.get(clave).push(item);
    }
    return [...porDia.entries()].map(([clave, eventos]) => ({
      clave,
      etiqueta: diaEtiqueta(clave),
      eventos,
    }));
  }, [items]);

  return (
    <>
      <PageHeader
        title="Bitácora"
        description="Registro de auditoría de acciones sensibles del sistema."
      />

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="audit-content">
        <div className="panel audit-panel">
          <div className="audit-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>Eventos registrados</h3>
              <span className="badge-muted" style={{ marginTop: 8 }}>
                <IconHistory /> {total.toLocaleString('es-HN')} evento{total === 1 ? '' : 's'}
                {hayFiltros && ' con los filtros actuales'}
              </span>
            </div>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setRecarga((n) => n + 1)}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          <div className="audit-filters">
            <div className="input-icon audit-filter-search">
              <IconSearch />
              <input
                placeholder="Buscar por usuario, descripción o IP…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label className="audit-filter">
              <span>Módulo</span>
              <select value={modulo} onChange={(e) => setModulo(e.target.value)}>
                <option value="TODOS">Todos</option>
                {Object.entries(moduloLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="audit-filter">
              <span>Acción</span>
              <select value={accion} onChange={(e) => setAccion(e.target.value)}>
                <option value="TODOS">Todas</option>
                {Object.entries(accionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="audit-filter">
              <span>Desde</span>
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
            </label>

            <label className="audit-filter">
              <span>Hasta</span>
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
            </label>
          </div>

          <div className="audit-quick">
            <span>Atajos:</span>
            {RANGOS.map(({ label, dias }) => {
              const rango = rangoRapido(dias);
              const activo = desde === rango.desde && hasta === rango.hasta;
              return (
                <button
                  type="button"
                  key={label}
                  className={`audit-chip ${activo ? 'active' : ''}`}
                  onClick={() => aplicarRango(dias)}
                >
                  {label}
                </button>
              );
            })}
            {hayFiltros && (
              <button type="button" className="btn-link" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="table-loading">
              {[0, 1, 2, 3].map((i) => <div className="table-loading-row" key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🗒️</span>
              <div className="empty-state-title">
                {hayFiltros ? 'Sin resultados para tu búsqueda' : 'Sin eventos registrados todavía'}
              </div>
              <p>
                {hayFiltros
                  ? 'Intenta con otro usuario, módulo, acción o rango de fechas.'
                  : 'Las acciones sensibles del sistema aparecerán aquí a medida que ocurran.'}
              </p>
            </div>
          ) : (
            <div className={`table-wrap audit-table-wrap ${loading ? 'is-refreshing' : ''}`}>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Módulo</th>
                    <th>Descripción</th>
                    <th>IP</th>
                  </tr>
                </thead>
                {grupos.map((grupo) => (
                  <tbody key={grupo.clave}>
                    <tr className="audit-day">
                      <td colSpan={6}>
                        <IconCalendar width={14} height={14} className="audit-day-icon" />
                        <span className="audit-day-label">{grupo.etiqueta}</span>
                        <span className="audit-day-count">
                          {grupo.eventos.length} evento{grupo.eventos.length === 1 ? '' : 's'} en esta página
                        </span>
                      </td>
                    </tr>

                    {grupo.eventos.map((item) => {
                      const AccionIcon = accionIcons[item.accion];
                      const ModuloIcon = moduloIcons[item.modulo];

                      return (
                      <tr key={item.id} className={ACCIONES_ALERTA.has(item.accion) ? 'audit-row-alert' : ''}>
                        <td className="audit-time">
                          <IconClock width={13} height={13} /> {formatHora(item.created_at)}
                        </td>
                        <td>
                          {item.usuario_id ? (
                            <div className="audit-user">
                              <span className="avatar sm">{initials(item.usuario_nombre)}</span>
                              <span>{item.usuario_nombre || '-'}</span>
                            </div>
                          ) : (
                            <span className="texto-muted-soft">Sistema</span>
                          )}
                        </td>
                        <td>
                          <span className={`audit-tag ${accionTones[item.accion] || 'gray'}`}>
                            {AccionIcon && <AccionIcon width={13} height={13} />}
                            {accionLabels[item.accion] || item.accion}
                          </span>
                        </td>
                        <td>
                          <span className={`audit-tag ${moduloTones[item.modulo] || 'gray'}`}>
                            {ModuloIcon && <ModuloIcon width={13} height={13} />}
                            {moduloLabels[item.modulo] || item.modulo}
                          </span>
                        </td>
                        <td className="audit-desc">{item.descripcion || '-'}</td>
                        <td className="audit-ip">{item.ip || '-'}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </>
  );
}
