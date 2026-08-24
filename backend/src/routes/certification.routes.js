import { Router } from 'express';
import * as ctrl from '../controllers/certification.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// GET /api/certification/synthese?classeId=&matiereId=
router.get('/synthese', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.synthese);

// GET /api/certification/suggerer/:eleveId
router.get('/suggerer/:eleveId', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.suggerer);

// PATCH /api/certification/niveaux-bulk
// body: { updates: [{ eleveId, competenceId, niveau }] }
router.patch('/niveaux-bulk', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.appliquerBulk);

export default router;
