import { useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import { sendTemplateMessage } from '../services/messages.service.js';

export default function SendMessagePage() {
  const [form, setForm] = useState({
    telefono: '',
    templateName: '',
    languageCode: 'es',
    preview: '',
  });
  const [result, setResult] = useState('');

  async function submit(e) {
    e.preventDefault();
    setResult('');

    try {
      const data = await sendTemplateMessage(form);
      setResult(`Mensaje enviado. ID Meta: ${data.metaMessageId || 'sin ID'}`);
    } catch (error) {
      setResult(error.response?.data?.message || 'No se pudo enviar');
    }
  }

  return (
    <>
      <PageHeader
        title="Enviar mensaje"
        description="Envío mediante plantilla de WhatsApp Cloud API."
      />

      <form className="panel form-stack" onSubmit={submit}>
        <label>Teléfono</label>
        <input
          placeholder="50499999999"
          value={form.telefono}
          onChange={(e) => setForm({...form, telefono: e.target.value})}
          required
        />

        <label>Nombre de plantilla en Meta</label>
        <input
          placeholder="recordatorio_actividad"
          value={form.templateName}
          onChange={(e) => setForm({...form, templateName: e.target.value})}
          required
        />

        <label>Idioma</label>
        <input
          value={form.languageCode}
          onChange={(e) => setForm({...form, languageCode: e.target.value})}
        />

        <label>Vista previa / referencia</label>
        <textarea
          rows="5"
          placeholder="Texto informativo para el historial interno..."
          value={form.preview}
          onChange={(e) => setForm({...form, preview: e.target.value})}
        />

        <button className="btn-primary">Enviar por WhatsApp</button>

        {result && <div className="alert">{result}</div>}
      </form>
    </>
  );
}
