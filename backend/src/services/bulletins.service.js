import prisma from '../utils/prisma.js';
import { obtenirPortfolio } from './portfolio.service.js';
import { genererCommentaireBulletin } from './ia.service.js';
import PDFDocument from 'pdfkit';

const NIVEAU_LABEL = {
  NON_ACQUIS: 'Non acquis',
  EN_COURS: 'En cours',
  ACQUIS: 'Acquis',
  DEPASSE: 'Dépassé',
};

const NIVEAU_SYMBOLE = {
  NON_ACQUIS: '✗',
  EN_COURS: '◑',
  ACQUIS: '✓',
  DEPASSE: '★',
};

// ─── Données bulletin ─────────────────────────────────────────────────────────

export const getDonneesBulletin = async (eleveId, { trimestre = 1, avecCommentaireIA = false } = {}) => {
  const portfolio = await obtenirPortfolio(eleveId);

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

  return { ...portfolio, commentaireIA, trimestre };
};

// ─── Génération PDF ───────────────────────────────────────────────────────────

export const genererPdfBulletin = async (eleveId, trimestre = 1) => {
  const donnees = await getDonneesBulletin(eleveId, { trimestre, avecCommentaireIA: true });
  const { eleve, stats, moyennesParMatiere, competencesParMatiere, commentaireIA } = donnees;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const bleu = '#3730a3';
    const gris = '#64748b';
    const noirLeche = '#1e293b';

    // En-tête
    doc
      .rect(50, 50, 495, 60)
      .fillColor('#eef2ff')
      .fill();
    doc
      .fillColor(bleu)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('EvalPro', 65, 65)
      .fontSize(10)
      .font('Helvetica')
      .fillColor(gris)
      .text('Lycée professionnel', 65, 86);

    doc
      .fillColor(noirLeche)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Bulletin de compétences — Trimestre ${trimestre}`, 200, 68, { align: 'right', width: 330 });

    doc.moveDown(3);

    // Infos élève
    doc.rect(50, doc.y, 495, 70).fillColor('#f8fafc').fill();
    const yEleve = doc.y + 10;
    doc
      .fillColor(noirLeche)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`${eleve.prenom} ${eleve.nom}`, 65, yEleve);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(gris)
      .text(`Classe : ${eleve.classe?.nom ?? 'Non renseignée'}`, 65, yEleve + 20)
      .text(`Filière : ${eleve.filiere?.nom ?? 'Non renseignée'}`, 65, yEleve + 33);
    doc.moveDown(4.5);

    // Progression
    const pct = stats.pourcentage;
    doc
      .fillColor(bleu)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Progression vers le diplôme', { underline: false });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(gris)
      .text(
        `${pct} % — ${stats.acquises} compétences acquises sur ${stats.total} (${stats.enCours} en cours, ${stats.nonAcquises} non acquises)`,
        { lineGap: 2 }
      );

    // Barre de progression
    const barY = doc.y + 4;
    doc.rect(50, barY, 495, 10).fillColor('#e2e8f0').fill();
    doc.rect(50, barY, (495 * pct) / 100, 10).fillColor(bleu).fill();
    doc.moveDown(2.5);

    // Moyennes par matière
    if (moyennesParMatiere.length > 0) {
      doc.fillColor(bleu).fontSize(11).font('Helvetica-Bold').text('Moyennes par matière');
      doc.moveDown(0.4);

      const colX = [50, 310, 400, 480];
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(gris)
        .text('Matière', colX[0], doc.y)
        .text('Moyenne /20', colX[1], doc.y - doc.currentLineHeight())
        .text('Nb notes', colX[2], doc.y - doc.currentLineHeight());
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.3);

      for (const m of moyennesParMatiere) {
        const y = doc.y;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(noirLeche)
          .text(m.matiere.nom, colX[0], y, { width: 250 })
          .text(m.moyenne !== null ? `${m.moyenne}/20` : 'N/A', colX[1], y)
          .text(String(m.nombreNotes), colX[2], y);
        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
    }

    // Compétences par matière
    if (competencesParMatiere.length > 0) {
      doc.fillColor(bleu).fontSize(11).font('Helvetica-Bold').text('Compétences par matière');
      doc.moveDown(0.4);

      for (const pm of competencesParMatiere) {
        if (doc.y > 700) doc.addPage();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(noirLeche)
          .text(`▸ ${pm.matiere.nom} (${pm.competences.length} compétences)`);
        doc.moveDown(0.3);

        for (const ce of pm.competences) {
          const symbole = NIVEAU_SYMBOLE[ce.niveau] ?? '?';
          const label = NIVEAU_LABEL[ce.niveau] ?? ce.niveau;
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(gris)
            .text(
              `  ${symbole} [${ce.competence.code}] ${ce.competence.description} — ${label}`,
              { width: 480, lineGap: 1 }
            );
        }
        doc.moveDown(0.5);
      }
    }

    // Commentaire IA
    if (commentaireIA?.commentaire) {
      if (doc.y > 650) doc.addPage();
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 10).fillColor('#eef2ff').fill();
      doc.moveDown(0.8);
      doc.fillColor(bleu).fontSize(11).font('Helvetica-Bold').text('Appréciation générale');
      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor(noirLeche)
        .text(commentaireIA.commentaire, { width: 480, lineGap: 3 });

      if (commentaireIA.objectifProchainTrimestre) {
        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(bleu)
          .text('Objectif prochain trimestre : ', { continued: true })
          .font('Helvetica')
          .fillColor(noirLeche)
          .text(commentaireIA.objectifProchainTrimestre, { width: 480 });
      }
    }

    // Pied de page
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(gris)
      .text(
        `Document généré par EvalPro le ${new Date().toLocaleDateString('fr-FR')}`,
        50, 780,
        { align: 'center', width: 495 }
      );

    doc.end();
  });
};

// ─── PDF profil de certification ─────────────────────────────────────────────

export const genererPdfCertification = async (eleveId) => {
  const portfolio = await obtenirPortfolio(eleveId);
  const { eleve, stats, competencesParMatiere } = portfolio;

  // Grouper par pôle (préfixe avant le point : "C1.1" → "C1")
  const poles = {};
  for (const pm of competencesParMatiere) {
    for (const ce of pm.competences) {
      const pole = ce.competence.code.split('.')[0];
      (poles[pole] ??= { nom: `Pôle ${pole}`, competences: [] }).competences.push({
        code:        ce.competence.code,
        description: ce.competence.description,
        matiere:     pm.matiere.nom,
        niveau:      ce.niveau,
      });
    }
  }

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const bufs   = [];
    doc.on('data', (b) => bufs.push(b));
    doc.on('end',  () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    const bleu   = '#3730a3';
    const vert   = '#059669';
    const orange = '#d97706';
    const rouge  = '#dc2626';
    const violet = '#7c3aed';
    const gris   = '#64748b';
    const noir   = '#1e293b';

    const NIVEAU_CLS = {
      NON_ACQUIS: { symbole: '✗', libelle: 'Non acquis',  hex: rouge  },
      EN_COURS:   { symbole: '◑', libelle: 'En cours',    hex: orange },
      ACQUIS:     { symbole: '✓', libelle: 'Acquis',      hex: vert   },
      DEPASSE:    { symbole: '★', libelle: 'Dépassé',     hex: violet },
    };

    // ─── En-tête ────────────────────────────────────────────────────────────
    doc.rect(50, 50, 495, 55).fillColor('#eef2ff').fill();
    doc.fillColor(bleu).fontSize(16).font('Helvetica-Bold')
       .text('PROFIL DE CERTIFICATION', 65, 62);
    doc.fillColor(gris).fontSize(9).font('Helvetica')
       .text(`EvalPro — Lycée professionnel`, 65, 82)
       .text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 380, 82);

    doc.moveDown(3);

    // ─── Identité élève ──────────────────────────────────────────────────────
    const yId = doc.y;
    doc.rect(50, yId, 495, 65).fillColor('#f8fafc').fill();
    doc.fillColor(noir).fontSize(14).font('Helvetica-Bold')
       .text(`${eleve.prenom} ${eleve.nom}`, 65, yId + 10);
    doc.fontSize(9).font('Helvetica').fillColor(gris)
       .text(`Classe : ${eleve.classe?.nom ?? 'N/A'}  |  Filière : ${eleve.filiere?.nom ?? 'N/A'}`, 65, yId + 28)
       .text(`Compétences : ${stats.acquises} acquises / ${stats.total} total`, 65, yId + 40);

    // Progression bar
    const bX = 350; const bY = yId + 20; const bW = 170; const bH = 8;
    doc.rect(bX, bY, bW, bH).fillColor('#e2e8f0').fill();
    doc.rect(bX, bY, (bW * stats.pourcentage) / 100, bH).fillColor(bleu).fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(bleu)
       .text(`${stats.pourcentage}%`, bX + bW + 6, bY - 2);

    doc.moveDown(4);

    // ─── Tableau de synthèse par pôle ────────────────────────────────────────
    doc.fillColor(bleu).fontSize(11).font('Helvetica-Bold')
       .text('Tableau de synthèse par pôle');
    doc.moveDown(0.4);

    for (const [, pole] of Object.entries(poles)) {
      if (doc.y > 680) doc.addPage();

      // Titre du pôle
      const acq = pole.competences.filter((c) => c.niveau === 'ACQUIS' || c.niveau === 'DEPASSE').length;
      doc.rect(50, doc.y, 495, 18).fillColor('#e0e7ff').fill();
      doc.fillColor(bleu).fontSize(9).font('Helvetica-Bold')
         .text(`${pole.nom}`, 58, doc.y - 14)
         .text(`${acq}/${pole.competences.length} acquises`, 430, doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);

      // Compétences du pôle
      for (const ce of pole.competences) {
        if (doc.y > 730) doc.addPage();
        const cfg  = NIVEAU_CLS[ce.niveau] ?? { symbole: '?', libelle: 'Non évalué', hex: gris };
        const lineY = doc.y;
        doc.fontSize(8).font('Helvetica').fillColor(noir)
           .text(`${ce.code}`, 60, lineY, { width: 50 })
           .text(`${ce.description.slice(0, 80)}${ce.description.length > 80 ? '…' : ''}`, 120, lineY, { width: 290 });
        doc.fillColor(cfg.hex).font('Helvetica-Bold')
           .text(`${cfg.symbole} ${cfg.libelle}`, 420, lineY, { width: 110, align: 'right' });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.3);
    }

    // ─── Légende ─────────────────────────────────────────────────────────────
    if (doc.y > 720) doc.addPage();
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.4);
    doc.fontSize(8).font('Helvetica').fillColor(gris).text(
      '✗ Non acquis  ◑ En cours  ✓ Acquis  ★ Dépassé',
      { align: 'center' }
    );

    doc.end();
  });
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
