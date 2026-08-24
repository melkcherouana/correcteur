import multer from 'multer';
import * as service from '../services/soumissions.service.js';

// 10 Mo max, Word et Excel uniquement
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const autorises = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (autorises.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Seuls les fichiers Word (.doc, .docx) et Excel (.xls, .xlsx) sont acceptés'), { status: 415 }));
    }
  },
}).single('fichier');

export const soumettre = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('Aucun fichier reçu'), { status: 400 });
    const soumission = await service.soumettreFichier(
      req.params.id,
      req.utilisateur.id,
      { nom: req.file.originalname, type: req.file.mimetype, donnees: req.file.buffer, taille: req.file.size }
    );
    res.status(201).json(soumission);
  } catch (err) {
    next(err);
  }
};

export const lister = async (req, res, next) => {
  try {
    res.json(await service.listerSoumissions(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const maSoumission = async (req, res, next) => {
  try {
    res.json(await service.obtenirMaSoumission(req.params.id, req.utilisateur.id) ?? null);
  } catch (err) {
    next(err);
  }
};

export const corrigerIA = async (req, res, next) => {
  try {
    res.json(await service.corrigerSoumissionIA(req.params.sid));
  } catch (err) {
    next(err);
  }
};
