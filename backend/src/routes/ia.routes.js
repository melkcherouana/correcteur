import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/ia.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// Multer en mémoire — 20 Mo max, types autorisés
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const typesAutorises = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (typesAutorises.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Format non supporté. Utilisez PDF, Word ou Excel.'), { status: 415 }));
    }
  },
});

// ─── Routes IA ───────────────────────────────────────────────────────────────

// POST /api/ia/extraire-competences
// Body : multipart, champ "fichier" (PDF)
// Retour : { resultat: { titre, poles[] }, usage }
router.post(
  '/extraire-competences',
  autoriser('ADMIN', 'ENSEIGNANT'),
  upload.single('fichier'),
  ctrl.extraireCompetences
);

// POST /api/ia/corriger-devoir
// Body : multipart, champ "fichier" (PDF/Word/Excel) + champ "grille" (JSON string)
// Retour : { resultat: { noteGlobale, criteres[], appreciationGenerale }, usage }
router.post(
  '/corriger-devoir',
  autoriser('ADMIN', 'ENSEIGNANT'),
  upload.single('fichier'),
  ctrl.corrigerDevoir
);

// POST /api/ia/questions-entretien
// Body : { contenuTravail: string, contexte: { filiere, matiere, niveau, nbQuestions } }
// Retour : { resultat: { questions[], conseilsConduite }, usage }
router.post(
  '/questions-entretien',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.questionsEntretien
);

// POST /api/ia/scenario-professionnel
// Body : { filiere, matiere, niveau, competenceIds[], dureeMinutes?, contexteEntreprise? }
// Retour : { resultat: { titre, entreprise, taches[], criteresEvaluation[] }, usage }
router.post(
  '/scenario-professionnel',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.scenarioProfessionnel
);

// POST /api/ia/scenario-professionnel/pdf
// Body : { scenario: { ... } } — résultat JSON déjà généré
// Retour : application/pdf (blob téléchargeable)
router.post(
  '/scenario-professionnel/pdf',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.scenarioProfessionnelPdf
);

// POST /api/ia/dossier-complet
// Body : { filiere, matiere, niveau, competenceIds[], dureeMinutes?, contexteEntreprise? }
router.post('/dossier-complet', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.dossierComplet);

// POST /api/ia/dossier-complet/pdf
// Body : { dossier: { ... } }
router.post('/dossier-complet/pdf', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.dossierCompletPdf);

// POST /api/ia/dossier-complet/docx
// Body : { dossier: { ... } }
router.post('/dossier-complet/docx', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.dossierCompletDocx);

// POST /api/ia/documents-commerciaux
// Body : { scenario: { ... } }
// Retour : { resultat: { documents: [...] } }
router.post(
  '/documents-commerciaux',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.documentsCommerciaux
);

// POST /api/ia/documents-commerciaux/pdf
// Body : { documents: [...], scenario: { titre, entreprise } }
// Retour : application/pdf
router.post(
  '/documents-commerciaux/pdf',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.documentsCommerciauxPdf
);

// POST /api/ia/commentaire-bulletin
// Body : { eleveId, trimestre?, tonalite?: 'bienveillant'|'neutre'|'exigeant', comportement? }
// Retour : { resultat: { commentaire, pointsForts[], axesProgres[] }, usage }
router.post(
  '/commentaire-bulletin',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.commentaireBulletin
);

// POST /api/ia/competences-fragiles
// Body : { eleveId }
// Retour : { resultat: { niveauGlobal, competencesFragiles[], competencesAppui[] }, usage }
router.post(
  '/competences-fragiles',
  autoriser('ADMIN', 'ENSEIGNANT'),
  ctrl.competencesFragiles
);

// POST /api/ia/generer-cours
// Body : { competenceId, contexte?: { filiere, niveau, dureeHeures } }
// Retour : { resultat: { titre, plan[], contenuStructure[], ... } }
router.post('/generer-cours', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.genererCours);

// POST /api/ia/support-travail
// Body : { competenceId, contexte?: { filiere, niveau, typeSouhaite } }
// Retour : { resultat: { titre, type, contexte, travailDemande[], elementsDeCorrection[], ... } }
router.post('/support-travail', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.genererSupportTravail);

// POST /api/ia/appreciation-remediation
// Body : { noteObtenue, noteMax, eleveId?, commentaireCorrecteur? }
// Retour : { resultat: { appreciation, niveauReussite, remediations[], ... } }
router.post('/appreciation-remediation', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.appreciationRemediation);

export default router;
