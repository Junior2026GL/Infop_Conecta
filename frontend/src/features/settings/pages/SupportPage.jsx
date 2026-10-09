import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import {
  IconSave,
  IconPhone,
  IconMail,
  IconMessageCircle,
  IconClock,
  IconShield,
  IconCheck,
} from '../../../components/icons.jsx';
import { getSoporte, updateSoporte } from '../services/settings.service.js';

const emptyForm = { telefono: '', whatsapp: '', correo: '', horario: '' };

// Honduras: un número de 8 dígitos se completa con el código de país (504),
// igual que hace el backend al enviar mensajes. Sin él, wa.me no abre el chat.
function whatsappLink(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return null;
  return `https://wa.me/${digitos.length === 8 ? `504${digitos}` : digitos}`;
}

function buildItems(soporte) {
  return [
    {
      key: 'telefono',
      label: 'Teléfono',
      value: soporte.telefono,
      tone: 'blue',
      Icon: IconPhone,
      href: soporte.telefono ? `tel:${soporte.telefono.replace(/\s/g, '')}` : null,
      action: 'Llamar',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: soporte.whatsapp,
      tone: 'green',
      Icon: IconMessageCircle,
      href: whatsappLink(soporte.whatsapp),
      action: 'Abrir chat',
    },
    {
      key: 'correo',
      label: 'Correo electrónico',
      value: soporte.correo,
      tone: 'purple',
      Icon: IconMail,
      href: soporte.correo ? `mailto:${soporte.correo}` : null,
      action: 'Escribir',
    },
    {
      key: 'horario',
      label: 'Horario de atención',
      value: soporte.horario,
      tone: 'amber',
      Icon: IconClock,
      href: null,
      action: null,
    },
  ].filter((item) => item.value);
}

function CopyButton({ value }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado al portapapeles.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  return (
    <button type="button" className="support-copy" onClick={copy}>
      {copied ? <><IconCheck width={13} height={13} /> Copiado</> : 'Copiar'}
    </button>
  );
}

function SupportCard({ soporte, preview = false }) {
  const items = buildItems(soporte);

  return (
    <div className="panel support-card">
      <div className="support-hero">
        <span className="support-card-icon"><IconShield /></span>
        <div>
          <h3>Soporte y contacto</h3>
          <p>¿Tienes dudas o algún inconveniente? Estamos para ayudarte.</p>
        </div>
        {preview && <span className="support-preview-badge">Vista previa</span>}
      </div>

      {items.length === 0 ? (
        <div className="support-empty">Aún no se ha configurado la información de soporte.</div>
      ) : (
        <div className="support-list">
          {items.map(({ key, label, value, tone, Icon, href, action }) => (
            <div className="support-item" key={key}>
              <span className={`support-item-icon ${tone}`}><Icon /></span>

              <div className="support-item-body">
                <span className="support-item-label">{label}</span>
                <strong className="support-item-value">{value}</strong>
              </div>

              <div className="support-item-actions">
                {href && (
                  <a className="support-action" href={href} target="_blank" rel="noreferrer">
                    {action}
                  </a>
                )}
                {key !== 'horario' && <CopyButton value={value} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, icon: Icon, ...inputProps }) {
  return (
    <div className="field-group">
      <label>{label}</label>
      <div className="input-icon">
        <Icon />
        <input {...inputProps} />
      </div>
      {hint && <small className="support-hint">{hint}</small>}
    </div>
  );
}

export default function SupportPage({ isSuperAdmin }) {
  const toast = useToast();
  const [soporte, setSoporte] = useState(emptyForm);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSoporte().then((data) => {
      setSoporte(data);
      setForm({ telefono: data.telefono, whatsapp: data.whatsapp, correo: data.correo, horario: data.horario });
    }).catch(console.error);
  }, []);

  const dirty = ['telefono', 'whatsapp', 'correo', 'horario'].some(
    (campo) => (form[campo] || '') !== (soporte[campo] || '')
  );

  function discard() {
    setForm({
      telefono: soporte.telefono || '',
      whatsapp: soporte.whatsapp || '',
      correo: soporte.correo || '',
      horario: soporte.horario || '',
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await updateSoporte(form);
      setSoporte(data);
      toast.success('Información de soporte actualizada correctamente.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar la información de soporte');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Soporte"
        description={isSuperAdmin
          ? 'Configura la información de contacto que verán los administradores y tutores.'
          : '¿Necesitas ayuda? Aquí puedes encontrar cómo contactarnos.'}
      />

      {!isSuperAdmin && <SupportCard soporte={soporte} />}

      {isSuperAdmin && (
        <div className="support-layout">
          <form className="panel support-form" onSubmit={submit}>
            <div className="support-form-head">
              <h3 className="panel-title">
                <IconMessageCircle /> Editar información
              </h3>
              <p>Los cambios se ven al instante en la vista previa. Se publican al guardar.</p>
            </div>

            <div className="support-form-grid">
              <Field
                label="Teléfono"
                icon={IconPhone}
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Ej. 2235-4400"
                inputMode="tel"
              />
              <Field
                label="WhatsApp"
                icon={IconMessageCircle}
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="Ej. 98765432"
                inputMode="tel"
                hint="Con 8 dígitos se agrega el código +504 al abrir el chat."
              />
              <div className="support-form-wide">
                <Field
                  label="Correo electrónico"
                  icon={IconMail}
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="Ej. soporte@infop.hn"
                />
              </div>
              <div className="support-form-wide">
                <Field
                  label="Horario de atención"
                  icon={IconClock}
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  placeholder="Ej. Lunes a viernes, 7:30 am - 3:30 pm"
                />
              </div>
            </div>

            <div className="support-form-actions">
              <button className="btn-primary" disabled={saving || !dirty}>
                <IconSave /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" className="btn-outline" onClick={discard} disabled={saving || !dirty}>
                Descartar
              </button>
              {dirty && <span className="support-dirty">Tienes cambios sin guardar</span>}
            </div>
          </form>

          <SupportCard soporte={form} preview />
        </div>
      )}
    </>
  );
}
