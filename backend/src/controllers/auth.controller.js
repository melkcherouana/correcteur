import { validationResult } from 'express-validator';
import * as authService from '../services/auth.service.js';

const validerRequete = (req, res) => {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    res.status(422).json({ message: 'Données invalides', erreurs: erreurs.array() });
    return false;
  }
  return true;
};

export const register = async (req, res, next) => {
  if (!validerRequete(req, res)) return;
  try {
    const data = await authService.inscrire(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  if (!validerRequete(req, res)) return;
  try {
    const data = await authService.connecter(req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const reinitialiserMotDePasse = async (req, res, next) => {
  if (!validerRequete(req, res)) return;
  try {
    await authService.reinitialiserMotDePasse(req.body);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const utilisateur = await authService.moi(req.utilisateur.id);
    res.json(utilisateur);
  } catch (err) {
    next(err);
  }
};
