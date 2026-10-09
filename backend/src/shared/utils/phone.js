export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

// Honduras: acepta 8 dígitos locales o 11 dígitos ya con código de país 504.
export function toWhatsAppPhone(phone) {
  const digits = normalizePhone(phone);

  if (digits.length === 8) return `504${digits}`;
  if (digits.length === 11 && digits.startsWith('504')) return digits;

  return null;
}
