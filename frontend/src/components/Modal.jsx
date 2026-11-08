import { useEffect } from 'react';
import { IconClose } from './icons.jsx';

// Cuenta los modales abiertos: mientras haya alguno, la página lleva la clase
// "modal-open" y las animaciones decorativas del fondo se pausan.
let modalesAbiertos = 0;

export default function Modal({ title, subtitle, icon, onClose, children, footer, width = 480 }) {
  useEffect(() => {
    modalesAbiertos += 1;
    document.documentElement.classList.add('modal-open');
    return () => {
      modalesAbiertos -= 1;
      if (modalesAbiertos <= 0) {
        modalesAbiertos = 0;
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: width }}>
        <div className="modal-header">
          <div className="modal-header-text">
            {icon && <span className="modal-header-icon">{icon}</span>}
            <div>
              <h3>{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
