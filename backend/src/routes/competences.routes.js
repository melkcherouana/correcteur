import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/competences.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

// Routes spécifiques AVANT les routes paramétrées /:id

// GET /api/competences/tableau-bord?classeId=&matiereId= — grille de classe
// entière (noms + niveaux de chaque élève) : réservé enseignant/admin
router.get('/tableau-bord', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.tableauBord);

// GET /api/competences?matiereId=&page=&limite=
router.get('/', ctrl.lister);

// GET /api/competences/eleve/:eleveId
router.get('/eleve/:eleveId', ctrl.niveauxEleve);

// PUT /api/competences/eleve/:eleveId/:competenceId
router.put(
  '/eleve/:eleveId/:competenceId',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('niveau').isIn(['NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE']).withMessage('Niveau invalide'),
  ctrl.mettreAJourNiveau
);

// POST /api/competences
router.post(
  '/',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('code').trim().notEmpty().withMessage('code requis'),
  body('description').trim().notEmpty().withMessage('description requise'),
  body('matiereId').notEmpty().withMessage('matiereId requis'),
  ctrl.creer
);

// GET /api/competences/:id
router.get('/:id', ctrl.obtenir);

// PUT /api/competences/:id
router.put(
  '/:id',
  autoriser('ADMIN', 'ENSEIGNANT'),
  body('code').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  ctrl.modifier
);

// DELETE /api/competences/:id
router.delete('/:id', autoriser('ADMIN'), ctrl.supprimer);

export default router;
