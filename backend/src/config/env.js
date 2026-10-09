import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar definido en producción (falta variable de entorno)');
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'infop_conecta',
  },

  jwtSecret: process.env.JWT_SECRET || 'cambia-esta-clave',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  meta: {
    graphApiVersion: process.env.META_GRAPH_API_VERSION || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.META_APP_SECRET || '',
    otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'recuperacion_contrasena',
    otpTemplateLang: process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'es',
    // 'none' | 'copy_code' — 'none' si la plantilla no tiene botón; cualquier otro valor
    // agrega el componente de botón (Meta siempre espera sub_type "url" en la API,
    // sin importar si en la plantilla se ve como "Copiar código" o "Autocompletar").
    otpButtonType: process.env.WHATSAPP_OTP_BUTTON_TYPE || 'copy_code',
  },
};
