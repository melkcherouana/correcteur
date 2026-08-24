import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/annees.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// GET /api/annees
router.get('/', ctrl.lister);

// GET /api/annees/:id
router.get('/:id', ctrl.obtenir);

// POST /api/annees
router.post(
  '/',
  autoriser('ADMIN'),
  body('libelle').trim().notEmpty().withMessage('Le libellé est requis (ex: 2025-2026)'),
  body('debut').isISO8601().withMessage('Date de début invalide'),
  body('fin').isISO8601().withMessage('Date de fin invalide'),
  ctrl.creer
);

// PUT /api/annees/:id
router.put(
  '/:id',
  autoriser('ADMIN'),
  body('libelle').optional().trim().notEmpty(),
  body('debut').optional().isISO8601(),
  body('fin').optional().isISO8601(),
  ctrl.mettreAJour
);

// DELETE /api/annees/:id
router.delete('/:id', autoriser('ADMIN'), ctrl.supprimer);

// POST /api/annees/:id/changement-annee
// Promeut toutes les classes actives d'un niveau (1EPC → 2EPC → 3EPC → archivée)
// et bascule l'année active sur :id
router.post(
  '/:id/changement-annee',
  autoriser('ADMIN'),
  ctrl.changerAnnee
);

export default router;
