# Arquitectura de INFOP Conecta

## Backend
Patrón por módulo:

`routes -> controller -> service -> repository -> database`

## Frontend
Organización por funcionalidades:

`features/<modulo>/pages`, `features/<modulo>/components`, `features/<modulo>/services`

## Flujo de WhatsApp

React -> Backend Node/Express -> WhatsApp Cloud API -> Participante

Los estados de Meta regresan por webhook:

Meta -> `/api/webhooks/whatsapp` -> MySQL -> Dashboard/Historial
