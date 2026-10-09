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

// `values` permite mostrar lo que el usuario ya escribió (por ejemplo el curso);
// lo que falte se rellena con datos de ejemplo.
function buildPreview(contenido, variables, values = {}) {
  if (!contenido) return 'Sin contenido de referencia.';

  let text = contenido;
  (variables || []).forEach((variable, index) => {
    const placeholder = `{{${index + 1}}}`;
    const typed = String(values[variable.key] ?? '').trim();
    const value = typed || sampleValues[variable.key] || variable.etiqueta || variable.key;
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

export default function WhatsAppPreview({ contenido, variables, values, label = 'Tu plantilla' }) {
  const text = buildPreview(contenido, variables, values);
  const lines = text.split('\n');
  const titulo = lines[0]?.replace(/\*/g, '') || '';
  const pie = lines[lines.length - 1] || '';
  const cuerpo = lines.slice(1, -1).join('\n');

  return (
    <div className="whatsapp-preview">
      <span className="whatsapp-preview-label">{label}</span>
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
