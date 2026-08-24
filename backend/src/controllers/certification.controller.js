import * as svc from '../services/certification.service.js';

export const synthese = async (req, res, next) => {
  try {
    const { classeId, matiereId } = req.query;
    if (!classeId) return res.status(400).json({ message: 'classeId requis' });
    res.json(await svc.syntheseClasse(classeId, matiereId || null));
  } catch (err) { next(err); }
};

export const suggerer = async (req, res, next) => {
  try {
    const { eleveId } = req.params;
    res.json(await svc.suggererNiveauxDepuisNotes(eleveId));
  } catch (err) { next(err); }
};

export const appliquerBulk = async (req, res, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0)
      return res.status(400).json({ message: 'updates[] requis' });
    res.json(await svc.appliquerNiveauxBulk(updates));
  } catch (err) { next(err); }
};
