import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconSave, IconPhone, IconMail, IconMessageCircle, IconClock, IconShield } from '../../../components/icons.jsx';
import { getSoporte, updateSoporte } from '../services/settings.service.js';

const emptyForm = { telefono: '', whatsapp: '', correo: '', horario: '' };

function SupportCard({ soporte }) {
  const items = [
    { key: 'telefono', label: 'Teléfono', value: soporte.telefono, tone: 'blue', Icon: IconPhone, href: soporte.telefono && `tel:${soporte.telefono}` },
    { key: 'whatsapp', label: 'WhatsApp', value: soporte.whatsapp, tone: 'green', Icon: IconMessageCircle, href: soporte.whatsapp && `https://wa.me/${soporte.whatsapp.replace(/\D/g, '')}` },
    { key: 'correo', label: 'Correo electrónico', value: soporte.correo, tone: 'purple', Icon: IconMail, href: soporte.correo && `mailto:${soporte.correo}` },
    { key: 'horario', label: 'Horario de atención', value: soporte.horario, tone: 'amber', Icon: IconClock },
  ].filter((item) => item.value);

  return (
    <div className="panel support-card">
      <div className="support-card-header">
        <span className="support-card-icon"><IconShield /></span>
        <div>
          <h3>Soporte y contacto</h3>
          <p>¿Tienes dudas o algún inconveniente? Comunícate con nosotros.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="support-empty">Aún no se ha configurado la información de soporte.</div>
      ) : (
        <div className="support-grid">
          {items.map(({ key, label, value, tone, Icon, href }) => (
            <div className="support-item" key={key}>
              <span className={`support-item-icon ${tone}`}><Icon /></span>
              <div>
                <span className="support-item-label">{label}</span>
                {href ? (
                  <a className="support-item-value" href={href} target="_blank" rel="noreferrer">{value}</a>
                ) : (
                  <strong className="support-item-value">{value}</strong>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
        <>
          <SupportCard soporte={soporte} />

          <div className="panel cost-config-card" style={{ marginTop: 20 }}>
            <div className="cost-config-header">
              <div>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <IconMessageCircle /> Editar información de soporte
                </h3>
                <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 13 }}>
                  Esta información se mostrará a los administradores y tutores en esta misma sección.
                </p>
              </div>
            </div>

            <form className="form-stack" onSubmit={submit}>
              <div className="field-group">
                <label>Teléfono</label>
                <input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej. 2235-4400"
                />
              </div>
              <div className="field-group">
                <label>WhatsApp</label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="Ej. 50499999999"
                />
              </div>
              <div className="field-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="Ej. soporte@infop.hn"
                />
              </div>
              <div className="field-group">
                <label>Horario de atención</label>
                <input
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  placeholder="Ej. Lunes a viernes, 8:00 am - 5:00 pm"
                />
              </div>

              <div>
                <button className="btn-primary" disabled={saving}>
                  <IconSave /> {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
