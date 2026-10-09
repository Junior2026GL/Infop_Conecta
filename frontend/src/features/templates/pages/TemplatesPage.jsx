import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import WhatsAppPreview from '../../../components/WhatsAppPreview.jsx';
import { IconTemplate } from '../../../components/icons.jsx';
import { listTemplates } from '../services/templates.service.js';

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
