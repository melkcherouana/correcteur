import { validationResult } from 'express-validator';
import * as usersService from '../services/users.service.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const lister = async (req, res, next) => {
  try {
    const { role, actif, search, page, limite } = req.query;
    const estAdmin = req.utilisateur?.role === 'ADMIN';
    const data = await usersService.listerUtilisateurs({
      role,
      // Un enseignant ne voit que les comptes actifs, quoi qu'il demande —
      // seul l'admin peut consulter les comptes désactivés.
      actif: estAdmin ? (actif !== undefined ? actif === 'true' : undefined) : true,
      search,
      page: page ? parseInt(page) : 1,
      limite: limite ? parseInt(limite) : 20,
    });
    res.json(data);
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await usersService.obtenirUtilisateur(req.params.id)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await usersService.creerUtilisateur(req.body)); }
  catch (err) { next(err); }
};

export const mettreAJour = async (req, res, next) => {
  if (!valider(req, res)) return;
  const parAdmin = req.utilisateur?.role === 'ADMIN';
  if (!parAdmin && req.utilisateur?.id !== req.params.id) {
    return res.status(403).json({ message: 'Vous ne pouvez modifier que votre propre profil' });
  }
  try {
    res.json(await usersService.mettreAJourUtilisateur(req.params.id, req.body, parAdmin));
  } catch (err) { next(err); }
};

export const changerClasse = async (req, res, next) => {
  try {
    const { classeId } = req.body;
    res.json(await usersService.changerClasse(req.params.id, classeId ?? null));
  } catch (err) { next(err); }
};

export const changerRole = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await usersService.changerRole(req.params.id, req.body.role)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await usersService.supprimerUtilisateur(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const reactiver = async (req, res, next) => {
  try {
    await usersService.reactiverUtilisateur(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const genererLienReset = async (req, res, next) => {
  try {
    const token = await usersService.genererLienReset(req.params.id);
    res.json({ token });
  } catch (err) { next(err); }
};

export const supprimerDefinitivement = async (req, res, next) => {
  try {
    await usersService.supprimerDefinitivement(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const importerEnMasse = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier Excel requis (.xlsx)' });
    const resultat = await usersService.importerEnMasse(req.file.buffer);
    res.json(resultat);
  } catch (err) { next(err); }
};

export const modeleExcel = async (req, res, next) => {
  try {
    const buffer = usersService.genererModeleExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele_utilisateurs.xlsx"');
    res.send(buffer);
  } catch (err) { next(err); }
};
