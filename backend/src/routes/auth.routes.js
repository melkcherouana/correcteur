import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { verifierToken } from '../middlewares/auth.js';

const router = Router();

router.post(
  '/register',
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email invalide').normalizeEmail(),
  body('motDePasse')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  authController.register
);

router.post(
  '/login',
  body('identifiant').trim().notEmpty().withMessage("L'identifiant est requis"),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis'),
  authController.login
);

router.post(
  '/reinitialiser-mot-de-passe',
  body('token').notEmpty().withMessage('Token requis'),
  body('motDePasse').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  authController.reinitialiserMotDePasse
);

router.get('/me', verifierToken, authController.me);

router.put(
  '/mot-de-passe',
  verifierToken,
  body('ancienMotDePasse').notEmpty().withMessage("L'ancien mot de passe est requis"),
  body('nouveauMotDePasse')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères'),
  body('confirmation')
    .custom((valeur, { req }) => valeur === req.body.nouveauMotDePasse)
    .withMessage('La confirmation ne correspond pas au nouveau mot de passe'),
  authController.changerMotDePasse
);

export default router;
