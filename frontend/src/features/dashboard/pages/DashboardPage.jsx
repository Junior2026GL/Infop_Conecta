import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/Modal.jsx';
import {
  IconSend,
  IconCheck,
  IconEye,
  IconAlert,
  IconCost,
  IconWallet,
  IconTemplate,
  IconHistory,
  IconArrowRight,
  IconSun,
  IconCloudSun,
  IconMoonStars,
  IconUpload,
} from '../../../components/icons.jsx';
import { getStats } from '../services/dashboard.service.js';
import { getCostoMensaje } from '../../settings/services/settings.service.js';
import { getMySaldo, getMisMovimientos } from '../../settings/services/wallet.service.js';
import { getUsageReport } from '../../settings/services/reports.service.js';

function formatLempiras(valor) {
  return `L. ${Number(valor || 0).toFixed(2)}`;
}

function formatNumero(valor) {
  return Number(valor || 0).toLocaleString('es-HN');
}

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return { texto: 'Buenos días', Icon: IconSun };
  if (hora < 19) return { texto: 'Buenas tardes', Icon: IconCloudSun };
  return { texto: 'Buenas noches', Icon: IconMoonStars };
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function porcentaje(parte, total) {
  if (!total) return 0;
  return Math.round((Number(parte || 0) / Number(total)) * 100);
}

const UMBRAL_MENSAJES = 5;

const TONE_COLORS = {
  blue: '#2563eb',
  green: '#0e9f6e',
  purple: '#7c3aed',
  red: '#dc2626',
  amber: '#d97706',
};

function DeliveryDonut({ segments, total, size = 132, thickness = 16 }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  const arcs = segments.map((seg) => {
    const fraction = total ? seg.value / total : 0;
    const length = fraction * circumference;
    const arc = { ...seg, length, offset: acc };
    acc += length;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dash-donut">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f6" strokeWidth={thickness} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {arcs.map((arc) => (
          arc.length > 0 && (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={`${arc.length} ${circumference}`}
              strokeDashoffset={-arc.offset}
            />
          )
        ))}
      </g>
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [misaldo, setMiSaldo] = useState(null);
  const [costoMensaje, setCostoMensaje] = useState(0);
  const [gastoSistema, setGastoSistema] = useState(null);
  const [showMovimientos, setShowMovimientos] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [ahora, setAhora] = useState(new Date());

  const user = JSON.parse(localStorage.getItem('infop_conecta_user') || 'null');
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
    getMySaldo().then(setMiSaldo).catch(console.error);
    getCostoMensaje().then(setCostoMensaje).catch(console.error);

    if (esSuperAdmin) {
      getUsageReport()
        .then((reporte) => {
          setGastoSistema(reporte.reduce((sum, r) => sum + Number(r.costo_total || 0), 0));
        })
        .catch(console.error);
    }
  }, []);

  async function openSaldoCard() {
    if (esSuperAdmin) {
      navigate('/saldos');
      return;
    }

    try {
      setMovimientos(await getMisMovimientos());
      setShowMovimientos(true);
    } catch (err) {
      console.error(err);
    }
  }

  const totalMensajes = stats?.mensajes?.total ?? 0;

  const cards = [
    { label: 'Enviados', value: stats?.mensajes?.enviados, Icon: IconSend, tone: 'blue', kind: 'count' },
    { label: 'Entregados', value: stats?.mensajes?.entregados, Icon: IconCheck, tone: 'green', kind: 'count' },
    { label: 'Leídos', value: stats?.mensajes?.leidos, Icon: IconEye, tone: 'purple', kind: 'count' },
    { label: 'Fallidos', value: stats?.mensajes?.fallidos, Icon: IconAlert, tone: 'red', kind: 'count' },
    { label: 'Costo por mensaje', value: costoMensaje, Icon: IconCost, tone: 'amber', kind: 'money' },
  ];

  const embudo = [
    { label: 'Entregados', value: stats?.mensajes?.entregados ?? 0, tone: 'green' },
    { label: 'Leídos', value: stats?.mensajes?.leidos ?? 0, tone: 'purple' },
    { label: 'Fallidos', value: stats?.mensajes?.fallidos ?? 0, tone: 'red' },
  ];

  const alcanzaPara = costoMensaje > 0 && misaldo !== null ? Math.floor(misaldo / costoMensaje) : null;
  const saldoBajo = alcanzaPara !== null && alcanzaPara < UMBRAL_MENSAJES;
  const cargando = stats === null;

  const { texto: saludoTexto, Icon: SaludoIcon } = saludo();
  const fechaHoy = capitalizar(ahora.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' }));
  const horaAhora = ahora.toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit' });

  const destacados = [
    { label: 'Importación desde Excel', Icon: IconUpload },
    { label: 'Plantillas aprobadas', Icon: IconTemplate },
    { label: 'Seguimiento en tiempo real', Icon: IconHistory },
  ];

  const accesos = [
    { label: 'Plantillas', hint: 'Crear y aprobar mensajes', Icon: IconTemplate, to: '/plantillas', tone: 'blue' },
    { label: 'Campañas', hint: 'Envíos masivos por curso', Icon: IconSend, to: '/campanas', tone: 'green' },
    { label: 'Historial', hint: 'Seguimiento de entregas', Icon: IconHistory, to: '/historial', tone: 'purple' },
    ...(esSuperAdmin
      ? [{ label: 'Saldos', hint: 'Recargas por usuario', Icon: IconWallet, to: '/saldos', tone: 'amber' }]
      : []),
  ];

  return (
    <div className="dash-page">
      <section className="dash-hero">
        <div className="dash-hero-text">
          <span className="dash-hero-eyebrow">
            <span className="dash-hero-eyebrow-icon"><SaludoIcon width={14} height={14} /></span>
            {saludoTexto}
            <span className="dash-hero-eyebrow-date">{fechaHoy} · {horaAhora}</span>
          </span>
          <h1>{user?.nombre || 'Bienvenido'}</h1>
          <p>
            Administra plantillas, campañas de envío masivo y el historial de mensajes
            enviados mediante WhatsApp Cloud API.
          </p>

          <ul className="dash-hero-highlights">
            {destacados.map(({ label, Icon }) => (
              <li key={label}>
                <span className="dash-hero-highlight-icon"><Icon width={14} height={14} /></span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-hero-actions">
          <button className="btn-hero-primary" onClick={() => navigate('/campanas')}>
            <IconSend /> Nueva campaña
          </button>
          <button className="btn-hero-ghost" onClick={() => navigate('/plantillas')}>
            <IconTemplate /> Ver plantillas
          </button>
        </div>
      </section>

      {saldoBajo && (
        <div className="alert warning dash-alert">
          <IconAlert />
          <span>
            Tu saldo alcanza para {alcanzaPara <= 0 ? 'ningún mensaje más' : `solo ${alcanzaPara} mensaje${alcanzaPara === 1 ? '' : 's'} más`}.
            {esSuperAdmin ? ' Recarga saldo desde Costos.' : ' Solicita una recarga al Super Admin.'}
          </span>
        </div>
      )}

      <div className="dash-kpi-grid">
        {cards.map(({ label, value, Icon, tone, kind }) => (
          <div className={`dash-kpi ${tone}`} key={label}>
            <div className="dash-kpi-top">
              <span className={`dash-kpi-icon ${tone}`}><Icon /></span>
              {kind === 'count' && !cargando && totalMensajes > 0 && (
                <span className={`dash-chip ${tone}`}>{porcentaje(value, totalMensajes)}%</span>
              )}
            </div>
            <span className="dash-kpi-label">{label}</span>
            {cargando
              ? <span className="dash-skeleton lg" />
              : (
                <strong className="dash-kpi-value">
                  {kind === 'money' ? formatLempiras(value) : formatNumero(value)}
                </strong>
              )}
          </div>
        ))}
      </div>

      <div className="dash-split">
        <section className="dash-panel">
          <header className="dash-panel-head">
            <div>
              <h2>Rendimiento de entrega</h2>
              <p>Distribución sobre {formatNumero(totalMensajes)} mensaje{totalMensajes === 1 ? '' : 's'} registrado{totalMensajes === 1 ? '' : 's'}.</p>
            </div>
            <button className="btn-link" onClick={() => navigate('/historial')}>
              Ver historial <IconArrowRight width={14} height={14} />
            </button>
          </header>

          {totalMensajes === 0 ? (
            <div className="dash-empty">
              <span className="dash-empty-icon"><IconSend width={22} height={22} /></span>
              <strong>Todavía no hay mensajes enviados</strong>
              <p>Crea una campaña para empezar a ver métricas de entrega aquí.</p>
              <button className="btn-primary" onClick={() => navigate('/campanas')}>
                <IconSend /> Crear campaña
              </button>
            </div>
          ) : (
            <div className="dash-donut-row">
              <div className="dash-donut-wrap">
                <DeliveryDonut
                  total={totalMensajes}
                  segments={embudo.map((e) => ({ ...e, color: TONE_COLORS[e.tone] }))}
                />
                <div className="dash-donut-center">
                  <strong>{formatNumero(totalMensajes)}</strong>
                  <span>mensaje{totalMensajes === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="dash-legend">
                {embudo.map(({ label, value, tone }) => (
                  <div className="dash-legend-item" key={label}>
                    <span className={`dash-legend-dot ${tone}`} />
                    <span className="dash-legend-label">{label}</span>
                    <span className="dash-legend-value">
                      {formatNumero(value)}
                      <small>{porcentaje(value, totalMensajes)}%</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        <aside className="dash-side">
          <div className="dash-wallet" onClick={openSaldoCard} role="button" tabIndex={0}
               onKeyDown={(e) => { if (e.key === 'Enter') openSaldoCard(); }}>
            <div className="dash-wallet-head">
              <span className="dash-wallet-icon"><IconWallet /></span>
              <span className="dash-wallet-label">Tu saldo disponible</span>
            </div>

            <strong className={`dash-wallet-value ${misaldo !== null && misaldo <= 0 ? 'negativo' : ''}`}>
              {misaldo === null ? '—' : formatLempiras(misaldo)}
            </strong>

            {alcanzaPara !== null && (
              <>
                <div className="dash-wallet-track">
                  <div
                    className={`dash-wallet-fill ${saldoBajo ? 'bajo' : ''}`}
                    style={{ width: `${Math.max(2, Math.min(100, alcanzaPara))}%` }}
                  />
                </div>
                <span className="dash-wallet-hint">
                  Alcanza para <b>{formatNumero(alcanzaPara)}</b> mensaje{alcanzaPara === 1 ? '' : 's'}
                </span>
              </>
            )}

            <span className="dash-wallet-link">
              {esSuperAdmin ? 'Administrar saldos' : 'Ver mis movimientos'} <IconArrowRight width={14} height={14} />
            </span>
          </div>

          {esSuperAdmin && (
            <div
              className="dash-kpi purple dash-kpi-clickable"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/costos')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/costos'); }}
            >
              <div className="dash-kpi-top">
                <span className="dash-kpi-icon purple"><IconCost /></span>
              </div>
              <span className="dash-kpi-label">Gasto total del sistema</span>
              <strong className="dash-kpi-value sm">
                {gastoSistema === null ? '—' : formatLempiras(gastoSistema)}
              </strong>
            </div>
          )}

          <div className="dash-panel dash-panel-tight">
            <h2 className="dash-panel-title">Accesos rápidos</h2>
            <div className="dash-links">
              {accesos.map(({ label, hint, Icon, to, tone }) => (
                <button className="dash-link" key={to} onClick={() => navigate(to)}>
                  <span className={`dash-link-icon ${tone}`}><Icon /></span>
                  <span className="dash-link-text">
                    <b>{label}</b>
                    <small>{hint}</small>
                  </span>
                  <IconArrowRight className="dash-link-arrow" width={16} height={16} />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showMovimientos && (
        <Modal title="Mis movimientos de saldo" onClose={() => setShowMovimientos(false)} width={560}>
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
                    <td>{m.created_at}</td>
                    <td>
                      <span className={`status ${m.tipo === 'RECARGA' ? 'sent' : 'failed'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td>{formatLempiras(m.monto)}</td>
                    <td>{formatLempiras(m.saldo_resultante)}</td>
                    <td>{m.referencia || m.campania_nombre || '-'}</td>
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
    </div>
  );
}
