import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import * as ctrl from '../controllers/absences.controller.js';

const router = Router();
router.use(verifierToken);

// Routes statiques — AVANT les routes paramétrées
router.get('/export-csv',            autoriser('ENSEIGNANT', 'ADMIN'), ctrl.exportCsv);
router.post('/bulk',                 autoriser('ENSEIGNANT', 'ADMIN'), ctrl.creerBulk);
router.get('/stats/classe/:classeId',autoriser('ENSEIGNANT', 'ADMIN'), ctrl.statsClasse);
router.get('/stats/eleve/:id',       ctrl.statsEleve);
router.get('/eleves/:classeId',      autoriser('ENSEIGNANT', 'ADMIN'), ctrl.elevesClasse);

// CRUD
router.get('/',      ctrl.lister);
router.post('/',     autoriser('ENSEIGNANT', 'ADMIN'), ctrl.creer);
router.get('/:id',   ctrl.obtenir);
router.put('/:id',   autoriser('ENSEIGNANT', 'ADMIN'), ctrl.modifier);
router.delete('/:id',autoriser('ENSEIGNANT', 'ADMIN'),        ctrl.supprimer);

export default router;
