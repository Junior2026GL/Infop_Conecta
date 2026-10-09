import * as service from './webhooks.service.js';

export function verify(req, res) {
  const challenge = service.verifyWebhook({
    mode: req.query['hub.mode'],
    token: req.query['hub.verify_token'],
    challenge: req.query['hub.challenge'],
  });

  if (challenge) return res.status(200).send(challenge);
  return res.sendStatus(403);
}

export async function receive(req, res, next) {
  try {
    await service.processWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
}
