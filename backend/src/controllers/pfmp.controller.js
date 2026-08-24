import * as svc from '../services/pfmp.service.js';

export const lister = async (req, res, next) => {
  try {
    const { eleveId, classeId, statut } = req.query;
    res.json(await svc.listerPfmps({ eleveId, classeId, statut }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirPfmp(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  try { res.status(201).json(await svc.creerPfmp(req.body)); }
  catch (err) { next(err); }
};

export const modifier = async (req, res, next) => {
  try { res.json(await svc.modifierPfmp(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const evaluerCompetences = async (req, res, next) => {
  try {
    const { competencesEvaluees } = req.body;
    res.json(await svc.evaluerCompetences(req.params.id, competencesEvaluees));
  } catch (err) { next(err); }
};

export const valider = async (req, res, next) => {
  try { res.json(await svc.validerPfmp(req.params.id)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerPfmp(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const competencesDispo = async (req, res, next) => {
  try { res.json(await svc.competencesPourPfmp(req.params.classeId)); }
  catch (err) { next(err); }
};
