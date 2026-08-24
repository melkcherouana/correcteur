import { Router } from 'express';
import { verifierToken, autoriser } from '../middlewares/auth.js';
import {
  listerEleves,
  obtenirBulletin,
  telechargerPdf,
  telechargerPdfCertification,
} from '../controllers/bulletins.controller.js';

const router = Router();

router.use(verifierToken);

router.get('/', autoriser('ENSEIGNANT', 'ADMIN'), listerEleves);
router.get('/:eleveId/pdf-certification', telechargerPdfCertification);
router.get('/:eleveId/pdf', telechargerPdf);
router.get('/:eleveId', obtenirBulletin);

export default router;
