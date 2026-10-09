import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconSave, IconCost, IconUsers, IconSend, IconHistory } from '../../../components/icons.jsx';
import { getCostoMensajeInfo, updateCostoMensaje } from '../services/settings.service.js';
import { getUsageReport } from '../services/reports.service.js';

function formatLempiras(valor) {
  return `L. ${Number(valor || 0).toFixed(2)}`;
}

function formatFecha(valor) {
  if (!valor) return 'Sin registro';
  return new Date(valor.replace(' ', 'T')).toLocaleString('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function CostsPage() {
  const toast = useToast();
  const [costoMensaje, setCostoMensaje] = useState('');
  const [savedCosto, setSavedCosto] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [reporte, setReporte] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [info, reporteData] = await Promise.all([
      getCostoMensajeInfo(),
      getUsageReport(),
    ]);
    setCostoMensaje(String(info.costoMensaje));
    setSavedCosto(info.costoMensaje);
    setUpdatedAt(info.actualizadoEn);
    setReporte(reporteData);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function submitCosto(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const info = await updateCostoMensaje(Number(costoMensaje));
      setSavedCosto(info.costoMensaje);
      setUpdatedAt(info.actualizadoEn);
      toast.success('Costo por mensaje actualizado correctamente.');
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo actualizar el costo';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const totalGastado = reporte.reduce((sum, r) => sum + Number(r.costo_total || 0), 0);
  const totalEnviados = reporte.reduce((sum, r) => sum + Number(r.total_enviados || 0), 0);

  return (
    <>
      <PageHeader
        title="Costos"
        description="Configura el costo por mensaje enviado en el sistema."
      />

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card-grid">
        <div className="stat-card amber">
          <div className="stat-card-icon amber"><IconCost /></div>
          <span>Costo actual por mensaje</span>
          <strong>{formatLempiras(savedCosto)}</strong>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-icon blue"><IconSend /></div>
          <span>Total mensajes enviados</span>
          <strong>{totalEnviados}</strong>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon green"><IconCost /></div>
          <span>Gasto total acumulado</span>
          <strong>{formatLempiras(totalGastado)}</strong>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon purple"><IconUsers /></div>
          <span>Usuarios con campañas</span>
          <strong>{reporte.filter((r) => Number(r.total_campanias) > 0).length}</strong>
        </div>
      </div>

      <div className="panel cost-config-card">
        <div className="cost-config-header">
          <div>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <IconCost /> Actualizar costo por mensaje
            </h3>
            <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 13 }}>
              Se descuenta del saldo de cada usuario por cada mensaje que se envía con éxito.
            </p>
          </div>
          <span className="badge-muted">
            <IconHistory /> Actualizado: {formatFecha(updatedAt)}
          </span>
        </div>
        <form className="cost-config-form" onSubmit={submitCosto}>
          <div>
            <label>Costo en Lempiras</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoMensaje}
              onChange={(e) => setCostoMensaje(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" disabled={saving}>
            <IconSave /> {saving ? 'Guardando...' : 'Actualizar costo'}
          </button>
        </form>
      </div>
    </>
  );
}
