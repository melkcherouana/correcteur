import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { verifierToken } from '../middlewares/auth.js';

const router = Router();

router.post(
  '/register',
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('motDePasse')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  authController.register
);

router.post(
  '/login',
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis'),
  authController.login
);

router.get('/me', verifierToken, authController.me);

export default router;
