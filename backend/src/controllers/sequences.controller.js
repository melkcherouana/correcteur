import * as svc from '../services/sequences.service.js';

export const lister = async (req, res, next) => {
  try {
    res.json(await svc.listerSequences({ matiereId: req.query.matiereId }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirSequence(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  try { res.status(201).json(await svc.creerSequence(req.body)); }
  catch (err) { next(err); }
};

export const modifier = async (req, res, next) => {
  try { res.json(await svc.modifierSequence(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerSequence(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const reordonner = async (req, res, next) => {
  try {
    const { items } = req.body; // [{ id, ordre }]
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'items requis' });
    await svc.reordonner(items);
    res.status(204).end();
  } catch (err) { next(err); }
};
