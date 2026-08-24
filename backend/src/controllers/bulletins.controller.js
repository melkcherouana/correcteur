import {
  getDonneesBulletin,
  genererPdfBulletin,
  genererPdfCertification,
  listerElevesAvecBulletin,
} from '../services/bulletins.service.js';

export const listerEleves = async (req, res, next) => {
  try {
    const eleves = await listerElevesAvecBulletin();
    res.json(eleves);
  } catch (err) {
    next(err);
  }
};

export const obtenirBulletin = async (req, res, next) => {
  try {
    const { eleveId } = req.params;
    const { utilisateur } = req;

    // Un élève ne peut voir que son propre bulletin
    if (utilisateur.role === 'ELEVE' && utilisateur.id !== eleveId)
      return res.status(403).json({ message: 'Accès refusé' });

    const trimestre = parseInt(req.query.trimestre, 10) || 1;
    const donnees = await getDonneesBulletin(eleveId, { trimestre });
    res.json(donnees);
  } catch (err) {
    next(err);
  }
};

export const telechargerPdf = async (req, res, next) => {
  try {
    const { eleveId } = req.params;
    const { utilisateur } = req;

    if (utilisateur.role === 'ELEVE' && utilisateur.id !== eleveId)
      return res.status(403).json({ message: 'Accès refusé' });

    const trimestre = parseInt(req.query.trimestre, 10) || 1;
    const buffer = await genererPdfBulletin(eleveId, trimestre);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletin_trimestre${trimestre}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const telechargerPdfCertification = async (req, res, next) => {
  try {
    const { eleveId } = req.params;
    const { utilisateur } = req;

    if (utilisateur.role === 'ELEVE' && utilisateur.id !== eleveId)
      return res.status(403).json({ message: 'Accès refusé' });

    const buffer = await genererPdfCertification(eleveId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="profil_certification.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
