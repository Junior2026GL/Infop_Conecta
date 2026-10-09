import * as service from './campaigns.service.js';
import { record as recordAudit } from '../audit/audit.service.js';

export async function list(req, res, next) {
  try {
    res.json({ ok: true, data: await service.list(req.user) });
  } catch (error) {
    next(error);
  }
}

export function downloadTemplate(req, res, next) {
  try {
    const buffer = service.buildParticipantsTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-participantes.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getById(req.params.id, req.user) });
  } catch (error) {
    next(error);
  }
}

export async function reportUsuarios(req, res, next) {
  try {
    res.json({ ok: true, data: await service.reportUsuarios() });
  } catch (error) {
    next(error);
  }
}

export async function importFile(req, res, next) {
  try {
    let valoresFijos = {};
    if (req.body.valoresFijos) {
      try {
        valoresFijos = JSON.parse(req.body.valoresFijos);
      } catch {
        valoresFijos = {};
      }
    }

    const data = await service.importFile(
      {
        file: req.file,
        plantillaId: req.body.plantillaId,
        nombre: req.body.nombre,
        curso: req.body.curso,
        valoresFijos,
      },
      req.user.sub
    );

    await recordAudit(req, {
      accion: 'CREAR',
      modulo: 'CAMPANAS',
      descripcion: `Campaña creada: ${data.nombre} (${data.total_registros} registros)`,
    });

    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function removeDestinatario(req, res, next) {
  try {
    const data = await service.removeDestinatario(req.params.id, req.params.destinatarioId, req.user);
    await recordAudit(req, {
      accion: 'ACTUALIZAR',
      modulo: 'CAMPANAS',
      descripcion: `Destinatario #${req.params.destinatarioId} eliminado de la campaña #${req.params.id}`,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateDestinatario(req, res, next) {
  try {
    const data = await service.updateDestinatario(req.params.id, req.params.destinatarioId, req.body, req.user);
    await recordAudit(req, {
      accion: 'ACTUALIZAR',
      modulo: 'CAMPANAS',
      descripcion: `Destinatario #${req.params.destinatarioId} actualizado en la campaña #${req.params.id}`,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function addDestinatario(req, res, next) {
  try {
    const data = await service.addDestinatario(req.params.id, req.body, req.user);
    await recordAudit(req, {
      accion: 'CREAR',
      modulo: 'CAMPANAS',
      descripcion: `Destinatario agregado manualmente a la campaña #${req.params.id}`,
    });
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function retryFailed(req, res, next) {
  try {
    const data = await service.retryFailed(req.params.id, req.user);
    await recordAudit(req, {
      accion: 'ACTUALIZAR',
      modulo: 'CAMPANAS',
      descripcion: `Campaña #${req.params.id} reabierta para reenviar mensajes fallidos o pendientes`,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function send(req, res, next) {
  try {
    const data = await service.send(req.params.id, req.user.sub, req.user);
    await recordAudit(req, {
      accion: 'ENVIO',
      modulo: 'CAMPANAS',
      descripcion: `Envío de campaña #${req.params.id} iniciado`,
    });
    res.status(202).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
