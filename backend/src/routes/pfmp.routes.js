import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import * as ctrl from '../controllers/pfmp.controller.js';

const router = Router();
router.use(verifierToken);

// Liste et création
router.get('/',    ctrl.lister);
router.post('/',   autoriser('ENSEIGNANT', 'ADMIN'), ctrl.creer);

// Compétences disponibles pour une classe
router.get('/competences/:classeId', ctrl.competencesDispo);

// Opérations sur une PFMP
router.get('/:id',            ctrl.obtenir);
router.put('/:id',            autoriser('ENSEIGNANT', 'ADMIN'), ctrl.modifier);
router.put('/:id/evaluer',    autoriser('ENSEIGNANT', 'ADMIN'), ctrl.evaluerCompetences);
router.put('/:id/valider',    autoriser('ENSEIGNANT', 'ADMIN'), ctrl.valider);
router.delete('/:id',         autoriser('ADMIN'),                      ctrl.supprimer);

export default router;
