import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const INCLUDE_BASE = {
  eleve:     { select: { id: true, prenom: true, nom: true } },
  enseignant:{ select: { id: true, prenom: true, nom: true } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildWhere = ({ eleveId, eleveIds, dateDebut, dateFin, justifiee, type }) => {
  const where = {};
  if (eleveId)   where.eleveId = eleveId;
  if (eleveIds)  where.eleveId = { in: eleveIds };
  if (type)      where.type = type;
  if (justifiee !== undefined && justifiee !== '') where.justifiee = justifiee === 'true' || justifiee === true;
  if (dateDebut || dateFin) {
    where.date = {};
    if (dateDebut) where.date.gte = new Date(dateDebut);
    if (dateFin)   where.date.lte = new Date(dateFin + 'T23:59:59');
  }
  return where;
};

const elevesDeClasse = (classeId) =>
  prisma.classeEleve.findMany({
    where: { classeId },
    include: { eleve: { select: { id: true, prenom: true, nom: true } } },
    orderBy: { eleve: { nom: 'asc' } },
  });

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const listerAbsences = async (filtres = {}) => {
  let eleveIds;
  if (filtres.classeId && !filtres.eleveId) {
    const membres = await elevesDeClasse(filtres.classeId);
    eleveIds = membres.map((m) => m.eleveId);
  }
  const where = buildWhere({ ...filtres, eleveIds });
  return prisma.absence.findMany({
    where,
    include: INCLUDE_BASE,
    orderBy: [{ date: 'desc' }, { heureDebut: 'asc' }],
  });
};

export const obtenirAbsence = async (id) => {
  const a = await prisma.absence.findUnique({ where: { id }, include: INCLUDE_BASE });
  if (!a) throw erreur('Absence introuvable', 404);
  return a;
};

// ─── Saisie unique ────────────────────────────────────────────────────────────

export const creerAbsence = (data, enseignantId) =>
  prisma.absence.create({
    data: {
      ...data,
      enseignantId,
      date: new Date(data.date),
      dureeHeures: data.dureeHeures ?? 1,
    },
    include: INCLUDE_BASE,
  });

// ─── Saisie en masse (une classe, une séance) ─────────────────────────────────

export const creerAbsencesBulk = async (absences, enseignantId) => {
  const lignes = absences.map((a) => ({
    ...a,
    enseignantId,
    date: new Date(a.date),
    dureeHeures: a.dureeHeures ?? 1,
  }));
  await prisma.absence.createMany({ data: lignes, skipDuplicates: false });
  return { creees: lignes.length };
};

// ─── Modification (justification, motif, commentaire) ────────────────────────

export const modifierAbsence = async (id, data) => {
  await obtenirAbsence(id);
  const champs = {};
  const scalaires = ['motif', 'justifiee', 'justificatif', 'commentaire', 'heureDebut', 'heureFin', 'dureeHeures', 'type'];
  for (const k of scalaires) {
    if (data[k] !== undefined) champs[k] = data[k];
  }
  return prisma.absence.update({ where: { id }, data: champs, include: INCLUDE_BASE });
};

// ─── Suppression ─────────────────────────────────────────────────────────────

export const supprimerAbsence = async (id) => {
  await obtenirAbsence(id);
  await prisma.absence.delete({ where: { id } });
};

// ─── Statistiques d'un élève ──────────────────────────────────────────────────

export const statsEleve = async (eleveId, { dateDebut, dateFin } = {}) => {
  const where = buildWhere({ eleveId, dateDebut, dateFin });
  const absences = await prisma.absence.findMany({ where, orderBy: { date: 'asc' } });

  const totalHeures    = absences.reduce((s, a) => s + (a.dureeHeures ?? 0), 0);
  const justifiees     = absences.filter((a) => a.justifiee).length;
  const nonJustifiees  = absences.length - justifiees;
  const retards        = absences.filter((a) => a.type === 'RETARD').length;
  const absencesSeules = absences.filter((a) => a.type === 'ABSENCE').length;

  // Agréger par mois
  const mapMois = {};
  for (const a of absences) {
    const d = new Date(a.date);
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!mapMois[cle]) mapMois[cle] = { mois: cle, heures: 0, count: 0 };
    mapMois[cle].heures += a.dureeHeures ?? 0;
    mapMois[cle].count++;
  }

  return {
    totalAbsences: absences.length,
    totalHeures:   Math.round(totalHeures * 10) / 10,
    justifiees,
    nonJustifiees,
    retards,
    absencesSeules,
    tauxJustification: absences.length > 0 ? Math.round((justifiees / absences.length) * 100) : 100,
    parMois: Object.values(mapMois),
    dernieresAbsences: absences.slice(-5).reverse(),
  };
};

// ─── Statistiques de classe ───────────────────────────────────────────────────

export const statsClasse = async (classeId, { dateDebut, dateFin } = {}) => {
  const membres = await elevesDeClasse(classeId);
  if (!membres.length) return [];

  const eleveIds = membres.map((m) => m.eleveId);
  const where = buildWhere({ eleveIds, dateDebut, dateFin });
  const absences = await prisma.absence.findMany({ where });

  const index = {};
  for (const { eleve } of membres) {
    index[eleve.id] = { eleve, totalAbsences: 0, totalHeures: 0, justifiees: 0, nonJustifiees: 0, retards: 0 };
  }
  for (const a of absences) {
    const s = index[a.eleveId];
    if (!s) continue;
    s.totalAbsences++;
    s.totalHeures += a.dureeHeures ?? 0;
    if (a.justifiee) s.justifiees++;
    else             s.nonJustifiees++;
    if (a.type === 'RETARD') s.retards++;
  }

  return Object.values(index)
    .map((s) => ({ ...s, totalHeures: Math.round(s.totalHeures * 10) / 10 }))
    .sort((a, b) => b.totalHeures - a.totalHeures);
};

// ─── Export CSV ───────────────────────────────────────────────────────────────

const cellCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const TYPE_LABEL = { ABSENCE: 'Absence', RETARD: 'Retard', EXCLUSION: 'Exclusion' };

export const exporterCsvAbsences = async (filtres = {}) => {
  const absences = await listerAbsences(filtres);
  const entete = ['Date', 'Élève', 'Type', 'Durée (h)', 'Heure début', 'Heure fin', 'Motif', 'Justifiée', 'Justificatif', 'Commentaire', 'Saisi par'];
  const lignes = absences.map((a) => [
    new Date(a.date).toLocaleDateString('fr-FR'),
    `${a.eleve.nom} ${a.eleve.prenom}`,
    TYPE_LABEL[a.type] ?? a.type,
    a.dureeHeures,
    a.heureDebut ?? '',
    a.heureFin   ?? '',
    a.motif      ?? '',
    a.justifiee ? 'Oui' : 'Non',
    a.justificatif ?? '',
    a.commentaire  ?? '',
    a.enseignant ? `${a.enseignant.nom} ${a.enseignant.prenom}` : '',
  ]);
  return [entete, ...lignes].map((r) => r.map(cellCsv).join(',')).join('\r\n');
};

// ─── Élèves d'une classe (pour la saisie) ─────────────────────────────────────

export const elevesClasse = (classeId) => elevesDeClasse(classeId);
