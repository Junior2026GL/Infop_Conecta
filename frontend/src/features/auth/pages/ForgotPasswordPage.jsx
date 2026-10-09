import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service.js';
import { IconUser, IconMessageCircle, IconCheck, IconArrowRight, IconCode, IconAlert } from '../../../components/icons.jsx';
import whatsappLogo from '../../../assets/icono_wassp.jpg';

function Stepper({ step }) {
  return (
    <div className="auth-steps">
      <div className={`auth-step ${step === 1 ? 'active' : 'done'}`}>
        <span className="auth-step-dot">{step === 1 ? '1' : <IconCheck width={12} height={12} />}</span>
        Solicitar código
      </div>
      <span className="auth-step-line" />
      <div className={`auth-step ${step === 2 ? 'active' : ''}`}>
        <span className="auth-step-dot">2</span>
        Restablecer
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await forgotPassword(usuario.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-box">
        <aside className="login-aside">
          <div className="login-aside-top">
            <span className="login-aside-badge"><IconMessageCircle width={14} height={14} /> Recuperación por WhatsApp</span>
            <div className="brand large light">INFOP <span>Conecta</span></div>
          </div>

          <div className="login-aside-bottom">
            <p className="login-aside-tagline">
              Te enviaremos un código de verificación por WhatsApp al número
              registrado en tu cuenta para que puedas recuperar el acceso.
            </p>
          </div>

          <span className="login-aside-credit"><IconCode width={14} height={14} /> Plataforma desarrollada por <b>Junior</b></span>
        </aside>

        <div className="login-panel">
          {sent ? (
            <div className="login-card">
              <div className="auth-success">
                <span className="auth-success-icon"><IconCheck width={26} height={26} /></span>
                <div className="brand large">Revisa tu WhatsApp</div>
                <p>
                  Si el usuario <b>{usuario.trim()}</b> existe y tiene un número registrado,
                  le llegó un código de 6 dígitos válido por 10 minutos.
                </p>
                <Link
                  to={`/reset-password?usuario=${encodeURIComponent(usuario.trim())}`}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Ya tengo el código <IconArrowRight />
                </Link>
                <Link to="/login" className="login-back-link">Volver a iniciar sesión</Link>
              </div>
            </div>
          ) : (
            <form className="login-card" onSubmit={submit}>
              <Stepper step={1} />

              <div className="login-card-head">
                <img src={whatsappLogo} alt="WhatsApp" className="login-card-icon-img" />
                <div className="brand large">¿Olvidaste tu contraseña?</div>
                <p>Ingresa tu usuario y te enviaremos un código por WhatsApp</p>
              </div>

              {error && (
                <div className="alert error">
                  <IconAlert width={17} height={17} />
                  <span>{error}</span>
                </div>
              )}

              <label>Usuario</label>
              <div className="input-icon">
                <IconUser />
                <input
                  type="text"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button className="btn-primary" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar código por WhatsApp'} <IconArrowRight />
              </button>

              <Link to="/login" className="login-back-link">Volver a iniciar sesión</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
