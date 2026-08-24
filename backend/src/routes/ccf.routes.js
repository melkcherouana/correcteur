import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import * as ctrl from '../controllers/ccf.controller.js';

const router = Router();
router.use(verifierToken);

router.get('/',            ctrl.lister);
router.post('/',           autoriser('ENSEIGNANT', 'ADMIN'), ctrl.creer);
router.get('/:id',         ctrl.obtenir);
router.put('/:id',         autoriser('ENSEIGNANT', 'ADMIN'), ctrl.modifier);
router.post('/:id/noter',  autoriser('ENSEIGNANT', 'ADMIN'), ctrl.noter);
router.get('/:id/completion', ctrl.completion);

export default router;
