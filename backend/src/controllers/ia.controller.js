import * as ia from '../services/ia.service.js';
import { genererPdfScenario } from '../services/scenario-pdf.service.js';
import { genererPdfDocumentsCommerciaux } from '../services/documents-pdf.service.js';
import { genererPdfDossier } from '../services/dossier-pdf.service.js';
import { genererDocxDossier } from '../services/dossier-docx.service.js';
import prisma from '../utils/prisma.js';
import { creerNotification } from '../services/notifications.service.js';

// ─── 1. Extraction de compétences depuis un PDF ───────────────────────────────

export const extraireCompetences = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier PDF requis' });
    const resultat = await ia.extraireCompetencesPDF(req.file.buffer);
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 2. Correction automatique d'un devoir ───────────────────────────────────

export const corrigerDevoir = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier devoir requis' });

    let grille;
    try {
      grille = JSON.parse(req.body.grille);
    } catch {
      return res.status(400).json({ message: 'Le champ "grille" doit être un JSON valide' });
    }

    if (!grille?.criteres?.length) {
      return res.status(400).json({ message: 'La grille doit contenir au moins un critère' });
    }

    const resultat = await ia.corrigerDevoir(req.file.buffer, req.file.mimetype, grille);
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 3. Questions d'entretien ─────────────────────────────────────────────────

export const questionsEntretien = async (req, res, next) => {
  try {
    const { contenuTravail, contexte } = req.body;
    if (!contenuTravail?.trim()) {
      return res.status(400).json({ message: 'Le contenu du travail est requis' });
    }
    const resultat = await ia.genererQuestionsEntretien({ contenuTravail, contexte });
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 4. Scénario professionnel ────────────────────────────────────────────────

export const scenarioProfessionnel = async (req, res, next) => {
  try {
    const { filiere, matiere, niveau, competenceIds, dureeMinutes, contexteEntreprise } = req.body;

    if (!filiere?.trim() && !competenceIds?.length) {
      return res.status(400).json({ message: 'filiere ou competenceIds sont requis' });
    }

    // Charger les compétences depuis la base si des IDs sont fournis
    const competences = await prisma.competence.findMany({
      where: { id: { in: competenceIds } },
      select: { id: true, code: true, description: true },
    });

    const resultat = await ia.genererScenarioProfessionnel({
      filiere, matiere, niveau, competences, dureeMinutes, contexteEntreprise,
    });
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 4b. PDF scénario professionnel ──────────────────────────────────────────

export const scenarioProfessionnelPdf = async (req, res, next) => {
  try {
    const { scenario } = req.body;
    if (!scenario) return res.status(400).json({ message: 'scenario requis dans le body' });

    const pdfBuffer = await genererPdfScenario(scenario);
    const nomFichier = `situation-pro-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// ─── 5. Dossier complet (situation pro + documents + annexes) ────────────────

export const dossierComplet = async (req, res, next) => {
  try {
    const { filiere, matiere, niveau, competenceIds, dureeMinutes, contexteEntreprise } = req.body;
    if (!filiere?.trim() && !competenceIds?.length) {
      return res.status(400).json({ message: 'filiere ou competenceIds sont requis' });
    }
    const competences = competenceIds?.length
      ? await (await import('../utils/prisma.js')).default.competence.findMany({
          where: { id: { in: competenceIds } },
          select: { id: true, code: true, description: true },
        })
      : [];
    const resultat = await ia.genererDossierComplet({ filiere, matiere, niveau, competences, dureeMinutes, contexteEntreprise });
    res.json(resultat);
  } catch (err) { next(err); }
};

export const dossierCompletPdf = async (req, res, next) => {
  try {
    const { dossier } = req.body;
    if (!dossier) return res.status(400).json({ message: 'dossier requis' });
    const pdfBuffer = await genererPdfDossier(dossier);
    const nom = `dossier-situation-pro-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

export const dossierCompletDocx = async (req, res, next) => {
  try {
    const { dossier } = req.body;
    if (!dossier) return res.status(400).json({ message: 'dossier requis' });
    const buffer = await genererDocxDossier(dossier);
    const titre = (dossier.titre ?? 'dossier').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const nom = `${titre}-${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) { next(err); }
};

// ─── 6. Documents commerciaux ────────────────────────────────────────────────

export const documentsCommerciaux = async (req, res, next) => {
  try {
    const { scenario } = req.body;
    if (!scenario) return res.status(400).json({ message: 'scenario requis' });
    const resultat = await ia.genererDocumentsCommerciaux({ scenario });
    res.json(resultat);
  } catch (err) { next(err); }
};

export const documentsCommerciauxPdf = async (req, res, next) => {
  try {
    const { documents, scenario } = req.body;
    if (!documents?.length) return res.status(400).json({ message: 'documents requis' });
    const pdfBuffer = await genererPdfDocumentsCommerciaux(documents, scenario);
    const nomFichier = `documents-commerciaux-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// ─── 6. Commentaire de bulletin ───────────────────────────────────────────────

export const commentaireBulletin = async (req, res, next) => {
  try {
    const { eleveId, trimestre, tonalite } = req.body;

    if (!eleveId) return res.status(400).json({ message: 'eleveId requis' });

    // Charger les données de l'élève depuis la base
    const [utilisateur, notes, competencesEleve] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: eleveId },
        select: {
          prenom: true, nom: true,
          classe: { include: { classe: { select: { nom: true } } } },
        },
      }),
      prisma.note.findMany({
        where: { eleveId, valeur: { not: null } },
        include: {
          evaluation: {
            select: { noteMax: true, coefficient: true, sequence: { include: { matiere: { select: { nom: true, coefficient: true } } } } },
          },
        },
      }),
      prisma.competenceEleve.findMany({
        where: { eleveId },
        include: { competence: { select: { code: true, description: true } } },
      }),
    ]);

    if (!utilisateur) return res.status(404).json({ message: 'Élève introuvable' });

    // Calculer les moyennes par matière
    const parMatiere = {};
    for (const note of notes) {
      const nomMatiere = note.evaluation?.sequence?.matiere?.nom ?? 'Non précisée';
      if (!parMatiere[nomMatiere]) parMatiere[nomMatiere] = { somme: 0, nb: 0, coefficient: note.evaluation?.coefficient ?? 1 };
      parMatiere[nomMatiere].somme += (note.valeur / (note.evaluation?.noteMax ?? 20)) * 20;
      parMatiere[nomMatiere].nb++;
    }
    const notesResume = Object.entries(parMatiere).map(([matiere, d]) => ({
      matiere,
      moyenne: Math.round((d.somme / d.nb) * 100) / 100,
      coefficient: d.coefficient,
    }));

    const moyenneGenerale = notesResume.length
      ? Math.round((notesResume.reduce((s, n) => s + n.moyenne * n.coefficient, 0) /
          notesResume.reduce((s, n) => s + n.coefficient, 0)) * 100) / 100
      : null;

    const resultat = await ia.genererCommentaireBulletin({
      eleve: {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        classe: utilisateur.classe?.classe?.nom,
      },
      moyenneGenerale,
      notes: notesResume,
      competences: competencesEleve.map((ce) => ({
        code: ce.competence.code,
        description: ce.competence.description,
        niveau: ce.niveau,
      })),
      comportement: req.body.comportement,
      tonalite,
      trimestre,
    });

    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 7. Génération de cours complet ──────────────────────────────────────────

export const genererCours = async (req, res, next) => {
  try {
    const { competenceId, contexte } = req.body;
    if (!competenceId) return res.status(400).json({ message: 'competenceId requis' });

    const competence = await prisma.competence.findUnique({
      where: { id: competenceId },
      include: { criteres: { select: { description: true } } },
    });
    if (!competence) return res.status(404).json({ message: 'Compétence introuvable' });

    const resultat = await ia.genererCours({ competence, contexte });
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 8. Génération de support de travail ─────────────────────────────────────

export const genererSupportTravail = async (req, res, next) => {
  try {
    const { competenceId, contexte } = req.body;
    if (!competenceId) return res.status(400).json({ message: 'competenceId requis' });

    const competence = await prisma.competence.findUnique({
      where: { id: competenceId },
      include: { criteres: { select: { description: true } } },
    });
    if (!competence) return res.status(404).json({ message: 'Compétence introuvable' });

    const resultat = await ia.genererSupportTravail({ competence, contexte });
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 9. Appréciation et remédiation ──────────────────────────────────────────

export const appreciationRemediation = async (req, res, next) => {
  try {
    const { eleveId, noteObtenue, noteMax, commentaireCorrecteur } = req.body;
    if (noteObtenue == null || noteMax == null) {
      return res.status(400).json({ message: 'noteObtenue et noteMax sont requis' });
    }

    let eleve = { prenom: req.body.prenomEleve ?? '', nom: req.body.nomEleve ?? '' };
    let competences = [];

    if (eleveId) {
      const [utilisateur, competencesEleve] = await Promise.all([
        prisma.utilisateur.findUnique({
          where: { id: eleveId },
          select: { prenom: true, nom: true },
        }),
        prisma.competenceEleve.findMany({
          where: { eleveId },
          include: { competence: { select: { code: true, description: true } } },
        }),
      ]);
      if (utilisateur) eleve = utilisateur;
      competences = competencesEleve.map((ce) => ({
        code: ce.competence.code,
        description: ce.competence.description,
        niveau: ce.niveau,
      }));
    }

    const resultat = await ia.genererAppreciationRemediation({
      eleve,
      noteObtenue: parseFloat(noteObtenue),
      noteMax: parseFloat(noteMax),
      competences,
      commentaireCorrecteur,
    });
    res.json(resultat);
  } catch (err) { next(err); }
};

// ─── 6. Compétences fragiles ──────────────────────────────────────────────────

export const competencesFragiles = async (req, res, next) => {
  try {
    const { eleveId } = req.body;
    if (!eleveId) return res.status(400).json({ message: 'eleveId requis' });

    const [utilisateur, notes, competencesEleve, historiques] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: eleveId },
        select: {
          prenom: true, nom: true,
          classe: { include: { classe: { select: { nom: true } } } },
        },
      }),
      prisma.note.findMany({
        where: { eleveId },
        include: {
          evaluation: { select: { titre: true, type: true, noteMax: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.competenceEleve.findMany({
        where: { eleveId },
        include: { competence: { select: { code: true, description: true } } },
      }),
      prisma.historiqueNote.findMany({
        where: { evaluation: { notes: { some: { eleveId } } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!utilisateur) return res.status(404).json({ message: 'Élève introuvable' });

    const resultat = await ia.detecterCompetencesFragiles({
      eleve: {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        classe: utilisateur.classe?.classe?.nom,
      },
      notes,
      competencesEleve,
      historiquesNotes: historiques,
    });

    // Alerte enseignant si intervention urgente détectée
    if (resultat.resultat?.prioriteIntervention === 'urgente') {
      const { prenom, nom } = utilisateur;
      const nbFragiles = resultat.resultat.competencesFragiles?.length ?? 0;
      const dispositif = resultat.resultat.dispositifSuiviRecommande ?? 'voir le rapport détaillé';
      await creerNotification(
        req.utilisateur.id,
        `Alerte pédagogique — ${prenom} ${nom}`,
        `${nbFragiles} compétence${nbFragiles > 1 ? 's' : ''} fragile${nbFragiles > 1 ? 's' : ''} détectée${nbFragiles > 1 ? 's' : ''}. Intervention urgente recommandée : ${dispositif}.`
      ).catch(() => null);
    }

    res.json(resultat);
  } catch (err) { next(err); }
};
