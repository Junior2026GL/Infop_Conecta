import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/auth.service.js';
import { PasswordField } from '../../../components/PasswordField.jsx';
import { IconUser, IconArrowRight, IconCheck, IconCode, IconAlert } from '../../../components/icons.jsx';
import whatsappLogo from '../../../assets/icono_wassp.jpg';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(form);
      localStorage.setItem('infop_conecta_token', data.token);
      localStorage.setItem('infop_conecta_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-box">
        <aside className="login-aside">
          <div className="login-aside-top">
            <span className="login-aside-badge"><img src={whatsappLogo} alt="WhatsApp" className="login-aside-badge-img" /> Plataforma para enviar mensajes de WhatsApp</span>
            <div className="brand large light">INFOP <span>Conecta</span></div>
          </div>

          <div className="login-aside-bottom">
            <p className="login-aside-tagline">
              Plataforma interna para gestionar el envío de mensajes de WhatsApp a
              participantes de los cursos virtuales de INFOP.
            </p>
            <ul className="login-features">
              <li><span className="login-feature-check"><IconCheck width={12} height={12} /></span> Importación de participantes desde Excel</li>
              <li><span className="login-feature-check"><IconCheck width={12} height={12} /></span> Plantillas aprobadas por WhatsApp Cloud API</li>
              <li><span className="login-feature-check"><IconCheck width={12} height={12} /></span> Seguimiento de entregas y lecturas en tiempo real</li>
            </ul>
          </div>

          <span className="login-aside-credit"><IconCode width={14} height={14} /> Plataforma desarrollada por <b>Junior</b></span>
        </aside>

        <div className="login-panel">
          <form className="login-card" onSubmit={submit}>
            <div className="login-card-head">
              <img src={whatsappLogo} alt="WhatsApp" className="login-card-icon-img" />
              <div className="brand large">INFOP <span>Conecta</span></div>
              <p>Ingresa con tu usuario</p>
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
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div className="login-password-group">
              <label>Contraseña</label>
              <PasswordField
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                minLength={0}
              />
              <Link to="/forgot-password" className="login-inline-link">¿Olvidaste tu contraseña?</Link>
            </div>

            <button className="btn-primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'} <IconArrowRight />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
