import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Modal from '../../../components/Modal.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconWallet, IconAlert, IconUsers, IconPlus, IconEye } from '../../../components/icons.jsx';
import { getCostoMensaje } from '../services/settings.service.js';
import { getUsageReport } from '../services/reports.service.js';
import { listSaldos, rechargeSaldo, getMovimientos } from '../services/wallet.service.js';

const roleLabels = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  NORMAL: 'Tutor',
};

const UMBRAL_MENSAJES = 5;

function formatLempiras(valor) {
  return `L. ${Number(valor || 0).toFixed(2)}`;
}

function formatFecha(valor) {
  if (!valor) return '-';
  return new Date(valor.replace(' ', 'T')).toLocaleString('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BalancesPage() {
  const toast = useToast();
  const [saldos, setSaldos] = useState([]);
  const [reporte, setReporte] = useState([]);
  const [costoMensaje, setCostoMensaje] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [rechargeUser, setRechargeUser] = useState(null);
  const [rechargeForm, setRechargeForm] = useState({ monto: '', referencia: '' });
  const [rechargeSaving, setRechargeSaving] = useState(false);
  const [rechargeError, setRechargeError] = useState('');

  const [movimientosUser, setMovimientosUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  async function load() {
    const [saldosData, reporteData, costo] = await Promise.all([
      listSaldos(),
      getUsageReport(),
      getCostoMensaje(),
    ]);
    setSaldos(saldosData);
    setReporte(reporteData);
    setCostoMensaje(costo);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function openRecharge(user) {
    setRechargeError('');
    setRechargeForm({ monto: '', referencia: '' });
    setRechargeUser(user);
  }

  async function submitRecharge(e) {
    e.preventDefault();
    setRechargeError('');
    setRechargeSaving(true);
    try {
      const montoRecargado = Number(rechargeForm.monto);
      await rechargeSaldo({
        usuarioId: rechargeUser.usuario_id,
        monto: montoRecargado,
        referencia: rechargeForm.referencia,
      });
      toast.success(`Se recargaron L. ${montoRecargado.toFixed(2)} a ${rechargeUser.nombre}.`);
      setRechargeUser(null);
      await load();
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo registrar la recarga';
      setRechargeError(message);
      toast.error(message);
    } finally {
      setRechargeSaving(false);
    }
  }

  async function openMovimientos(user) {
    setMovimientosUser(user);
    try {
      setMovimientos(await getMovimientos(user.usuario_id));
    } catch (err) {
      console.error(err);
      setMovimientos([]);
      toast.error('No se pudieron cargar los movimientos');
    }
  }

  const usuariosData = saldos.map((s) => {
    const rep = reporte.find((r) => r.usuario_id === s.usuario_id) || {};
    return {
      ...s,
      total_campanias: Number(rep.total_campanias || 0),
      total_enviados: Number(rep.total_enviados || 0),
      total_fallidos: Number(rep.total_fallidos || 0),
      costo_total: Number(rep.costo_total || 0),
    };
  });

  const filtered = usuariosData.filter((u) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return u.nombre?.toLowerCase().includes(term) || u.usuario?.toLowerCase().includes(term);
  });

  const saldoTotal = usuariosData.reduce((sum, u) => sum + Number(u.saldo_actual || 0), 0);
  const umbralSaldo = costoMensaje > 0 ? costoMensaje * UMBRAL_MENSAJES : 0;
  const usuariosSaldoBajo = usuariosData.filter((u) => Number(u.saldo_actual) < umbralSaldo).length;

  return (
    <>
      <PageHeader
        title="Saldos"
        description="Detalle del saldo prepago de cada usuario: recarga, consulta movimientos y controla su gasto."
      />

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card-grid">
        <div className="stat-card green">
          <div className="stat-card-icon green"><IconWallet /></div>
          <span>Saldo total en el sistema</span>
          <strong>{formatLempiras(saldoTotal)}</strong>
        </div>
        <div className="stat-card red">
          <div className="stat-card-icon red"><IconAlert /></div>
          <span>Usuarios con saldo bajo</span>
          <strong>{usuariosSaldoBajo}</strong>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon purple"><IconUsers /></div>
          <span>Usuarios activos</span>
          <strong>{usuariosData.length}</strong>
        </div>
      </div>

      <div className="panel table-wrap">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <h3 className="panel-title" style={{ margin: 0 }}>Detalle por usuario</h3>
            <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 13 }}>
              Recarga el saldo cuando un usuario te pague — el sistema lo descuenta automáticamente al enviar campañas.
            </p>
          </div>
          <input
            style={{ maxWidth: 240 }}
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Saldo</th>
              <th>Campañas</th>
              <th>Enviados / Fallidos</th>
              <th>Gastado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const saldoBajo = umbralSaldo > 0 && Number(u.saldo_actual) < umbralSaldo;
              return (
                <tr key={u.usuario_id}>
                  <td>{u.nombre} <span style={{ color: '#667085' }}>({u.usuario})</span></td>
                  <td>{u.rol && <span className={`role-badge ${u.rol}`}>{roleLabels[u.rol] || u.rol}</span>}</td>
                  <td>
                    <strong className={Number(u.saldo_actual) <= 0 ? 'texto-negativo' : ''}>
                      {formatLempiras(u.saldo_actual)}
                    </strong>
                    {saldoBajo && Number(u.saldo_actual) > 0 && (
                      <span className="badge-muted" style={{ marginLeft: 8 }}>Bajo</span>
                    )}
                  </td>
                  <td>{u.total_campanias}</td>
                  <td>{u.total_enviados} / {u.total_fallidos}</td>
                  <td>{formatLempiras(u.costo_total)}</td>
                  <td className="actions-cell">
                    <div className="actions-row">
                      <button className="btn-link" onClick={() => openRecharge(u)}>
                        <IconPlus /> Recargar
                      </button>
                      <button className="btn-link" onClick={() => openMovimientos(u)}>
                        <IconEye /> Movimientos
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <span className="empty-state-icon">👥</span>
                    <div className="empty-state-title">No hay usuarios que coincidan</div>
                    Crea usuarios desde el módulo de Usuarios para poder asignarles saldo.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rechargeUser && (
        <Modal
          title={`Recargar saldo · ${rechargeUser.nombre}`}
          onClose={() => setRechargeUser(null)}
          width={420}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setRechargeUser(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-recargar-saldo" className="btn-primary" disabled={rechargeSaving}>
                {rechargeSaving ? 'Guardando...' : 'Registrar recarga'}
              </button>
            </>
          }
        >
          <form id="form-recargar-saldo" className="form-stack" onSubmit={submitRecharge}>
            {rechargeError && <div className="alert error">{rechargeError}</div>}

            <p style={{ margin: 0, color: '#667085' }}>
              Saldo actual: <strong>{formatLempiras(rechargeUser.saldo_actual)}</strong>
            </p>

            <label>Monto a recargar (Lempiras)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={rechargeForm.monto}
              onChange={(e) => setRechargeForm({ ...rechargeForm, monto: e.target.value })}
              required
              autoFocus
            />

            <label>Referencia (opcional)</label>
            <input
              placeholder="Ej. Depósito BAC #12345, efectivo 13/09"
              value={rechargeForm.referencia}
              onChange={(e) => setRechargeForm({ ...rechargeForm, referencia: e.target.value })}
            />
          </form>
        </Modal>
      )}

      {movimientosUser && (
        <Modal
          title={`Movimientos · ${movimientosUser.nombre}`}
          onClose={() => setMovimientosUser(null)}
          width={560}
          footer={<button className="btn-outline" onClick={() => setMovimientosUser(null)}>Cerrar</button>}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Saldo resultante</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{formatFecha(m.created_at)}</td>
                    <td>
                      <span className={`status ${m.tipo === 'RECARGA' ? 'sent' : 'failed'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td>{formatLempiras(m.monto)}</td>
                    <td>{formatLempiras(m.saldo_resultante)}</td>
                    <td>{m.referencia || m.campania_nombre || m.creado_por_nombre || '-'}</td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: '#667085' }}>Sin movimientos todavía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}
