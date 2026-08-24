import * as notifsService from '../services/notifications.service.js';

const rep = (res, fn) => fn.then((data) => res.json(data)).catch((err) => {
  res.status(err.status || 500).json({ message: err.message });
});

export const lister = (req, res) => {
  const { lue, page, limite } = req.query;
  rep(res, notifsService.listerNotifications(req.utilisateur.id, { lue, page: +page || 1, limite: +limite || 20 }));
};

export const compterNonLues = (req, res) =>
  rep(res, notifsService.compterNonLues(req.utilisateur.id).then((count) => ({ count })));

export const marquerLue = (req, res) =>
  rep(res, notifsService.marquerLue(req.params.id, req.utilisateur.id));

export const marquerToutesLues = (req, res) =>
  rep(res, notifsService.marquerToutesLues(req.utilisateur.id));

export const supprimer = (req, res) =>
  rep(res, notifsService.supprimerNotification(req.params.id, req.utilisateur.id).then(() => ({ ok: true })));
