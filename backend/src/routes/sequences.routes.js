import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import * as ctrl from '../controllers/sequences.controller.js';

const router = Router();
router.use(verifierToken);

router.get('/',              ctrl.lister);
router.get('/:id',           ctrl.obtenir);
router.post('/',             autoriser('ENSEIGNANT', 'ADMIN'), ctrl.creer);
router.put('/:id',           autoriser('ENSEIGNANT', 'ADMIN'), ctrl.modifier);
router.delete('/:id',        autoriser('ENSEIGNANT', 'ADMIN'),        ctrl.supprimer);
router.post('/reordonner',   autoriser('ENSEIGNANT', 'ADMIN'), ctrl.reordonner);

export default router;
