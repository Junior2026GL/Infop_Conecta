import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import { IconSearch, IconHistory } from '../../../components/icons.jsx';
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

export default function AuditPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [search, modulo, accion, desde, hasta, page]);

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

  return (
    <>
      <PageHeader
        title="Bitácora"
        description="Registro de auditoría de acciones sensibles del sistema."
      />

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="audit-content">
        <div className="panel table-wrap">
          <div className="users-toolbar">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>Eventos registrados</h3>
              <span className="badge-muted" style={{ marginTop: 8 }}>
                <IconHistory /> {total} evento{total === 1 ? '' : 's'}
              </span>
            </div>

            <div className="users-filters">
              <div className="input-icon users-search">
                <IconSearch />
                <input
                  placeholder="Buscar por usuario, descripción o IP…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={modulo} onChange={(e) => setModulo(e.target.value)} className="users-role-filter">
                <option value="TODOS">Todos los módulos</option>
                {Object.entries(moduloLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select value={accion} onChange={(e) => setAccion(e.target.value)} className="users-role-filter">
                <option value="TODOS">Todas las acciones</option>
                {Object.entries(accionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 150 }} />
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 150 }} />
              {hayFiltros && (
                <button type="button" className="btn-link" onClick={limpiarFiltros}>Limpiar</button>
              )}
            </div>
          </div>

          {loading ? (
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
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Descripción</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--color-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatFecha(item.created_at)}
                    </td>
                    <td>
                      {item.usuario_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="avatar sm">{initials(item.usuario_nombre)}</span>
                          {item.usuario_nombre || '-'}
                        </div>
                      ) : (
                        <span className="texto-muted-soft">Sistema</span>
                      )}
                    </td>
                    <td>
                      <span className={`audit-tag ${accionTones[item.accion] || 'gray'}`}>
                        {accionLabels[item.accion] || item.accion}
                      </span>
                    </td>
                    <td>
                      <span className={`audit-tag ${moduloTones[item.modulo] || 'gray'}`}>
                        {moduloLabels[item.modulo] || item.modulo}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-muted)' }}>{item.descripcion || '-'}</td>
                    <td style={{ color: 'var(--color-muted)', fontSize: 13 }}>{item.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </>
  );
}
