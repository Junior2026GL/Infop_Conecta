# INFOP Conecta

Plataforma web para gestionar participantes, cursos y envío de mensajes de WhatsApp mediante la API oficial de Meta.

## Estructura

- `backend/`: Node.js + Express + MySQL
- `frontend/`: React + Vite
- `docs/`: documentación funcional y técnica

## Requisitos

- Node.js 20+
- MySQL 8+
- Cuenta Meta for Developers con WhatsApp Cloud API configurada

## Puesta en marcha

### 1. Base de datos
Crea una base de datos MySQL y ejecuta:

```sql
backend/src/infrastructure/database/migrations/001_initial.sql
```

Luego, opcionalmente:

```sql
backend/src/infrastructure/database/seeds/001_seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Completa las variables de `.env`, especialmente las de MySQL y Meta.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Módulos iniciales

- Login y autenticación JWT
- Dashboard
- Participantes
- Cursos
- Plantillas de mensajes
- Envío individual por WhatsApp
- Historial de mensajes
- Webhook de Meta
- Usuarios
- Auditoría
- Configuración

## Importante

Nunca coloques el token de Meta en el frontend. Las llamadas hacia WhatsApp Cloud API deben salir exclusivamente desde el backend.
