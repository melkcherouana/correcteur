import * as svc from '../services/absences.service.js';

export const lister = async (req, res, next) => {
  try {
    const { classeId, dateDebut, dateFin, justifiee, type } = req.query;
    // Un élève ne peut voir que ses propres absences, quel que soit le eleveId demandé
    const eleveId = req.utilisateur.role === 'ELEVE' ? req.utilisateur.id : req.query.eleveId;
    res.json(await svc.listerAbsences({ eleveId, classeId, dateDebut, dateFin, justifiee, type }));
  } catch (err) { next(err); }
};

export const obtenir = async (req, res, next) => {
  try {
    const absence = await svc.obtenirAbsence(req.params.id);
    if (req.utilisateur.role === 'ELEVE' && absence.eleveId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(absence);
  } catch (err) { next(err); }
};

export const creer = async (req, res, next) => {
  try { res.status(201).json(await svc.creerAbsence(req.body, req.utilisateur.id)); }
  catch (err) { next(err); }
};

export const creerBulk = async (req, res, next) => {
  try {
    const { absences } = req.body;
    if (!Array.isArray(absences) || absences.length === 0)
      return res.status(400).json({ message: 'absences[] requis' });
    res.status(201).json(await svc.creerAbsencesBulk(absences, req.utilisateur.id));
  } catch (err) { next(err); }
};

export const modifier = async (req, res, next) => {
  try {
    const { utilisateur } = req;
    // Un élève ne peut pas modifier ses propres absences
    if (utilisateur.role === 'ELEVE')
      return res.status(403).json({ message: 'Accès refusé' });
    res.json(await svc.modifierAbsence(req.params.id, req.body));
  } catch (err) { next(err); }
};

export const supprimer = async (req, res, next) => {
  try {
    await svc.supprimerAbsence(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

export const statsEleve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { utilisateur } = req;
    if (utilisateur.role === 'ELEVE' && utilisateur.id !== id)
      return res.status(403).json({ message: 'Accès refusé' });
    res.json(await svc.statsEleve(id, req.query));
  } catch (err) { next(err); }
};

export const statsClasse = async (req, res, next) => {
  try {
    res.json(await svc.statsClasse(req.params.classeId, req.query));
  } catch (err) { next(err); }
};

export const exportCsv = async (req, res, next) => {
  try {
    const csv = await svc.exporterCsvAbsences(req.query);
    const nom = `absences_${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nom}"` });
    res.send('﻿' + csv);
  } catch (err) { next(err); }
};

export const elevesClasse = async (req, res, next) => {
  try { res.json(await svc.elevesClasse(req.params.classeId)); }
  catch (err) { next(err); }
};
