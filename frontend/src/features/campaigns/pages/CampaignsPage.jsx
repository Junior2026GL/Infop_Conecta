import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Modal from '../../../components/Modal.jsx';
import Pagination from '../../../components/Pagination.jsx';
import WhatsAppPreview from '../../../components/WhatsAppPreview.jsx';
import {
  IconUpload,
  IconSend,
  IconPlus,
  IconHistory,
  IconSearch,
  IconEye,
  IconTemplate,
  IconClose,
  IconCost,
  IconWallet,
  IconChevronDown,
  IconCheck,
  IconAlert,
  IconTrash,
  IconEdit,
  IconDownload,
} from '../../../components/icons.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { listTemplates } from '../../templates/services/templates.service.js';
import { getCostoMensaje } from '../../settings/services/settings.service.js';
import { getMySaldo } from '../../settings/services/wallet.service.js';
import {
  listCampaigns,
  getCampaign,
  importCampaign,
  sendCampaign,
  retryCampaign,
  removeDestinatario,
  updateDestinatario,
  addDestinatario,
  downloadParticipantsTemplate,
} from '../services/campaigns.service.js';

const estadoLabels = {
  BORRADOR: 'Borrador',
  ENVIANDO: 'Enviando',
  FINALIZADA: 'Finalizada',
};

const PAGE_SIZE = 20;

// Debe coincidir con SEND_DELAY_MS del backend (campaigns.service.js): pausa entre mensajes.
const SEGUNDOS_POR_MENSAJE = 5;

function formatDuracion(segundos) {
  const total = Math.max(0, Math.round(segundos));
  if (total < 60) return `${total} s`;
  const horas = Math.floor(total / 3600);
  const minutos = Math.round((total % 3600) / 60);
  if (horas === 0) return `${minutos} min`;
  return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
}

const ETIQUETAS_CAMPOS_FIJOS = {
  enlace_grupo: 'Enlace del grupo de WhatsApp',
};

const PLACEHOLDERS_CAMPOS_FIJOS = {
  curso: 'Excel básico - E - Promoción 16',
  fecha_inicio: 'Lunes 14 de septiembre de 2026',
  fecha_fin: '27 de septiembre de 2026',
  enlace_grupo: 'https://chat.whatsapp.com/JgR2JccwRWQCOG6kLZfxG5',
  correo_consultas: 'tutorvirtualngarcia@gmail.com',
  whatsapp_consultas: '94514774',
};

function playCampaignFinishedSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    playTone(880, 0, 0.16);
    playTone(1174.66, 0.14, 0.22);

    setTimeout(() => ctx.close(), 700);
  } catch (err) {
    console.error('No se pudo reproducir el sonido de notificación', err);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropzone({ file, onChange }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;

    if (!/\.(xlsx|xls|csv)$/i.test(dropped.name)) {
      toast.error('Formato no válido. Usa un archivo .xlsx, .xls o .csv.');
      return;
    }
    onChange(dropped);
  }

  return (
    <div
      className={`file-drop ${file ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        hidden
      />
      {file ? (
        <div className="file-drop-selected">
          <span className="file-drop-icon selected"><IconCheck width={18} height={18} /></span>
          <div className="file-drop-text">
            <b>{file.name}</b>
            <small>{formatFileSize(file.size)} · listo para importar</small>
          </div>
          <button
            type="button"
            className="icon-btn danger"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            aria-label="Quitar archivo"
          >
            <IconClose width={14} height={14} />
          </button>
        </div>
      ) : (
        <>
          <span className="file-drop-icon big"><IconUpload width={24} height={24} /></span>
          <b>{dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí o haz clic para elegirlo'}</b>
          <small>Formatos aceptados: .xlsx, .xls o .csv</small>
        </>
      )}
    </div>
  );
}

function TemplateSelect({ templates, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = templates.find((t) => String(t.id) === String(value));

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="combo" ref={ref}>
      <button type="button" className="combo-trigger" onClick={() => setOpen((v) => !v)}>
        <IconTemplate />
        <span className={selected ? '' : 'combo-placeholder'}>
          {selected ? selected.nombre : 'Selecciona una plantilla'}
        </span>
        <IconChevronDown className="combo-chevron" style={open ? { transform: 'rotate(180deg)' } : undefined} />
      </button>

      {open && (
        <div className="combo-panel">
          {templates.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`combo-option ${String(t.id) === String(value) ? 'active' : ''}`}
              onClick={() => { onChange(t.id); setOpen(false); }}
            >
              <span className="combo-option-icon"><IconTemplate width={15} height={15} /></span>
              <span className="combo-option-text">{t.nombre}</span>
              {String(t.id) === String(value) && <IconCheck width={14} height={14} />}
            </button>
          ))}
          {templates.length === 0 && <div className="combo-empty">No hay plantillas disponibles</div>}
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('infop_conecta_user') || 'null');
  const esSuperAdmin = currentUser?.rol === 'SUPER_ADMIN';
  const [tab, setTab] = useState('nueva');
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [costoMensaje, setCostoMensaje] = useState(0);
  const [misaldo, setMiSaldo] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [plantillaId, setPlantillaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [curso, setCurso] = useState('');
  const [valoresFijos, setValoresFijos] = useState({});
  const [file, setFile] = useState(null);

  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [soloInvalidos, setSoloInvalidos] = useState(false);
  const [sendTotal, setSendTotal] = useState(0);
  const [removingId, setRemovingId] = useState(null);
  const [confirmingRemove, setConfirmingRemove] = useState(null);

  const [editingDestinatario, setEditingDestinatario] = useState(null);
  const [editDestForm, setEditDestForm] = useState({ nombre: '', telefono: '', nota: '' });
  const [savingDest, setSavingDest] = useState(false);

  const [showAddManual, setShowAddManual] = useState(false);
  const [addDestForm, setAddDestForm] = useState({ nombre: '', telefono: '', nota: '' });
  const [addingDest, setAddingDest] = useState(false);

  const pollRef = useRef(null);

  const plantilla = templates.find((t) => String(t.id) === String(plantillaId));
  const camposFijos = (plantilla?.variables || []).filter(
    (v) => v.origen === 'fijo' && v.key !== 'curso'
  );

  async function loadInitial() {
    try {
      setTemplates(await listTemplates());
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las plantillas');
    }

    try {
      setHistory(await listCampaigns());
    } catch (err) {
      console.error(err);
    }

    try {
      setCostoMensaje(await getCostoMensaje());
    } catch (err) {
      console.error(err);
    }

    try {
      setMiSaldo(await getMySaldo());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadInitial().catch(console.error);
    return () => clearInterval(pollRef.current);
  }, []);

  function selectPlantilla(id) {
    setPlantillaId(id);
    setValoresFijos({});
  }

  function stopPolling() {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function startPolling(id) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await getCampaign(id);
        setCampaign(data);
        getMySaldo().then(setMiSaldo).catch(console.error);
        if (data.estado === 'FINALIZADA') {
          stopPolling();
          playCampaignFinishedSound();
          const historyData = await listCampaigns();
          setHistory(historyData);
        }
      } catch (err) {
        console.error(err);
        stopPolling();
      }
    }, 4000);
  }

  async function submitImport(e) {
    e.preventDefault();
    setError('');

    if (!plantillaId) return setError('Selecciona una plantilla');
    if (!file) return setError('Adjunta el archivo Excel o CSV');

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('plantillaId', plantillaId);
    formData.append('curso', curso);
    formData.append('nombre', nombre);
    formData.append('valoresFijos', JSON.stringify(valoresFijos));

    setImporting(true);
    try {
      const data = await importCampaign(formData);
      setCampaign(data);
      setSendTotal(0);
      setSoloInvalidos(false);
      setTab('nueva');
      setShowImportModal(false);
      setPlantillaId('');
      setNombre('');
      setCurso('');
      setValoresFijos({});
      setFile(null);
      toast.success('Campaña importada. Revisa la vista previa antes de enviar.');
      const historyData = await listCampaigns();
      setHistory(historyData);
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo importar el archivo';
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      await downloadParticipantsTemplate(plantillaId);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo descargar la plantilla de Excel');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleRetry() {
    if (!campaign) return;
    setError('');
    setRetrying(true);
    try {
      const data = await retryCampaign(campaign.id);
      setCampaign(data);
      setSoloInvalidos(false);
      toast.success('Campaña lista para reenviar. Revisa los datos y pulsa Enviar mensajes.');
      const historyData = await listCampaigns();
      setHistory(historyData);
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo preparar el reenvío';
      setError(message);
      toast.error(message);
    } finally {
      setRetrying(false);
    }
  }

  async function handleSend() {
    if (!campaign) return;
    setError('');
    setShowConfirmSend(false);
    setSendTotal(pendientes);
    setSending(true);
    try {
      await sendCampaign(campaign.id);
      const data = await getCampaign(campaign.id);
      setCampaign(data);
      startPolling(campaign.id);
      toast.success('Envío iniciado. Puedes seguir el progreso en esta pantalla.');
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo iniciar el envío';
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  async function confirmRemoveDestinatario() {
    if (!campaign || !confirmingRemove) return;
    const destinatario = confirmingRemove;
    setConfirmingRemove(null);

    setRemovingId(destinatario.id);
    try {
      const data = await removeDestinatario(campaign.id, destinatario.id);
      setCampaign(data);
      toast.success('Destinatario eliminado de la campaña.');
      const historyData = await listCampaigns();
      setHistory(historyData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar el destinatario');
    } finally {
      setRemovingId(null);
    }
  }

  function startEditDestinatario(destinatario) {
    setEditDestForm({
      nombre: destinatario.nombre || '',
      telefono: destinatario.telefono || '',
      nota: destinatario.nota || '',
    });
    setEditingDestinatario(destinatario);
  }

  async function submitEditDestinatario(e) {
    e.preventDefault();
    if (!campaign || !editingDestinatario) return;
    setSavingDest(true);
    try {
      const data = await updateDestinatario(campaign.id, editingDestinatario.id, editDestForm);
      setCampaign(data);
      setEditingDestinatario(null);
      toast.success('Destinatario actualizado.');
      const historyData = await listCampaigns();
      setHistory(historyData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el destinatario');
    } finally {
      setSavingDest(false);
    }
  }

  async function submitAddDestinatario(e) {
    e.preventDefault();
    if (!campaign) return;
    setAddingDest(true);
    try {
      const data = await addDestinatario(campaign.id, addDestForm);
      setCampaign(data);
      setShowAddManual(false);
      setAddDestForm({ nombre: '', telefono: '', nota: '' });
      toast.success('Destinatario agregado.');
      const historyData = await listCampaigns();
      setHistory(historyData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo agregar el destinatario');
    } finally {
      setAddingDest(false);
    }
  }

  async function openCampaign(id) {
    setError('');
    setSendTotal(0);
    setSoloInvalidos(false);
    try {
      const data = await getCampaign(id);
      setCampaign(data);
      setTab('nueva');
      if (data.estado === 'ENVIANDO') startPolling(id);
      else stopPolling();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la campaña');
    }
  }

  const pendientes = campaign?.destinatarios?.filter((d) => d.estado === 'PENDIENTE').length || 0;
  const validos = campaign?.destinatarios?.filter((d) => d.estado !== 'FALLIDO' || d.mensaje_id).length || 0;
  const invalidos = campaign?.destinatarios?.filter((d) => d.estado === 'FALLIDO' && !d.mensaje_id).length || 0;

  const costoUnitario = Number(campaign?.costo_unitario || 0);
  const costoEstimadoEnvio = pendientes * costoUnitario;
  const saldoInsuficiente = campaign?.estado === 'BORRADOR' && misaldo !== null && costoEstimadoEnvio > misaldo;
  const faltante = saldoInsuficiente ? costoEstimadoEnvio - misaldo : 0;

  const yaEnviados = campaign?.destinatarios?.filter((d) => d.estado === 'ENVIADO').length || 0;
  const noEnviados = pendientes + invalidos;
  const puedeReintentar = campaign?.estado === 'FINALIZADA' && noEnviados > 0;
  const quedoPorSaldo = campaign?.estado === 'FINALIZADA' && pendientes > 0;

  // Progreso del envío en curso. Si se abrió la campaña a mitad del envío no conocemos el
  // total inicial, así que se estima con lo ya enviado más lo que falta.
  const totalEnvio = sendTotal > 0 ? sendTotal : pendientes + yaEnviados;
  const procesados = Math.max(0, Math.min(totalEnvio, totalEnvio - pendientes));
  const progreso = totalEnvio > 0 ? Math.round((procesados / totalEnvio) * 100) : 0;
  const segundosRestantes = pendientes * SEGUNDOS_POR_MENSAJE;

  const destinatariosVisibles = soloInvalidos
    ? (campaign?.destinatarios || []).filter((d) => d.estado === 'FALLIDO' && !d.mensaje_id)
    : campaign?.destinatarios || [];

  const alcanzaPara = costoMensaje > 0 && misaldo !== null ? Math.floor(misaldo / costoMensaje) : null;

  // Con 20 mensajes o menos el saldo se considera justo.
  const estadoSaldo = alcanzaPara === null ? 'ok' : alcanzaPara <= 0 ? 'none' : alcanzaPara <= 20 ? 'low' : 'ok';
  const requiereNota = (plantilla?.variables || []).some((v) => v.key === 'nota');

  const filteredHistory = useMemo(() => history.filter((c) => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return true;
    return (
      c.nombre?.toLowerCase().includes(term) ||
      c.curso?.toLowerCase().includes(term) ||
      c.plantilla_nombre?.toLowerCase().includes(term)
    );
  }), [history, historySearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

  const paginatedHistory = useMemo(
    () => filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE),
    [filteredHistory, historyPage]
  );

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Importa tu Excel/CSV y envía plantillas de WhatsApp a todos los participantes."
      />

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      {showImportModal && (
        <Modal
          title="Nueva campaña"
          subtitle="Elige una plantilla, completa los datos e importa a tus participantes."
          icon={<IconUpload />}
          onClose={() => setShowImportModal(false)}
          width={1180}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setShowImportModal(false)}>
                Cancelar
              </button>
              <button type="submit" form="form-nueva-campana" className="btn-primary" disabled={importing}>
                <IconUpload /> {importing ? 'Importando...' : 'Importar y revisar'}
              </button>
            </>
          }
        >
          <form id="form-nueva-campana" onSubmit={submitImport}>
            <div className="campaign-modal-grid">
              <div className="campaign-modal-form">
                <section className="form-step">
                  <h4 className="step-head"><span className="step-num">1</span> Plantilla</h4>
                  <TemplateSelect templates={templates} value={plantillaId} onChange={selectPlantilla} />
                </section>

                <section className="form-step">
                  <h4 className="step-head"><span className="step-num">2</span> Datos de la campaña</h4>
                  <div className="form-grid">
                    <div>
                      <label>Curso</label>
                      <input
                        value={curso}
                        onChange={(e) => setCurso(e.target.value)}
                        placeholder={PLACEHOLDERS_CAMPOS_FIJOS.curso}
                        required
                      />
                    </div>

                    <div>
                      <label>Nombre de la campaña <span className="label-optional">(opcional)</span></label>
                      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Notas corte 3" />
                    </div>
                  </div>

                  {camposFijos.length > 0 && (
                    <div className="fixed-fields">
                      <p className="fixed-fields-title">Datos iguales para todos los participantes</p>
                      <div className="form-grid">
                        {camposFijos.map((campo) => (
                          <div key={campo.key} style={campo.key === 'enlace_grupo' ? { gridColumn: '1 / -1' } : undefined}>
                            <label>{ETIQUETAS_CAMPOS_FIJOS[campo.key] || campo.etiqueta || campo.key}</label>
                            <input
                              value={valoresFijos[campo.key] || ''}
                              onChange={(e) => setValoresFijos({ ...valoresFijos, [campo.key]: e.target.value })}
                              placeholder={PLACEHOLDERS_CAMPOS_FIJOS[campo.key] || `Ej. ${campo.etiqueta || campo.key}`}
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="form-step">
                  <h4 className="step-head"><span className="step-num">3</span> Archivo de participantes</h4>
                  <FileDropzone file={file} onChange={setFile} />
                  <div className="file-hint">
                    <span>
                      {plantilla ? (
                        <>Columnas: <b>nombre</b>, <b>telefono</b>{requiereNota && <>, <b>nota</b></>}.</>
                      ) : (
                        'Elige una plantilla para ver las columnas que necesita.'
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={handleDownloadTemplate}
                      disabled={downloadingTemplate || !plantilla}
                      title={plantilla ? undefined : 'Elige primero una plantilla'}
                    >
                      <IconDownload width={14} height={14} /> {downloadingTemplate ? 'Descargando…' : 'Descargar plantilla de Excel'}
                    </button>
                  </div>
                </section>
              </div>

              <aside className="campaign-modal-side">
                {plantilla ? (
                  <WhatsAppPreview
                    contenido={plantilla.contenido}
                    variables={plantilla.variables}
                    values={{ ...valoresFijos, curso }}
                    label="Así lo recibirán los participantes de los cursos"
                  />
                ) : (
                  <div className="preview-placeholder">
                    <span className="preview-placeholder-icon"><IconTemplate width={22} height={22} /></span>
                    <b>Vista previa del mensaje</b>
                    <p>Elige una plantilla para ver cómo lo recibirán tus participantes.</p>
                  </div>
                )}

                {costoMensaje > 0 && (
                  <div className={`balance-box ${estadoSaldo}`}>
                    <div className="balance-box-row">
                      <span><IconCost width={14} height={14} /> Costo por mensaje</span>
                      <strong>L. {Number(costoMensaje).toFixed(2)}</strong>
                    </div>
                    {misaldo !== null && (
                      <div className="balance-box-row">
                        <span><IconWallet width={14} height={14} /> Tu saldo</span>
                        <strong>L. {Number(misaldo).toFixed(2)}</strong>
                      </div>
                    )}
                    {alcanzaPara !== null && (
                      <div className="balance-box-row">
                        <span><IconSend width={14} height={14} /> Alcanza para</span>
                        <strong>{alcanzaPara} mensaje{alcanzaPara === 1 ? '' : 's'}</strong>
                      </div>
                    )}

                    {estadoSaldo === 'none' && (
                      <p className="balance-box-note">
                        Tu saldo no alcanza para enviar ningún mensaje. Puedes importar y revisar el archivo,
                        pero no podrás enviarlo hasta que se recargue el saldo.
                      </p>
                    )}
                    {estadoSaldo === 'low' && (
                      <p className="balance-box-note">Te queda poco saldo. Revisa que alcance para toda la lista.</p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </form>
        </Modal>
      )}

      <div className="tabs">
        <button
          className={`tab-link ${tab === 'nueva' ? 'active' : ''}`}
          onClick={() => setTab('nueva')}
        >
          <IconUpload /> Campaña
        </button>
        <button
          className={`tab-link ${tab === 'historial' ? 'active' : ''}`}
          onClick={() => setTab('historial')}
        >
          <IconHistory /> Mis campañas ({history.length})
        </button>
      </div>

      {tab === 'nueva' && (
        <>
          {!campaign && (
            <div className="panel campaign-empty">
              <span className="campaign-empty-icon"><IconSend width={26} height={26} /></span>
              <h3>Ninguna campaña activa</h3>
              <p>Crea una nueva campaña o elige una desde Mis campañas para ver su detalle.</p>
              <button className="btn-primary" onClick={() => setShowImportModal(true)}>
                <IconPlus /> Nueva campaña
              </button>
            </div>
          )}

          {campaign && (
            <div className="panel">
              <div className="page-header" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="panel-title">{campaign.nombre}</h3>
                  <p style={{ margin: 0, color: '#667085' }}>
                    Curso: {campaign.curso} · Plantilla: {campaign.plantilla_nombre}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`status ${campaign.estado === 'FINALIZADA' ? 'sent' : ''}`}>
                    {estadoLabels[campaign.estado] || campaign.estado}
                  </span>
                  <button className="btn-primary" onClick={() => setShowImportModal(true)}>
                    <IconPlus /> Nueva campaña
                  </button>
                </div>
              </div>

              <div className="card-grid">
                <div className="stat-card">
                  <span>Total registros</span>
                  <strong>{campaign.destinatarios?.length || 0}</strong>
                </div>
                <div className="stat-card">
                  <span>Pendientes / Inválidos</span>
                  <strong>{pendientes} / {invalidos}</strong>
                </div>
                <div className="stat-card">
                  <span>Enviados / Fallidos</span>
                  <strong>{campaign.enviados} / {campaign.fallidos}</strong>
                </div>
                <div className="stat-card">
                  <span>Costo (L. {Number(campaign.costo_unitario || 0).toFixed(2)} c/u)</span>
                  <strong>
                    L. {(campaign.enviados * (campaign.costo_unitario || 0)).toFixed(2)}
                    {pendientes > 0 && (
                      <small style={{ display: 'block', fontSize: 12, color: '#667085', fontWeight: 400 }}>
                        + L. {(pendientes * (campaign.costo_unitario || 0)).toFixed(2)} estimado por enviar
                      </small>
                    )}
                  </strong>
                </div>
              </div>

              {saldoInsuficiente && (
                <div className="alert error campaign-balance-alert">
                  <IconAlert />
                  <div>
                    <b>No puedes enviar esta campaña: saldo insuficiente.</b>
                    <span>
                      Necesitas L. {costoEstimadoEnvio.toFixed(2)} para {pendientes} mensaje{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'},
                      y tu saldo disponible es L. {Number(misaldo).toFixed(2)} (te faltan L. {faltante.toFixed(2)}).{' '}
                      {esSuperAdmin ? 'Recarga saldo desde Saldos.' : 'Solicita una recarga al Super Admin.'}
                    </span>
                  </div>
                </div>
              )}

              {campaign.estado === 'BORRADOR' && invalidos > 0 && (
                <div className="alert warning campaign-balance-alert">
                  <IconAlert />
                  <div>
                    <b>{invalidos} registro{invalidos === 1 ? '' : 's'} con problemas no se enviará{invalidos === 1 ? '' : 'n'}.</b>
                    <span>
                      Corrígelos con el lápiz o quítalos. Los que sigan inválidos se omiten y no se cobran.{' '}
                      <button type="button" className="btn-link" onClick={() => setSoloInvalidos((v) => !v)}>
                        {soloInvalidos ? 'Ver todos los registros' : 'Ver solo los inválidos'}
                      </button>
                    </span>
                  </div>
                </div>
              )}

              {campaign.estado === 'ENVIANDO' && (
                <div className="campaign-progress">
                  <div className="campaign-progress-head">
                    <b>Enviando mensajes… {progreso}%</b>
                    <span>
                      {procesados} de {totalEnvio} procesados
                      {pendientes > 0 && ` · faltan unos ${formatDuracion(segundosRestantes)}`}
                    </span>
                  </div>
                  <div className="campaign-progress-track">
                    <div className="campaign-progress-fill" style={{ width: `${progreso}%` }} />
                  </div>
                  <small>Puedes salir de esta pantalla: el envío continúa en segundo plano.</small>
                </div>
              )}

              {quedoPorSaldo && (
                <div className="alert warning campaign-balance-alert">
                  <IconAlert />
                  <div>
                    <b>El envío se detuvo antes de terminar.</b>
                    <span>
                      Quedaron {pendientes} mensaje{pendientes === 1 ? '' : 's'} sin enviar, normalmente porque el saldo se agotó.
                      {esSuperAdmin ? ' Recarga saldo desde Saldos' : ' Solicita una recarga al Super Admin'} y pulsa «Reenviar no enviados».
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={() => setShowConfirmSend(true)}
                  disabled={sending || campaign.estado !== 'BORRADOR' || pendientes === 0 || saldoInsuficiente}
                  title={saldoInsuficiente ? 'Saldo insuficiente para enviar esta campaña' : undefined}
                >
                  <IconSend />
                  {campaign.estado === 'ENVIANDO' ? 'Enviando...' : sending ? 'Iniciando...' : 'Enviar mensajes'}
                </button>

                {campaign.estado === 'BORRADOR' && (
                  <button className="btn-success" onClick={() => setShowAddManual(true)}>
                    <IconPlus /> Agregar manualmente
                  </button>
                )}

                {puedeReintentar && (
                  <button className="btn-outline" onClick={handleRetry} disabled={retrying}>
                    <IconSend /> {retrying ? 'Preparando...' : `Reenviar no enviados (${noEnviados})`}
                  </button>
                )}
              </div>

              <div className="table-wrap">
                <table className="campaign-destinatarios-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Nota</th>
                      <th>Estado</th>
                      <th>Detalle</th>
                      {campaign.estado === 'BORRADOR' && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {destinatariosVisibles.map((d) => (
                      <tr key={d.id}>
                        <td title={d.nombre || ''}>{d.nombre || '-'}</td>
                        <td title={d.telefono || ''}>{d.telefono || '-'}</td>
                        <td>{d.nota || '-'}</td>
                        <td>
                          <span
                            className={`status ${
                              d.estado === 'ENVIADO' ? 'sent' : d.estado === 'FALLIDO' ? 'failed' : ''
                            }`}
                          >
                            {d.estado === 'ENVIADO' && (
                              <span className="status-check-icon">
                                <IconCheck width={9} height={9} />
                              </span>
                            )}
                            {d.estado}
                          </span>
                        </td>
                        <td title={d.error_mensaje || ''}>{d.error_mensaje || '-'}</td>
                        {campaign.estado === 'BORRADOR' && (
                          <td>
                            {d.estado !== 'ENVIADO' && (
                              <div className="actions-row">
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Editar destinatario"
                                  onClick={() => startEditDestinatario(d)}
                                >
                                  <IconEdit />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn danger"
                                  title="Quitar de la campaña"
                                  onClick={() => setConfirmingRemove(d)}
                                  disabled={removingId === d.id}
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'historial' && (
        <div className="campaigns-history-content">
          <div className="panel table-wrap">
            <div className="users-toolbar">
              <h3 className="panel-title" style={{ margin: 0 }}>Mis campañas</h3>
              <div className="input-icon users-search">
                <IconSearch />
                <input
                  placeholder="Buscar por nombre o curso…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </div>
            <table className="campaigns-history-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Enviados</th>
                  <th>Fallidos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.curso}</td>
                    <td>
                      <div className="campaign-status-cell">
                        <span className={`status ${c.estado === 'FINALIZADA' ? 'sent' : ''}`}>
                          {estadoLabels[c.estado] || c.estado}
                        </span>
                        {c.saldo_insuficiente && (
                          <span className="status failed" title="El saldo del creador no alcanza para enviarla">
                            Sin saldo
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{c.total_registros}</td>
                    <td>{c.enviados}</td>
                    <td>{c.fallidos}</td>
                    <td>
                      <button className="btn-link" onClick={() => openCampaign(c.id)}>
                        <IconEye /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <span className="empty-state-icon">📨</span>
                        <div className="empty-state-title">Sin campañas todavía</div>
                        Importa un Excel/CSV en "Nueva campaña" para comenzar.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={historyPage}
            pageSize={PAGE_SIZE}
            total={filteredHistory.length}
            onPageChange={setHistoryPage}
          />
        </div>
      )}

      {showConfirmSend && campaign && (
        <Modal
          title="Confirmar envío"
          subtitle="Revisa el resumen antes de enviar. Una vez iniciado, no se puede cancelar."
          icon={<IconSend />}
          onClose={() => setShowConfirmSend(false)}
          width={460}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setShowConfirmSend(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSend} disabled={sending}>
                <IconSend /> Sí, enviar {pendientes} mensaje{pendientes === 1 ? '' : 's'}
              </button>
            </>
          }
        >
          <div className="campaign-cost-box rows">
            <div>
              <span><IconSend width={14} height={14} /> Mensajes a enviar</span>
              <strong>{pendientes}</strong>
            </div>
            {invalidos > 0 && (
              <div>
                <span><IconAlert width={14} height={14} /> Omitidos por datos inválidos</span>
                <strong>{invalidos}</strong>
              </div>
            )}
            <div>
              <span><IconCost width={14} height={14} /> Costo total</span>
              <strong>L. {costoEstimadoEnvio.toFixed(2)}</strong>
            </div>
            {misaldo !== null && (
              <div>
                <span><IconWallet width={14} height={14} /> Saldo después del envío</span>
                <strong>L. {Math.max(0, misaldo - costoEstimadoEnvio).toFixed(2)}</strong>
              </div>
            )}
            <div>
              <span><IconHistory width={14} height={14} /> Tiempo estimado</span>
              <strong>{formatDuracion(pendientes * SEGUNDOS_POR_MENSAJE)}</strong>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', color: '#667085', fontSize: 13 }}>
            Se envía un mensaje cada {SEGUNDOS_POR_MENSAJE} segundos. Puedes cerrar esta pantalla mientras tanto.
          </p>
        </Modal>
      )}

      {confirmingRemove && (
        <Modal
          title="Quitar destinatario"
          subtitle="Esta acción no se puede deshacer."
          icon={<IconTrash />}
          onClose={() => setConfirmingRemove(null)}
          width={420}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setConfirmingRemove(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={confirmRemoveDestinatario}>
                <IconTrash /> Quitar de la campaña
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            ¿Quitar a <b>{confirmingRemove.nombre || confirmingRemove.telefono}</b> de esta campaña?
            Ya no recibirá este mensaje y no se le cobrará el envío.
          </p>
        </Modal>
      )}

      {editingDestinatario && (
        <Modal
          title="Editar destinatario"
          subtitle="Actualiza los datos antes de enviar el mensaje."
          icon={<IconEdit />}
          onClose={() => setEditingDestinatario(null)}
          width={480}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setEditingDestinatario(null)}>
                Cancelar
              </button>
              <button type="submit" form="form-editar-destinatario" className="btn-primary" disabled={savingDest}>
                {savingDest ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          }
        >
          <form id="form-editar-destinatario" className="form-sections" onSubmit={submitEditDestinatario}>
            <div className="form-grid">
              <div>
                <label>Nombre</label>
                <input
                  value={editDestForm.nombre}
                  onChange={(e) => setEditDestForm({ ...editDestForm, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Teléfono</label>
                <input
                  value={editDestForm.telefono}
                  onChange={(e) => setEditDestForm({ ...editDestForm, telefono: e.target.value })}
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Nota <span className="label-optional">(opcional)</span></label>
                <input
                  value={editDestForm.nota}
                  onChange={(e) => setEditDestForm({ ...editDestForm, nota: e.target.value })}
                  placeholder="Ej. 70"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {showAddManual && (
        <Modal
          title="Agregar destinatario"
          subtitle="Ingresa los datos manualmente sin usar un archivo."
          icon={<IconPlus />}
          onClose={() => setShowAddManual(false)}
          width={480}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setShowAddManual(false)}>
                Cancelar
              </button>
              <button type="submit" form="form-agregar-destinatario" className="btn-primary" disabled={addingDest}>
                <IconPlus /> {addingDest ? 'Agregando...' : 'Agregar'}
              </button>
            </>
          }
        >
          <form id="form-agregar-destinatario" className="form-sections" onSubmit={submitAddDestinatario}>
            <div className="form-grid">
              <div>
                <label>Nombre</label>
                <input
                  value={addDestForm.nombre}
                  onChange={(e) => setAddDestForm({ ...addDestForm, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>
              <div>
                <label>Teléfono</label>
                <input
                  value={addDestForm.telefono}
                  onChange={(e) => setAddDestForm({ ...addDestForm, telefono: e.target.value })}
                  placeholder="Ej. 98765432"
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Nota <span className="label-optional">(opcional)</span></label>
                <input
                  value={addDestForm.nota}
                  onChange={(e) => setAddDestForm({ ...addDestForm, nota: e.target.value })}
                  placeholder="Ej. 70"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
