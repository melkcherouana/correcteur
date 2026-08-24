import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/notes.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// GET /api/notes?eleveId=&evaluationId=&page=&limite=
router.get('/', ctrl.lister);

// GET /api/notes/export-csv — AVANT /:id pour ne pas être intercepté comme un ID
router.get('/export-csv', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.exportCsv);

// GET /api/notes/:id
router.get('/:id', ctrl.obtenir);

// POST /api/notes — création d'une note individuelle
router.post(
  '/',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('eleveId').notEmpty().withMessage('eleveId requis'),
  body('evaluationId').notEmpty().withMessage('evaluationId requis'),
  body('valeur').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Valeur invalide'),
  body('critereId').optional().isString(),
  ctrl.creer
);

// PUT /api/notes/:id — correction avec motif obligatoire (génère un HistoriqueNote)
router.put(
  '/:id',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('valeur').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Valeur invalide'),
  body('motif').trim().notEmpty().withMessage('Le motif de correction est obligatoire'),
  ctrl.corriger
);

// DELETE /api/notes/:id
router.delete('/:id', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.supprimer);

// POST /api/notes/bulk/:evaluationId — saisie en masse (alias de /api/evaluations/:id/notes)
router.post(
  '/bulk/:evaluationId',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('notes').isArray({ min: 1 }),
  body('notes.*.eleveId').notEmpty(),
  body('notes.*.valeur').optional({ nullable: true }).isFloat({ min: 0 }),
  ctrl.saisirBulk
);

export default router;
