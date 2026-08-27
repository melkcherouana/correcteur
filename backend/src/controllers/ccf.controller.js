import * as svc from '../services/ccf.service.js';

export const lister = async (req, res, next) => {
  try { res.json(await svc.listerCcfs({ classeId: req.query.classeId })); }
  catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirCcf(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  try {
    res.status(201).json(
      await svc.creerCcf({ ...req.body, createurId: req.utilisateur.id })
    );
  } catch (err) { next(err); }
};

export const modifier = async (req, res, next) => {
  try { res.json(await svc.modifierCcf(req.params.id, req.body, req.utilisateur)); }
  catch (err) { next(err); }
};

export const noter = async (req, res, next) => {
  try {
    const { eleveId, valeur, commentaire } = req.body;
    res.json(await svc.noterEleve(req.params.id, eleveId, { valeur, commentaire }, req.utilisateur));
  } catch (err) { next(err); }
};

export const completion = async (req, res, next) => {
  try { res.json(await svc.statsCompletion(req.params.id)); }
  catch (err) { next(err); }
};
