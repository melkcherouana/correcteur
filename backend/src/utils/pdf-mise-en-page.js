import PDFDocument from 'pdfkit';

// Briques de mise en page communes aux PDF élève (profil de certification, bulletin trimestriel) :
// A4 portrait, marges 40 pt, largeur utile identique pour tous les blocs, curseur vertical `y`
// géré ici (aucune position codée en dur), sauts de page sans couper de ligne.
// Aucun symbole Unicode : les polices standard de PDFKit ne couvrent que le jeu WinAnsi.

export const MARGE = 40;
const BAS_DE_PAGE = 28; // réservé au pied de page

export const BLEU = '#3730a3';
export const GRIS = '#64748b';
export const NOIR = '#1e293b';
export const FILET = '#e2e8f0';

// Couleurs des pôles : identiques aux en-têtes de la grille de synthèse (Tailwind *-600), en boucle
const COULEURS_POLES = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#e11d48', '#7c3aed'];

// Pastilles : mêmes couleurs que les cellules de la grille (fond *-200, texte *-800)
const PASTILLES = {
  NON_ACQUIS: { court: 'NA', libelle: 'Non acquis', fond: '#fecaca', texte: '#991b1b' },
  EN_COURS:   { court: 'EC', libelle: 'En cours',   fond: '#fed7aa', texte: '#9a3412' },
  ACQUIS:     { court: 'A',  libelle: 'Acquis',     fond: '#fef08a', texte: '#854d0e' },
  DEPASSE:    { court: 'D',  libelle: 'Dépassé',    fond: '#bbf7d0', texte: '#166534' },
};
const NON_EVALUE = { court: 'Non évalué', libelle: 'Non évalué', fond: '#ffffff', texte: '#94a3b8', bordure: '#cbd5e1' };
const PASTILLE = { largeur: 66, hauteur: 14 };

// Tableau d'un pôle
const COL_CODE = 50;
const COL_NIVEAU = 90;
const PADDING = 5;
const TAILLE_TEXTE = 9;
const HAUTEUR_ENTETE_POLE = 20;
const HAUTEUR_ENTETE_COLONNES = 16;

const WINANSI_SUPPL = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export const nettoyer = (s = '') =>
  String(s)
    .replace(/[\t\u00a0\u202f]/g, ' ')
    .replace(/[\u2010-\u2012]/g, '-')
    .replace(/./gsu, (c) => (c.charCodeAt(0) <= 0xff || WINANSI_SUPPL.includes(c) ? c : '?'));

// ─── Document et curseur ──────────────────────────────────────────────────────

/**
 * Crée le document et son contexte de mise en page.
 * `fin()` ajoute les pieds de page et renvoie le PDF en Buffer.
 */
export const creerDocument = ({ titre, piedDePage }) => {
  const doc = new PDFDocument({ size: 'A4', margin: MARGE, bufferPages: true, info: { Title: titre } });
  const buffers = [];
  const termine = new Promise((resolve, reject) => {
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });

  const ctx = {
    doc,
    X: MARGE,
    L: doc.page.width - 2 * MARGE, // largeur utile, commune à tous les blocs
    y: MARGE,
    limiteBas: () => doc.page.height - MARGE - BAS_DE_PAGE,
    nouvellePage() {
      doc.addPage();
      ctx.y = MARGE;
    },
    // Passe à la page suivante si `hauteur` ne tient plus dans la page courante
    assurerPlace(hauteur) {
      if (ctx.y + hauteur > ctx.limiteBas()) ctx.nouvellePage();
    },
    fin() {
      const { start, count } = doc.bufferedPageRange();
      for (let i = start; i < start + count; i++) {
        doc.switchToPage(i);
        const margeBasse = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // évite un saut de page automatique en écrivant dans la marge
        doc.font('Helvetica').fontSize(8).fillColor(GRIS)
          .text(nettoyer(`${piedDePage} — page ${i + 1}/${count}`), ctx.X, doc.page.height - MARGE + 8,
            { width: ctx.L, align: 'center', lineBreak: false });
        doc.page.margins.bottom = margeBasse;
      }
      doc.end();
      return termine;
    },
  };
  return ctx;
};

// ─── Blocs ────────────────────────────────────────────────────────────────────

export const bandeauTitre = (ctx, { titre, sousTitreDroite }) => {
  const { doc, X, L } = ctx;
  doc.rect(X, ctx.y, L, 55).fillColor('#eef2ff').fill();
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BLEU).text(nettoyer(titre), X + 15, ctx.y + 12, { width: L - 30, lineBreak: false, ellipsis: true });
  doc.font('Helvetica').fontSize(9).fillColor(GRIS)
    .text('EvalPro — Lycée professionnel', X + 15, ctx.y + 34, { lineBreak: false })
    .text(nettoyer(sousTitreDroite), X, ctx.y + 34, { width: L - 15, align: 'right', lineBreak: false });
  ctx.y += 55 + 10;
};

// Bloc élève : nom, lignes d'information (les lignes vides sont masquées), barre de progression
export const blocEleve = (ctx, { nom, lignes, pourcentage }) => {
  const { doc, X, L } = ctx;
  const infos = lignes.filter(Boolean);
  const hauteur = 30 + infos.length * 12 + 6;
  doc.rect(X, ctx.y, L, hauteur).fillColor('#f8fafc').fill();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NOIR)
    .text(nettoyer(nom), X + 15, ctx.y + 10, { width: L - 230, lineBreak: false, ellipsis: true });
  doc.font('Helvetica').fontSize(9).fillColor(GRIS);
  infos.forEach((t, i) => doc.text(nettoyer(t), X + 15, ctx.y + 30 + i * 12, { width: L - 230, lineBreak: false, ellipsis: true }));

  // Barre de progression, alignée à droite dans la largeur utile
  const largeurBarre = 150;
  const xBarre = X + L - 15 - 40 - largeurBarre;
  const yBarre = ctx.y + hauteur / 2 - 4;
  doc.roundedRect(xBarre, yBarre, largeurBarre, 8, 4).fillColor(FILET).fill();
  if (pourcentage > 0) {
    doc.roundedRect(xBarre, yBarre, Math.max(8, (largeurBarre * pourcentage) / 100), 8, 4).fillColor(BLEU).fill();
  }
  doc.font('Helvetica-Bold').fontSize(11).fillColor(BLEU)
    .text(`${pourcentage} %`, xBarre + largeurBarre + 6, yBarre - 2, { width: 40, lineBreak: false });
  ctx.y += hauteur + 14;
};

// Titre de section sur toute la largeur ; `suite` = hauteur minimale du contenu qui doit l'accompagner
export const titreSection = (ctx, texte, suite = 40) => {
  ctx.assurerPlace(18 + suite);
  ctx.doc.font('Helvetica-Bold').fontSize(11).fillColor(BLEU).text(nettoyer(texte), ctx.X, ctx.y, { width: ctx.L, lineBreak: false });
  ctx.y += 18;
};

// Paragraphe sur toute la largeur, découpé ligne à ligne si besoin entre deux pages
export const paragraphe = (ctx, texte, { police = 'Helvetica', taille = 9.5, couleur = NOIR } = {}) => {
  const { doc, X, L } = ctx;
  doc.font(police).fontSize(taille);
  const propre = nettoyer(texte);
  const hauteur = doc.heightOfString(propre, { width: L, lineGap: 2 });
  if (ctx.y + hauteur <= ctx.limiteBas()) {
    doc.fillColor(couleur).text(propre, X, ctx.y, { width: L, lineGap: 2 });
    ctx.y += hauteur;
    return;
  }
  // Trop long pour la fin de page : mot par mot, en remplissant chaque page
  let ligne = '';
  for (const mot of propre.split(/\s+/)) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (doc.heightOfString(essai, { width: L, lineGap: 2 }) + ctx.y > ctx.limiteBas() && ligne) {
      doc.fillColor(couleur).text(ligne, X, ctx.y, { width: L, lineGap: 2 });
      ctx.nouvellePage();
      doc.font(police).fontSize(taille);
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  if (ligne) {
    doc.fillColor(couleur).text(ligne, X, ctx.y, { width: L, lineGap: 2 });
    ctx.y += doc.heightOfString(ligne, { width: L, lineGap: 2 });
  }
};

// ─── Pastilles et tableaux par pôle ───────────────────────────────────────────

const pastille = (doc, x, y, niveau, largeur = PASTILLE.largeur) => {
  const p = PASTILLES[niveau] ?? NON_EVALUE;
  doc.save();
  doc.roundedRect(x, y, largeur, PASTILLE.hauteur, 4).fillColor(p.fond).fill();
  if (p.bordure) doc.roundedRect(x, y, largeur, PASTILLE.hauteur, 4).lineWidth(0.7).strokeColor(p.bordure).stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(p.texte)
    .text(nettoyer(p.court), x, y + 3.6, { width: largeur, align: 'center', lineBreak: false });
};

/**
 * Un tableau par pôle (Code | Compétence | Niveau), en-tête coloré « P1 · libellé court » et « x/y acquises ».
 * @param poles — sortie de construireProfil (certification.service.js)
 */
export const tableauxParPole = (ctx, poles) => {
  const { doc, X, L } = ctx;
  const xLibelle = X + COL_CODE;
  const largeurLibelle = L - COL_CODE - COL_NIVEAU;
  const xNiveau = X + L - COL_NIVEAU;

  const enteteColonnes = () => {
    doc.rect(X, ctx.y, L, HAUTEUR_ENTETE_COLONNES).fillColor('#f1f5f9').fill();
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRIS);
    doc.text('Code', X + PADDING, ctx.y + 5, { width: COL_CODE - PADDING, lineBreak: false });
    doc.text('Compétence', xLibelle + PADDING, ctx.y + 5, { width: largeurLibelle - 2 * PADDING, lineBreak: false });
    doc.text('Niveau', xNiveau, ctx.y + 5, { width: COL_NIVEAU, align: 'center', lineBreak: false });
    ctx.y += HAUTEUR_ENTETE_COLONNES;
  };

  const entetePole = (pole, couleur, suite = false) => {
    doc.rect(X, ctx.y, L, HAUTEUR_ENTETE_POLE).fillColor(couleur).fill();
    const titre = `${pole.libelle}${pole.court ? ` · ${pole.court}` : ''}${suite ? ' (suite)' : ''}`;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff')
      .text(nettoyer(titre), X + 8, ctx.y + 5.5, { width: L - 130, lineBreak: false, ellipsis: true })
      .text(`${pole.acquises}/${pole.competences.length} acquises`, X, ctx.y + 5.5, { width: L - 8, align: 'right', lineBreak: false });
    ctx.y += HAUTEUR_ENTETE_POLE;
    enteteColonnes();
  };

  // Hauteur d'une ligne : celle du libellé le plus long (retour à la ligne autorisé)
  const hauteurTexte = (c) => {
    doc.font('Helvetica').fontSize(TAILLE_TEXTE);
    return doc.heightOfString(nettoyer(c.description), { width: largeurLibelle - 2 * PADDING });
  };
  const hauteurLigne = (c) => Math.max(hauteurTexte(c), PASTILLE.hauteur) + 2 * PADDING;

  if (!poles.length) {
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Aucune compétence dans le référentiel.', X, ctx.y, { width: L });
    ctx.y += 20;
    return;
  }

  poles.forEach((pole, i) => {
    const couleur = COULEURS_POLES[i % COULEURS_POLES.length];
    const premiere = pole.competences[0];
    // En-tête de pôle jamais seul en bas de page : il faut la place pour au moins une ligne
    ctx.assurerPlace(HAUTEUR_ENTETE_POLE + HAUTEUR_ENTETE_COLONNES + (premiere ? hauteurLigne(premiere) : 0));
    entetePole(pole, couleur);

    pole.competences.forEach((c, j) => {
      const h = hauteurLigne(c);
      const hTexte = hauteurTexte(c);
      // Une ligne n'est jamais coupée : sinon page suivante avec l'en-tête du pôle répété
      if (ctx.y + h > ctx.limiteBas()) {
        ctx.nouvellePage();
        entetePole(pole, couleur, true);
      }
      const y = ctx.y;
      if (j % 2 === 1) doc.rect(X, y, L, h).fillColor('#fafafa').fill();
      doc.font('Helvetica-Bold').fontSize(TAILLE_TEXTE).fillColor(couleur)
        .text(nettoyer(c.code), X + PADDING, y + (h - TAILLE_TEXTE * 1.15) / 2, { width: COL_CODE - PADDING, lineBreak: false });
      doc.font('Helvetica').fontSize(TAILLE_TEXTE).fillColor(NOIR)
        .text(nettoyer(c.description), xLibelle + PADDING, y + (h - hTexte) / 2, { width: largeurLibelle - 2 * PADDING });
      pastille(doc, xNiveau + (COL_NIVEAU - PASTILLE.largeur) / 2, y + (h - PASTILLE.hauteur) / 2, c.niveau);
      doc.moveTo(X, y + h).lineTo(X + L, y + h).lineWidth(0.5).strokeColor(FILET).stroke();
      ctx.y = y + h;
    });
    ctx.y += 10;
  });
};

// Légende des niveaux, centrée, sur une ou deux lignes dans la largeur utile
export const legendeNiveaux = (ctx) => {
  const { doc, X, L } = ctx;
  const ESPACE = 16;
  doc.font('Helvetica').fontSize(8);
  const elements = [...Object.keys(PASTILLES), null].map((n) => {
    const p = PASTILLES[n] ?? NON_EVALUE;
    const largeurPastille = n ? 22 : 52;
    const largeurLibelle = n ? doc.widthOfString(p.libelle) : 0;
    return { n, p, largeurPastille, largeur: largeurPastille + (n ? 4 + largeurLibelle : 0) };
  });
  const lignes = [[]];
  let largeurCourante = 0;
  for (const el of elements) {
    if (largeurCourante && largeurCourante + ESPACE + el.largeur > L) {
      lignes.push([]);
      largeurCourante = 0;
    }
    largeurCourante += (largeurCourante ? ESPACE : 0) + el.largeur;
    lignes[lignes.length - 1].push(el);
  }

  ctx.assurerPlace(14 + lignes.length * 20);
  doc.moveTo(X, ctx.y).lineTo(X + L, ctx.y).lineWidth(0.5).strokeColor(FILET).stroke();
  ctx.y += 10;
  for (const ligne of lignes) {
    const total = ligne.reduce((s, el) => s + el.largeur, 0) + ESPACE * (ligne.length - 1);
    let x = X + (L - total) / 2;
    for (const el of ligne) {
      pastille(doc, x, ctx.y, el.n, el.largeurPastille);
      if (el.n) {
        doc.font('Helvetica').fontSize(8).fillColor(GRIS)
          .text(nettoyer(el.p.libelle), x + el.largeurPastille + 4, ctx.y + 3.5, { lineBreak: false });
      }
      x += el.largeur + ESPACE;
    }
    ctx.y += 20;
  }
};
