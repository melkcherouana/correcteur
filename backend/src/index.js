import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import classesRoutes from './routes/classes.routes.js';
import anneesRoutes from './routes/annees.routes.js';
import evaluationsRoutes from './routes/evaluations.routes.js';
import notesRoutes from './routes/notes.routes.js';
import matieresRoutes from './routes/matieres.routes.js';
import competencesRoutes from './routes/competences.routes.js';
import iaRoutes from './routes/ia.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import referentielRoutes from './routes/referentiel.routes.js';
import bulletinsRoutes from './routes/bulletins.routes.js';
import statsRoutes from './routes/stats.routes.js';
import pfmpRoutes from './routes/pfmp.routes.js';
import ccfRoutes from './routes/ccf.routes.js';
import sequencesRoutes from './routes/sequences.routes.js';
import absencesRoutes from './routes/absences.routes.js';
import certificationRoutes from './routes/certification.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de sécurité et parsing
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Santé du serveur
app.get('/health', (req, res) => {
  res.json({ statut: 'ok', service: 'EvalPro API', version: '1.0.0' });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/annees', anneesRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/matieres', matieresRoutes);
app.use('/api/competences', competencesRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/referentiel', referentielRoutes);
app.use('/api/bulletins', bulletinsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/pfmps',     pfmpRoutes);
app.use('/api/ccf',       ccfRoutes);
app.use('/api/sequences', sequencesRoutes);
app.use('/api/absences',      absencesRoutes);
app.use('/api/certification', certificationRoutes);

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Erreurs Prisma connues
  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Référence invalide : un identifiant lié n\'existe pas en base.' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Cette entrée existe déjà (contrainte d\'unicité).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Enregistrement introuvable.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`Serveur EvalPro démarré sur le port ${PORT}`);
});

export default app;
