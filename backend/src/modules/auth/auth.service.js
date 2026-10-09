import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  findUserByUsername,
  findUserById,
  touchLastAccess,
  findPasswordHashById,
  updatePasswordById,
  findUserForReset,
  countRecentResetCodes,
  invalidatePendingResetCodes,
  createResetCode,
  findActiveResetCode,
  incrementResetCodeIntentos,
  markResetCodeUsed,
} from './auth.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toWhatsAppPhone } from '../../shared/utils/phone.js';
import { sendTemplateMessage } from '../../infrastructure/whatsapp/whatsapp.client.js';

const RESET_CODE_TTL_MINUTES = 10;
const RESET_MAX_INTENTOS = 5;
const RESET_COOLDOWN_MINUTES = 1;
const RESET_MAX_POR_HORA = 5;

const LOGIN_MAX_INTENTOS = 5;
const LOGIN_BLOQUEO_MINUTOS = 15;

const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// Contador en memoria por IP+usuario. Se reinicia si el proceso se reinicia;
// suficiente para esta app interna, no requiere tabla ni dependencia externa.
const loginAttempts = new Map();

function loginAttemptKey(ip, usuario) {
  return `${ip || 'sin-ip'}:${usuario.toLowerCase()}`;
}

function assertNotLockedOut(key) {
  const entry = loginAttempts.get(key);
  if (!entry?.bloqueadoHasta || entry.bloqueadoHasta <= Date.now()) return;

  const minutosRestantes = Math.ceil((entry.bloqueadoHasta - Date.now()) / 60000);
  throw new AppError(
    `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
    429
  );
}

function registerFailedLoginAttempt(key) {
  const entry = loginAttempts.get(key) || { intentos: 0, bloqueadoHasta: null };
  entry.intentos += 1;

  if (entry.intentos >= LOGIN_MAX_INTENTOS) {
    entry.bloqueadoHasta = Date.now() + LOGIN_BLOQUEO_MINUTOS * 60 * 1000;
    entry.intentos = 0;
  }

  loginAttempts.set(key, entry);
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

function generateResetCode() {
  return String(randomInt(100000, 1000000));
}

function buildOtpComponents(code) {
  const components = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];

  // Meta exige sub_type "url" para el botón de plantillas de autenticación,
  // sea "Copiar código" o "Autocompletar" lo que se ve en la app.
  if (env.meta.otpButtonType !== 'none') {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: code }],
    });
  }

  return components;
}

export async function login(payload, ip) {
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Datos inválidos', 400);
  }
  const { usuario, password } = parsed.data;

  const key = loginAttemptKey(ip, usuario);
  assertNotLockedOut(key);

  const user = await findUserByUsername(usuario);

  if (!user || !user.activo) {
    registerFailedLoginAttempt(key);
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    registerFailedLoginAttempt(key);
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }

  clearLoginAttempts(key);

  const token = jwt.sign(
    {
      sub: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  await touchLastAccess(user.id);

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
    },
  };
}

export async function me(userId) {
  const user = await findUserById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  return {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    rol: user.rol,
  };
}

export async function changeMyPassword(userId, currentPassword, newPassword) {
  const user = await findPasswordHashById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const valid = await bcrypt.compare(currentPassword || '', user.password_hash);
  if (!valid) throw new AppError('La contraseña actual no es correcta', 400);

  if (!newPassword || newPassword.length < 8) {
    throw new AppError('La nueva contraseña debe tener al menos 8 caracteres');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updatePasswordById(userId, passwordHash);

  return { ok: true };
}

const GENERIC_RESET_MESSAGE =
  'Si el usuario existe y tiene un WhatsApp registrado, se envió un código de verificación a ese número.';

export async function forgotPassword(usuario) {
  const user = await findUserForReset(String(usuario || '').trim());
  if (!user) {
    throw new AppError('Usuario no registrado en el sistema', 404);
  }

  if (!user.activo || !user.telefono) {
    return { ok: true, message: GENERIC_RESET_MESSAGE };
  }

  const enCooldown = await countRecentResetCodes(user.id, RESET_COOLDOWN_MINUTES);
  if (enCooldown > 0) {
    return { ok: true, message: GENERIC_RESET_MESSAGE };
  }

  const porHora = await countRecentResetCodes(user.id, 60);
  if (porHora >= RESET_MAX_POR_HORA) {
    return { ok: true, message: GENERIC_RESET_MESSAGE };
  }

  const telefono = toWhatsAppPhone(user.telefono);
  if (!telefono) {
    return { ok: true, message: GENERIC_RESET_MESSAGE };
  }

  const code = generateResetCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await invalidatePendingResetCodes(user.id);
  await createResetCode({ usuarioId: user.id, codeHash, expiresAt });

  try {
    await sendTemplateMessage({
      to: telefono,
      templateName: env.meta.otpTemplateName,
      languageCode: env.meta.otpTemplateLang,
      components: buildOtpComponents(code),
    });
  } catch (error) {
    console.error(`No se pudo enviar el código de recuperación al usuario ${user.usuario}:`, error.message);
  }

  return { ok: true, message: GENERIC_RESET_MESSAGE };
}

export async function resetPasswordWithCode({ usuario, code, newPassword }) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('La nueva contraseña debe tener al menos 8 caracteres');
  }

  const invalidCodeError = new AppError('Código inválido o vencido', 400);

  const user = await findUserForReset(String(usuario || '').trim());
  if (!user || !user.activo) throw invalidCodeError;

  const record = await findActiveResetCode(user.id);
  if (!record) throw invalidCodeError;

  if (record.intentos >= RESET_MAX_INTENTOS) {
    throw new AppError('Se superó el número de intentos permitidos. Solicita un nuevo código.', 400);
  }

  const valid = await bcrypt.compare(String(code || ''), record.code_hash);
  if (!valid) {
    await incrementResetCodeIntentos(record.id);
    throw invalidCodeError;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updatePasswordById(user.id, passwordHash);
  await markResetCodeUsed(record.id);

  return { ok: true };
}
