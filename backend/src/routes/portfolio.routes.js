import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import * as ctrl from '../controllers/portfolio.controller.js';

const router = Router();

router.use(verifierToken);

// Routes élève (son propre portfolio)
router.get('/mon-portfolio',                    autoriser('ELEVE'),                          ctrl.monPortfolio);
router.get('/mon-portfolio/competences-fragiles', autoriser('ELEVE'),                        ctrl.mesCompetencesFragiles);

// Routes enseignant/admin (portfolio d'un élève spécifique)
router.get('/:eleveId',                         autoriser('ENSEIGNANT', 'ADMIN'),     ctrl.portfolioEleve);
router.get('/:eleveId/competences-fragiles',    autoriser('ENSEIGNANT', 'ADMIN'),     ctrl.competencesFragilesEleve);

export default router;
