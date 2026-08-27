import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/classes.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// Doit rester synchronisé avec NIVEAUX (frontend/src/pages/Classes.jsx),
// ORDRE_NIVEAUX (services/classes.service.js) et les clés de NIVEAU_SUIVANT
// (services/annees.service.js). Sans cette contrainte, un niveau libre créé
// hors formulaire (script, futur écran d'édition) échapperait à la table de
// progression et resterait bloqué en « classesNonReconnues » lors de chaque
// changement d'année.
const NIVEAUX = ['2nde Pro', '1ère Pro', 'Terminale Pro', 'CAP 1', 'CAP 2', 'BTS 1', 'BTS 2'];

// GET /api/classes?filiereId=&actif=true&search=
router.get('/', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.lister);

// GET /api/classes/:id/synthese — tableau de synthèse paliers × élèves
router.get('/:id/synthese', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.synthese);

// GET /api/classes/:id — inclut la liste des élèves (nom, email) : réservé
// aux enseignants/admin, un élève n'a pas besoin de voir le trousseau
// d'une classe (la sienne ou une autre)
router.get('/:id', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.obtenir);

// POST /api/classes
router.post(
  '/',
  autoriser('ADMIN'),
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  body('niveau').trim().notEmpty().isIn(NIVEAUX).withMessage('Niveau invalide'),
  body('annee').trim().notEmpty().withMessage('L\'année est requise'),
  body('filiereId').optional().isString(),
  ctrl.creer
);

// PUT /api/classes/:id
router.put(
  '/:id',
  autoriser('ADMIN'),
  body('nom').optional().trim().notEmpty(),
  body('niveau').optional().trim().notEmpty().isIn(NIVEAUX).withMessage('Niveau invalide'),
  body('annee').optional().trim().notEmpty(),
  body('filiereId').optional().isString(),
  ctrl.mettreAJour
);

// DELETE /api/classes/:id
router.delete('/:id', autoriser('ADMIN'), ctrl.supprimer);

export default router;
