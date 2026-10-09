export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Entregados/Leídos dependen de los webhooks de Meta (requieren app publicada).
// Actívalo con VITE_SHOW_DELIVERY_STATS=true cuando esos estados lleguen.
export const SHOW_DELIVERY_STATS = import.meta.env.VITE_SHOW_DELIVERY_STATS === 'true';
