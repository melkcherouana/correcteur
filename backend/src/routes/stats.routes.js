import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import { obtenirStats } from '../controllers/stats.controller.js';

const router = Router();

router.get('/', verifierToken, autoriser('ADMIN', 'ENSEIGNANT'), obtenirStats);

export default router;
