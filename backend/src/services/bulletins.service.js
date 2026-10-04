import prisma from '../utils/prisma.js';
import { obtenirPortfolio } from './portfolio.service.js';
import { genererCommentaireBulletin } from './ia.service.js';
import { obtenirAnneeActive, bornesTrimestre } from './annees.service.js';
import { profilCertificationEleve } from './certification.service.js';
import {
  creerDocument, bandeauTitre, blocEleve, titreSection, paragraphe, tableauxParPole, legendeNiveaux,
  nettoyer, BLEU, GRIS, NOIR, FILET,
} from '../utils/pdf-mise-en-page.js';

// ─── Données bulletin ─────────────────────────────────────────────────────────

export const getDonneesBulletin = async (eleveId, { trimestre = 1, avecCommentaireIA = false } = {}) => {
  // Filtre les notes sur la période du trimestre demandé, à partir de l'année
  // scolaire active. Sans année active configurée, on garde l'historique complet
  // (periodeFiltre: null) plutôt que d'échouer.
  const anneeActive = await obtenirAnneeActive();
  const periodeFiltre = anneeActive ? bornesTrimestre(anneeActive, trimestre) : null;

  const portfolio = await obtenirPortfolio(eleveId, periodeFiltre ?? {});

  let commentaireIA = null;
  if (avecCommentaireIA) {
    const moyenneGenerale =
      portfolio.moyennesParMatiere.length > 0
        ? portfolio.moyennesParMatiere.reduce((s, m) => s + (m.moyenne ?? 0), 0) /
          portfolio.moyennesParMatiere.length
        : 0;

    try {
      const { resultat } = await genererCommentaireBulletin({
        eleve: { ...portfolio.eleve, classe: portfolio.eleve.classe?.nom },
        moyenneGenerale: Math.round(moyenneGenerale * 10) / 10,
        notes: portfolio.moyennesParMatiere.map((m) => ({
          matiere: m.matiere.nom,
          moyenne: m.moyenne,
          coefficient: 1,
        })),
        competences: portfolio.competencesFragiles.map((c) => ({
          code: c.competence.code,
          description: c.competence.description,
          niveau: c.niveau,
        })),
        trimestre,
      });
      commentaireIA = resultat;
    } catch {
      // Commentaire IA optionnel, on continue sans
    }
  }

  return { ...portfolio, commentaireIA, trimestre, periodeFiltre };
};

// ─── Génération PDF ───────────────────────────────────────────────────────────

export const genererPdfBulletin = async (eleveId, trimestre = 1) => {
  const [donnees, profil] = await Promise.all([
    getDonneesBulletin(eleveId, { trimestre, avecCommentaireIA: true }),
    profilCertificationEleve(eleveId),
  ]);
  return dessinerPdfBulletin({
    trimestre,
    periode: donnees.periodeFiltre,
    moyennes: donnees.moyennesParMatiere,
    commentaire: donnees.commentaireIA,
    profil,
  });
};

// Dessin du bulletin : moyennes du trimestre, compétences par pôle (mêmes données que la
// grille de synthèse et le profil de certification), appréciation générale
export const dessinerPdfBulletin = ({ trimestre, periode, moyennes, commentaire, profil }) => {
  const { eleve, stats, poles } = profil;
  const ctx = creerDocument({ titre: `Bulletin T${trimestre}`, piedDePage: `EvalPro — Bulletin de compétences T${trimestre}` });
  const { doc, X, L } = ctx;
  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR');

  bandeauTitre(ctx, {
    titre: `BULLETIN DE COMPÉTENCES — TRIMESTRE ${trimestre}`,
    sousTitreDroite: periode ? `Du ${fmt(periode.debut)} au ${fmt(periode.fin)}` : `Généré le ${fmt(new Date())}`,
  });

  // Décompte des niveaux sur toutes les compétences du référentiel
  const niveaux = poles.flatMap((p) => p.competences.map((c) => c.niveau));
  const enCours = niveaux.filter((n) => n === 'EN_COURS').length;
  const nonAcquises = niveaux.filter((n) => n === 'NON_ACQUIS').length;
  blocEleve(ctx, {
    nom: `${eleve.prenom} ${eleve.nom}`,
    lignes: [
      eleve.classe && `Classe : ${eleve.classe}`,
      eleve.filiere && `Filière : ${eleve.filiere}`,
      `Compétences : ${stats.acquises} acquises / ${stats.total} au total (${enCours} en cours, ${nonAcquises} non acquises)`,
    ],
    pourcentage: stats.pourcentage,
  });

  // ─── Moyennes par matière (notes du trimestre) ──────────────────────────
  titreSection(ctx, 'Moyennes du trimestre par matière');
  if (!moyennes.length) {
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Aucune note sur la période.', X, ctx.y, { width: L });
    ctx.y += 22;
  } else {
    const COL_MOYENNE = 90;
    const COL_NOTES = 70;
    const largeurMatiere = L - COL_MOYENNE - COL_NOTES;
    const xMoyenne = X + largeurMatiere;
    const xNotes = xMoyenne + COL_MOYENNE;
    const entete = () => {
      doc.rect(X, ctx.y, L, 16).fillColor('#f1f5f9').fill();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRIS)
        .text('Matière', X + 5, ctx.y + 5, { width: largeurMatiere - 10, lineBreak: false })
        .text('Moyenne /20', xMoyenne, ctx.y + 5, { width: COL_MOYENNE, align: 'center', lineBreak: false })
        .text('Notes', xNotes, ctx.y + 5, { width: COL_NOTES, align: 'center', lineBreak: false });
      ctx.y += 16;
    };
    entete();
    moyennes.forEach((m, j) => {
      doc.font('Helvetica').fontSize(9);
      const hTexte = doc.heightOfString(nettoyer(m.matiere.nom), { width: largeurMatiere - 10 });
      const h = hTexte + 10;
      if (ctx.y + h > ctx.limiteBas()) {
        ctx.nouvellePage();
        entete();
      }
      const y = ctx.y;
      if (j % 2 === 1) doc.rect(X, y, L, h).fillColor('#fafafa').fill();
      doc.font('Helvetica').fontSize(9).fillColor(NOIR)
        .text(nettoyer(m.matiere.nom), X + 5, y + 5, { width: largeurMatiere - 10 });
      const yCentre = y + (h - 10.35) / 2;
      doc.font('Helvetica-Bold').fillColor(m.moyenne === null ? GRIS : BLEU)
        .text(m.moyenne === null ? '—' : `${String(m.moyenne).replace('.', ',')}/20`, xMoyenne, yCentre, { width: COL_MOYENNE, align: 'center', lineBreak: false });
      doc.font('Helvetica').fillColor(NOIR)
        .text(String(m.nombreNotes), xNotes, yCentre, { width: COL_NOTES, align: 'center', lineBreak: false });
      doc.moveTo(X, y + h).lineTo(X + L, y + h).lineWidth(0.5).strokeColor(FILET).stroke();
      ctx.y = y + h;
    });
    ctx.y += 14;
  }

  // ─── Compétences par pôle ───────────────────────────────────────────────
  titreSection(ctx, 'Compétences par pôle');
  tableauxParPole(ctx, poles);
  legendeNiveaux(ctx);

  // ─── Appréciation générale ──────────────────────────────────────────────
  if (commentaire?.commentaire) {
    ctx.y += 8;
    titreSection(ctx, 'Appréciation générale');
    paragraphe(ctx, commentaire.commentaire, { police: 'Helvetica-Oblique', taille: 10 });
    if (commentaire.objectifProchainTrimestre) {
      ctx.y += 8;
      ctx.assurerPlace(30);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BLEU).text('Objectif pour le prochain trimestre', X, ctx.y, { width: L, lineBreak: false });
      ctx.y += 14;
      paragraphe(ctx, commentaire.objectifProchainTrimestre);
    }
  }

  return ctx.fin();
};

// ─── Liste des élèves pour l'enseignant ──────────────────────────────────────

export const listerElevesAvecBulletin = async () => {
  const eleves = await prisma.utilisateur.findMany({
    where: { role: 'ELEVE', actif: true },
    select: {
      id: true,
      prenom: true,
      nom: true,
      classe: { include: { classe: { select: { nom: true, niveau: true } } } },
      _count: { select: { notes: true, competencesEleve: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  return eleves.map((e) => ({
    id: e.id,
    prenom: e.prenom,
    nom: e.nom,
    classe: e.classe?.classe ?? null,
    totalNotes: e._count.notes,
    totalCompetences: e._count.competencesEleve,
  }));
};
