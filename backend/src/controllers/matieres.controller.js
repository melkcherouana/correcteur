import * as svc from '../services/matieres.service.js';

export const lister = async (req, res, next) => {
  try { res.json(await svc.listerMatieres()); }
  catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirMatiere(req.params.id)); }
  catch (err) { next(err); }
};
