import {
  analyserPdfReferentiel,
  importerReferentiel,
  listerMatieres,
  obtenirMatiereAvecArborescence,
} from '../services/referentiel.service.js';

export const analyserPdf = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier PDF requis' });
    const mimeAcceptes = ['application/pdf', 'application/octet-stream'];
    const nomFichier = req.file.originalname?.toLowerCase() ?? '';
    if (!mimeAcceptes.includes(req.file.mimetype) && !nomFichier.endsWith('.pdf'))
      return res.status(400).json({ message: 'Le fichier doit être un PDF (.pdf)' });

    const { resultat, usage } = await analyserPdfReferentiel(req.file.buffer);
    res.json({ referentiel: resultat, usage });
  } catch (err) {
    next(err);
  }
};

export const importer = async (req, res, next) => {
  try {
    const { titre, niveau, poles, matiereExistanteId } = req.body;
    if (!Array.isArray(poles) || poles.length === 0)
      return res.status(400).json({ message: 'Les pôles de compétences sont requis' });

    const resultat = await importerReferentiel({ titre, niveau, poles, matiereExistanteId });
    res.status(201).json(resultat);
  } catch (err) {
    next(err);
  }
};

export const obtenirMatieres = async (req, res, next) => {
  try {
    const matieres = await listerMatieres();
    res.json(matieres);
  } catch (err) {
    next(err);
  }
};

export const obtenirArborescence = async (req, res, next) => {
  try {
    const matiere = await obtenirMatiereAvecArborescence(req.params.matiereId);
    if (!matiere) return res.status(404).json({ message: 'Matière introuvable' });
    res.json(matiere);
  } catch (err) {
    next(err);
  }
};
