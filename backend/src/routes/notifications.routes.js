import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.js';
import * as ctrl from '../controllers/notifications.controller.js';

const router = Router();

router.use(verifierToken);

router.get('/',                 ctrl.lister);
router.get('/non-lues/count',   ctrl.compterNonLues);
router.patch('/lire-tout',      ctrl.marquerToutesLues);
router.patch('/:id/lire',       ctrl.marquerLue);
router.delete('/:id',           ctrl.supprimer);

export default router;
