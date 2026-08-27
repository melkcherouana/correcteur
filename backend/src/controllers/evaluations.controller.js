import { validationResult } from 'express-validator';
import * as svc from '../services/evaluations.service.js';
import * as notesSvc from '../services/notes.service.js';
import prisma from '../utils/prisma.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const lister = async (req, res, next) => {
  try {
    const { classeId, sequenceId, type, statut, createurId, page, limite } = req.query;

    // Un élève ne voit que les évaluations de sa propre classe
    let effectiveClasseId = classeId;
    if (req.utilisateur.role === 'ELEVE' && !classeId) {
      const ce = await prisma.classeEleve.findUnique({
        where: { eleveId: req.utilisateur.id },
        select: { classeId: true },
      });
      effectiveClasseId = ce?.classeId;
    }

    // Un enseignant ne voit par défaut que ses propres évaluations — l'app
    // n'a pas de notion d'affectation enseignant↔classe, sans ce filtre il
    // verrait le travail de tous les enseignants de l'établissement mélangé.
    // L'admin garde une vue complète (aucun filtre appliqué).
    const effectiveCreateurId =
      req.utilisateur.role === 'ENSEIGNANT' && !createurId ? req.utilisateur.id : createurId;

    res.json(await svc.listerEvaluations({
      classeId: effectiveClasseId, sequenceId, type, statut, createurId: effectiveCreateurId,
      eleveId: req.utilisateur.role === 'ELEVE' ? req.utilisateur.id : undefined,
      page:   page   ? parseInt(page)   : 1,
      limite: limite ? parseInt(limite) : 20,
    }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try { res.json(await svc.obtenirEvaluation(req.params.id, req.utilisateur)); }
  catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await svc.creerEvaluation(req.body, req.utilisateur.id)); }
  catch (err) { next(err); }
};

export const mettreAJour = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await svc.mettreAJourEvaluation(req.params.id, req.body, req.utilisateur)); }
  catch (err) { next(err); }
};

export const changerStatut = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.json(await svc.changerStatut(req.params.id, req.body.statut, req.utilisateur)); }
  catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerEvaluation(req.params.id, req.utilisateur);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const obtenirNotes = async (req, res, next) => {
  try { res.json(await svc.obtenirNotesEvaluation(req.params.id, req.utilisateur)); }
  catch (err) { next(err); }
};

// ─── Sujet / Énoncé ──────────────────────────────────────────────────────────

export const infoSujet = async (req, res, next) => {
  try {
    const e = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      select: { sujetNom: true, sujetType: true, sujetTaille: true },
    });
    if (!e) return res.status(404).json({ message: 'Évaluation introuvable' });
    res.json(e.sujetNom ? { nom: e.sujetNom, type: e.sujetType, taille: e.sujetTaille } : null);
  } catch (err) { next(err); }
};

export const deposerSujet = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier requis' });
    const e = await prisma.evaluation.update({
      where: { id: req.params.id },
      data: {
        sujetNom:    req.file.originalname,
        sujetType:   req.file.mimetype,
        sujetData:   req.file.buffer,
        sujetTaille: req.file.size,
      },
      select: { sujetNom: true, sujetType: true, sujetTaille: true },
    });
    res.json({ nom: e.sujetNom, type: e.sujetType, taille: e.sujetTaille });
  } catch (err) { next(err); }
};

export const telechargerSujet = async (req, res, next) => {
  try {
    const e = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      select: { sujetNom: true, sujetType: true, sujetData: true, sujetTaille: true },
    });
    if (!e?.sujetData) return res.status(404).json({ message: 'Aucun énoncé disponible' });
    // filename= (repli ASCII) + filename*= (RFC 6266) — cf. soumissions.controller.js
    const nomAscii = e.sujetNom.replace(/[^\x20-\x7E]/g, '_');
    res.set({
      'Content-Type': e.sujetType,
      'Content-Disposition': `attachment; filename="${nomAscii}"; filename*=UTF-8''${encodeURIComponent(e.sujetNom)}`,
      'Content-Length': e.sujetTaille,
    });
    res.send(e.sujetData);
  } catch (err) { next(err); }
};

export const supprimerSujet = async (req, res, next) => {
  try {
    await prisma.evaluation.update({
      where: { id: req.params.id },
      data: { sujetNom: null, sujetType: null, sujetData: null, sujetTaille: null },
    });
    res.status(204).end();
  } catch (err) { next(err); }
};

export const saisirNotes = async (req, res, next) => {
  if (!valider(req, res)) return;
  try {
    await notesSvc.saisirNotesBulk(req.params.id, req.body.notes, req.utilisateur.id);
    // Retourner la grille complète mise à jour
    res.json(await svc.obtenirNotesEvaluation(req.params.id));
  } catch (err) { next(err); }
};
