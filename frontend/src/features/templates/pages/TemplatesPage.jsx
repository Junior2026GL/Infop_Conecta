import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import { IconTemplate } from '../../../components/icons.jsx';
import { listTemplates } from '../services/templates.service.js';

const sampleValues = {
  nombre: 'Juan Pérez',
  curso: 'Excel Financiero',
  nota: '95',
  fecha_inicio: '31 de agosto de 2026',
  fecha_fin: '13 de septiembre de 2026',
  enlace_grupo: 'https://chat.whatsapp.com/ejemplo',
  correo_consultas: 'tutor@infop.hn',
  whatsapp_consultas: '99999999',
};

function buildPreview(contenido, variables) {
  if (!contenido) return 'Sin contenido de referencia.';

  let text = contenido;
  (variables || []).forEach((variable, index) => {
    const placeholder = `{{${index + 1}}}`;
    const value = sampleValues[variable.key] || variable.etiqueta || variable.key;
    text = text.split(placeholder).join(value);
  });

  return text;
}

function linkify(text) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>
      : part
  );
}

function WhatsAppPreview({ contenido, variables }) {
  const text = buildPreview(contenido, variables);
  const lines = text.split('\n');
  const titulo = lines[0]?.replace(/\*/g, '') || '';
  const pie = lines[lines.length - 1] || '';
  const cuerpo = lines.slice(1, -1).join('\n');

  return (
    <div className="whatsapp-preview">
      <span className="whatsapp-preview-label">Tu plantilla</span>
      <div className="whatsapp-bubble">
        <div className="wa-title">{titulo}</div>
        <div className="wa-body">{linkify(cuerpo)}</div>
        <div className="wa-footer-row">
          <span className="wa-brand">{pie}</span>
          <span className="wa-time">10:45 pm</span>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    listTemplates().then(setItems).catch(console.error);
  }, []);

  return (
    <>
      <PageHeader
        title="Plantillas"
        description="Plantillas aprobadas o registradas para Meta WhatsApp."
      />

      <div className="template-grid">
        {items.map((item) => (
          <div key={item.id} className="template-card">
            <h3 className="template-card-title">
              <IconTemplate /> {item.nombre}
            </h3>

            <WhatsAppPreview contenido={item.contenido} variables={item.variables} />
          </div>
        ))}

        {items.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">📄</span>
            <div className="empty-state-title">Sin plantillas registradas</div>
            Pide al Super Admin que registre las plantillas aprobadas en Meta.
          </div>
        )}
      </div>
    </>
  );
}
