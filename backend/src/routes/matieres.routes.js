import { Router } from 'express';
import * as ctrl from '../controllers/matieres.controller.js';
import { verifierToken } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// GET /api/matieres
router.get('/', ctrl.lister);

// GET /api/matieres/:id — détail avec compétences
router.get('/:id', ctrl.obtenir);

export default router;
