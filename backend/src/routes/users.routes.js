import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import * as ctrl from '../controllers/users.controller.js';
import { verifierToken, autoriser } from '../middlewares/auth.js';

const router = Router();
router.use(verifierToken);

const ROLES_VALIDES = ['ADMIN', 'ENSEIGNANT', 'ELEVE'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/users/import/modele — télécharger le fichier Excel modèle
router.get('/import/modele', autoriser('ADMIN'), ctrl.modeleExcel);

// POST /api/users/import — import en masse depuis Excel
router.post('/import', autoriser('ADMIN'), upload.single('fichier'), ctrl.importerEnMasse);

// GET /api/users — admin voit tout, les autres voient uniquement les actifs
router.get('/', autoriser('ADMIN', 'ENSEIGNANT'), ctrl.lister);

// GET /api/users/:id
router.get(
  '/:id',
  param('id').notEmpty(),
  ctrl.obtenir
);

// POST /api/users — création par l'admin
router.post(
  '/',
  autoriser('ADMIN'),
  body('email').isEmail().normalizeEmail(),
  body('motDePasse').isLength({ min: 8 }).withMessage('8 caractères minimum'),
  body('prenom').trim().notEmpty(),
  body('nom').trim().notEmpty(),
  body('role').optional().isIn(ROLES_VALIDES),
  ctrl.creer
);

// PUT /api/users/:id — l'utilisateur peut modifier son propre profil, l'admin peut tout modifier
router.put(
  '/:id',
  body('prenom').optional().trim().notEmpty(),
  body('nom').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('motDePasse').optional().isLength({ min: 8 }),
  body('role').optional().isIn(ROLES_VALIDES),
  ctrl.mettreAJour
);

// DELETE /api/users/:id/permanent — suppression définitive (admin uniquement)
router.delete('/:id/permanent', autoriser('ADMIN'), ctrl.supprimerDefinitivement);

// PATCH /api/users/:id/role — admin uniquement
router.patch(
  '/:id/role',
  autoriser('ADMIN'),
  body('role').isIn(ROLES_VALIDES).withMessage('Rôle invalide'),
  ctrl.changerRole
);

// PATCH /api/users/:id/classe — admin uniquement
router.patch('/:id/classe', autoriser('ADMIN'), ctrl.changerClasse);

// DELETE /api/users/:id — désactivation (soft delete)
router.delete('/:id', autoriser('ADMIN'), ctrl.supprimer);

// PATCH /api/users/:id/reactiver — réactivation du compte
router.patch('/:id/reactiver', autoriser('ADMIN'), ctrl.reactiver);

// POST /api/users/:id/reset-password-lien — génère un lien de réinitialisation à transmettre manuellement
router.post('/:id/reset-password-lien', autoriser('ADMIN'), ctrl.genererLienReset);

export default router;
