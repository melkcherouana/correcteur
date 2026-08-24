import { validationResult } from 'express-validator';
import * as anneesService from '../services/annees.service.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const lister = async (req, res, next) => {
  try { res.json(await anneesService.listerAnnees()); }
  catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await anneesService.obtenirAnnee(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await anneesService.creerAnnee(req.body)); }
  catch (err) { next(err); }
};

export const mettreAJour = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await anneesService.mettreAJourAnnee(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await anneesService.supprimerAnnee(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const changerAnnee = async (req, res, next) => {
  try { res.json(await anneesService.changerAnnee(req.params.id)); }
  catch (err) { next(err); }
};
