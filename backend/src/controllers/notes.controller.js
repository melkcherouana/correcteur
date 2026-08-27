import { validationResult } from 'express-validator';
import * as svc from '../services/notes.service.js';

const valider = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ message: 'Données invalides', erreurs: e.array() }); return false; }
  return true;
};

export const lister = async (req, res, next) => {
  try {
    const { evaluationId, page, limite } = req.query;
    // Un élève ne peut voir que ses propres notes, quel que soit le eleveId demandé
    const eleveId = req.utilisateur.role === 'ELEVE' ? req.utilisateur.id : req.query.eleveId;
    res.json(await svc.listerNotes({
      eleveId, evaluationId,
      page:   page   ? parseInt(page)   : 1,
      limite: limite ? parseInt(limite) : 50,
    }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try {
    const note = await svc.obtenirNote(req.params.id);
    if (req.utilisateur.role === 'ELEVE' && note.eleve.id !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(note);
  } catch (err) { next(err); }
};

export const saisirBulk = async (req, res, next) => {
  if (!valider(req, res)) return;
  try {
    res.json(await svc.saisirNotesBulk(req.params.evaluationId, req.body.notes, req.utilisateur.id));
  } catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  if (!valider(req, res)) return;
  try { res.status(201).json(await svc.creerNote(req.body)); }
  catch (err) { next(err); }
};

export const corriger = async (req, res, next) => {
  if (!valider(req, res)) return;
  try {
    res.json(await svc.corrigerNote(req.params.id, req.body, req.utilisateur.id));
  } catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerNote(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const exportCsv = async (req, res, next) => {
  try {
    const { eleveId, evaluationId, classeId } = req.query;
    const csv = await svc.exporterCsv({ eleveId, evaluationId, classeId });
    const nom = `notes_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nom}"`,
    });
    res.send('﻿' + csv); // BOM UTF-8 pour Excel
  } catch (err) { next(err); }
};
