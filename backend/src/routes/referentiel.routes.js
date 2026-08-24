import { Router } from 'express';
import multer from 'multer';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import { analyserPdf, importer, obtenirMatieres, obtenirArborescence } from '../controllers/referentiel.controller.js';

const router = Router();
// Pas de fileFilter : un rejet silencieux (cb(null,false)) laisse req.file
// undefined avec le même 400 que "fichier manquant", rendant le débogage difficile.
// La validation du type est faite dans le contrôleur avec un message explicite.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(verifierToken, autoriser('ENSEIGNANT', 'ADMIN'));

router.get('/matieres', obtenirMatieres);
router.get('/matieres/:matiereId/arborescence', obtenirArborescence);
router.post('/analyser', upload.single('fichier'), analyserPdf);
router.post('/importer', importer);

export default router;
