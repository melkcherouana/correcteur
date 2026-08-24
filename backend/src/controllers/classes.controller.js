import { validationResult } from 'express-validator';
import * as classesService from '../services/classes.service.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const lister = async (req, res, next) => {
  try {
    const { filiereId, actif, search } = req.query;
    res.json(await classesService.listerClasses({
      filiereId,
      actif: actif !== undefined ? actif === 'true' : undefined,
      search,
    }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await classesService.obtenirClasse(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await classesService.creerClasse(req.body)); }
  catch (err) { next(err); }
};

export const mettreAJour = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await classesService.mettreAJourClasse(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await classesService.supprimerClasse(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const synthese = async (req, res, next) => {
  try { res.json(await classesService.syntheseClasse(req.params.id)); }
  catch (err) { next(err); }
};
