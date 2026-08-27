import { validationResult } from 'express-validator';
import * as svc from '../services/competences.service.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const tableauBord = async (req, res, next) => {
  try {
    const { classeId, matiereId } = req.query;
    if (!classeId || !matiereId) {
      return res.status(400).json({ message: 'classeId et matiereId sont requis' });
    }
    res.json(await svc.tableauBordClasse(classeId, matiereId));
  } catch (err) { next(err); }
};

export const lister = async (req, res, next) => {
  try {
    const { matiereId, page, limite } = req.query;
    res.json(await svc.listerCompetences({
      matiereId,
      page:   page   ? parseInt(page)   : 1,
      limite: limite ? parseInt(limite) : 50,
    }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirCompetence(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await svc.creerCompetence(req.body)); }
  catch (err) { next(err); }
};

export const modifier = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await svc.modifierCompetence(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerCompetence(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const niveauxEleve = async (req, res, next) => {
  try {
    if (req.utilisateur.role === 'ELEVE' && req.utilisateur.id !== req.params.eleveId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(await svc.niveauxEleve(req.params.eleveId));
  } catch (err) { next(err); }
};

export const mettreAJourNiveau = async (req, res, next) => {
  if (!valider(req, res)) return;
  try {
    const { eleveId, competenceId } = req.params;
    res.json(await svc.mettreAJourNiveau(eleveId, competenceId, req.body.niveau));
  } catch (err) { next(err); }
};
