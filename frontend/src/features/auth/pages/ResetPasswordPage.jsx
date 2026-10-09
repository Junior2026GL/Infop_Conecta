import { useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../services/auth.service.js';
import { PasswordField, PasswordStrengthMeter } from '../../../components/PasswordField.jsx';
import { IconUser, IconKey, IconCheck, IconArrowRight, IconCode, IconAlert } from '../../../components/icons.jsx';

const CODE_LENGTH = 6;

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

function OtpInput({ value, onChange }) {
  const inputsRef = useRef([]);
  const digits = value.split('').concat(Array(CODE_LENGTH).fill('')).slice(0, CODE_LENGTH);

  function setDigit(index, char) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join(''));
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    const chars = raw.split('');
    const next = digits.slice();
    let i = index;
    for (const ch of chars) {
      if (i >= CODE_LENGTH) break;
      next[i] = ch;
      i += 1;
    }
    onChange(next.join(''));
    const focusIndex = Math.min(i, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!text) return;
    onChange(text.padEnd(CODE_LENGTH, '').slice(0, CODE_LENGTH).replace(/ /g, ''));
    const focusIndex = Math.min(text.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className="otp-inputs">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={CODE_LENGTH}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usuario, setUsuario] = useState(searchParams.get('usuario') || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (code.length !== CODE_LENGTH) {
      setError('Ingresa el código completo de 6 dígitos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ usuario: usuario.trim(), code, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-box">
        <aside className="login-aside">
          <div className="login-aside-top">
            <span className="login-aside-badge"><IconKey width={14} height={14} /> Código de verificación</span>
            <div className="brand large light">INFOP <span>Conecta</span></div>
          </div>

          <div className="login-aside-bottom">
            <p className="login-aside-tagline">
              Ingresa el código de 6 dígitos que recibiste por WhatsApp junto con
              tu nueva contraseña.
            </p>
          </div>

          <span className="login-aside-credit"><IconCode width={14} height={14} /> Plataforma desarrollada por <b>Junior</b></span>
        </aside>

        <div className="login-panel">
          {success ? (
            <div className="login-card">
              <div className="auth-success">
                <span className="auth-success-icon"><IconCheck width={26} height={26} /></span>
                <div className="brand large">Contraseña actualizada</div>
                <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                  Ir a iniciar sesión <IconArrowRight />
                </button>
              </div>
            </div>
          ) : (
            <form className="login-card" onSubmit={submit}>
              <Stepper step={2} />

              <div className="login-card-head">
                <span className="login-card-icon"><IconKey width={24} height={24} /></span>
                <div className="brand large">Restablecer contraseña</div>
                <p>Escribe el código que te llegó por WhatsApp y tu nueva contraseña</p>
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
                  required
                />
              </div>

              <label>Código de 6 dígitos</label>
              <OtpInput value={code} onChange={setCode} />

              <label>Nueva contraseña</label>
              <PasswordField
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <PasswordStrengthMeter value={newPassword} />

              <label>Confirmar contraseña</label>
              <PasswordField
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button className="btn-primary" disabled={loading}>
                {loading ? 'Actualizando...' : 'Restablecer contraseña'} <IconArrowRight />
              </button>

              <Link to="/forgot-password" className="login-back-link">Solicitar un nuevo código</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
