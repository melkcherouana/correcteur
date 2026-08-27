import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import * as ctrl from '../controllers/evaluations.controller.js';
import * as soumCtrl from '../controllers/soumissions.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

const TYPES   = ['DEVOIR_SURVEILLE', 'TRAVAUX_PRATIQUES', 'ORAL', 'PROJET', 'CCF'];
const STATUTS = ['BROUILLON', 'PUBLIEE', 'CORRIGEE', 'ARCHIVEE'];

// Multer pour l'upload du sujet (PDF + Word + Excel, 20 Mo max)
const uploadSujet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(file.mimetype);
    cb(ok ? null : Object.assign(new Error('Format non supporté (PDF, Word, Excel)'), { status: 415 }), ok);
  },
}).single('sujet');

// ─── CRUD Évaluations ────────────────────────────────────────────────────────

// GET /api/evaluations?classeId=&type=&statut=&createurId=&page=&limite=
router.get('/', ctrl.lister);

// GET /api/evaluations/:id
router.get('/:id', ctrl.obtenir);

// POST /api/evaluations
router.post(
  '/',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('titre').trim().notEmpty().withMessage('Le titre est requis'),
  body('classeId').notEmpty().withMessage('La classe est requise'),
  body('type').optional().isIn(TYPES).withMessage('Type invalide'),
  body('statut').optional().isIn(STATUTS),
  body('noteMax').optional().isFloat({ min: 1 }).withMessage('Note max invalide'),
  body('coefficient').optional().isFloat({ min: 0 }),
  body('datePassage').optional().isISO8601(),
  ctrl.creer
);

// PUT /api/evaluations/:id
router.put(
  '/:id',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('titre').optional().trim().notEmpty(),
  body('type').optional().isIn(TYPES),
  body('noteMax').optional().isFloat({ min: 1 }),
  body('coefficient').optional().isFloat({ min: 0 }),
  body('datePassage').optional().isISO8601(),
  ctrl.mettreAJour
);

// PATCH /api/evaluations/:id/statut — publier, corriger, archiver
router.patch(
  '/:id/statut',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('statut').isIn(STATUTS).withMessage('Statut invalide'),
  ctrl.changerStatut
);

// DELETE /api/evaluations/:id — archivage logique
router.delete('/:id', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.supprimer);

// ─── Sujet / Énoncé (déposé par l'enseignant) ────────────────────────────────

// GET  /api/evaluations/:id/sujet/info — métadonnées (nom, taille) sans le binaire
router.get('/:id/sujet/info', ctrl.infoSujet);

// GET  /api/evaluations/:id/sujet — téléchargement du fichier
router.get('/:id/sujet', ctrl.telechargerSujet);

// POST /api/evaluations/:id/sujet — dépôt ou remplacement de l'énoncé
router.post('/:id/sujet', autoriser('ADMIN', 'ENSEIGNANT'), uploadSujet, ctrl.deposerSujet);

// DELETE /api/evaluations/:id/sujet — suppression
router.delete('/:id/sujet', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.supprimerSujet);

// ─── Notes d'une évaluation ──────────────────────────────────────────────────

// GET /api/evaluations/:id/notes — grille complète (tous élèves + leurs notes + stats)
router.get('/:id/notes', ctrl.obtenirNotes);

// POST /api/evaluations/:id/notes — saisie en masse d'une classe entière
// Retourne la grille complète (tous élèves + stats) après la saisie
router.post(
  '/:id/notes',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('notes').isArray({ min: 1 }).withMessage('Un tableau de notes est requis'),
  body('notes.*.eleveId').notEmpty().withMessage('eleveId requis pour chaque note'),
  body('notes.*.valeur').optional({ nullable: true }).isFloat({ min: 0 }),
  ctrl.saisirNotes
);

// ─── Soumissions de fichiers ──────────────────────────────────────────────────

// GET  /api/evaluations/:id/soumissions/ma-soumission — élève : sa soumission
router.get('/:id/soumissions/ma-soumission', autoriser('ELEVE'), soumCtrl.maSoumission);

// POST /api/evaluations/:id/soumissions — élève dépose son fichier
router.post('/:id/soumissions', autoriser('ELEVE'), soumCtrl.uploadMiddleware, soumCtrl.soumettre);

// GET  /api/evaluations/:id/soumissions — enseignant : liste toutes les soumissions
router.get('/:id/soumissions', autoriser('ADMIN', 'ENSEIGNANT'), soumCtrl.lister);

// POST /api/evaluations/:id/soumissions/:sid/corriger-ia — enseignant : correction IA
router.post('/:id/soumissions/:sid/corriger-ia', autoriser('ADMIN', 'ENSEIGNANT'), soumCtrl.corrigerIA);

// GET /api/evaluations/:id/soumissions/:sid/fichier — enseignant : télécharger le fichier d'un élève ;
// élève : télécharger son propre fichier (vérifié dans le service)
router.get('/:id/soumissions/:sid/fichier', autoriser('ADMIN', 'ENSEIGNANT', 'ELEVE'), soumCtrl.telechargerFichier);

export default router;
