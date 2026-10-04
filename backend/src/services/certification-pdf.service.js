import { profilCertificationEleve } from './certification.service.js';
import {
  creerDocument, bandeauTitre, blocEleve, titreSection, tableauxParPole, legendeNiveaux,
} from '../utils/pdf-mise-en-page.js';

// PDF « Profil de certification » d'un élève : mêmes données que la grille de synthèse
// (tous les pôles, toutes les compétences), mise en page commune avec le bulletin trimestriel.

export const genererPdfCertification = async (eleveId) =>
  dessinerPdfCertification(await profilCertificationEleve(eleveId));

// Dessin du PDF à partir du profil (voir construireProfil dans certification.service.js)
export const dessinerPdfCertification = ({ eleve, stats, poles }) => {
  const ctx = creerDocument({ titre: 'Profil de certification', piedDePage: 'EvalPro — Profil de certification' });

  bandeauTitre(ctx, { titre: 'PROFIL DE CERTIFICATION', sousTitreDroite: `Généré le ${new Date().toLocaleDateString('fr-FR')}` });
  blocEleve(ctx, {
    nom: `${eleve.prenom} ${eleve.nom}`,
    lignes: [
      eleve.classe && `Classe : ${eleve.classe}`,
      eleve.filiere && `Filière : ${eleve.filiere}`,
      `Compétences : ${stats.acquises} acquises / ${stats.total} au total`,
    ],
    pourcentage: stats.pourcentage,
  });
  titreSection(ctx, 'Tableau de synthèse par pôle');
  tableauxParPole(ctx, poles);
  legendeNiveaux(ctx);

  return ctx.fin();
};
