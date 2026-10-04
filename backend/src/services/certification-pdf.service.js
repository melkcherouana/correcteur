import PDFDocument from 'pdfkit';
import { profilCertificationEleve } from './certification.service.js';

// PDF « Profil de certification » d'un élève (PDFKit), A4 portrait.
// Mêmes données que la grille de synthèse : tous les pôles et toutes les compétences,
// niveaux dessinés en pastilles (aucun symbole Unicode : la police standard ne les a pas).

const MARGE = 40;
const BAS_DE_PAGE = 28; // réservé au pied de page

const BLEU = '#3730a3';
const GRIS = '#64748b';
const NOIR = '#1e293b';
const FILET = '#e2e8f0';

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

// Colonnes du tableau d'un pôle
const COL_CODE = 50;
const COL_NIVEAU = 90;
const PADDING = 5;
const TAILLE_TEXTE = 9;
const HAUTEUR_ENTETE_POLE = 20;
const HAUTEUR_ENTETE_COLONNES = 16;
const PASTILLE = { largeur: 66, hauteur: 14 };

// Les polices standard de PDFKit ne couvrent que le jeu WinAnsi (accents français compris)
const WINANSI_SUPPL = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const nettoyer = (s = '') =>
  String(s)
    .replace(/[\t\u00a0\u202f]/g, ' ')
    .replace(/[\u2010-\u2012]/g, '-')
    .replace(/./gsu, (c) => (c.charCodeAt(0) <= 0xff || WINANSI_SUPPL.includes(c) ? c : '?'));

// ─── Dessins élémentaires ─────────────────────────────────────────────────────

const pastille = (doc, x, y, niveau, largeur = PASTILLE.largeur) => {
  const p = PASTILLES[niveau] ?? NON_EVALUE;
  doc.save();
  doc.roundedRect(x, y, largeur, PASTILLE.hauteur, 4).fillColor(p.fond).fill();
  if (p.bordure) doc.roundedRect(x, y, largeur, PASTILLE.hauteur, 4).lineWidth(0.7).strokeColor(p.bordure).stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(p.texte)
    .text(nettoyer(p.court), x, y + 3.6, { width: largeur, align: 'center', lineBreak: false });
};

// ─── Mise en page ─────────────────────────────────────────────────────────────

export const genererPdfCertification = async (eleveId) =>
  dessinerPdfCertification(await profilCertificationEleve(eleveId));

// Dessin du PDF à partir du profil (voir construireProfil dans certification.service.js)
export const dessinerPdfCertification = ({ eleve, stats, poles }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGE, bufferPages: true, info: { Title: 'Profil de certification' } });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const L = doc.page.width - 2 * MARGE; // largeur utile, commune à tous les blocs
    const X = MARGE;
    const limiteBas = () => doc.page.height - MARGE - BAS_DE_PAGE;
    let y = MARGE;

    // ─── Bandeau titre ──────────────────────────────────────────────────────
    doc.rect(X, y, L, 55).fillColor('#eef2ff').fill();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(BLEU).text('PROFIL DE CERTIFICATION', X + 15, y + 12, { lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor(GRIS)
      .text('EvalPro — Lycée professionnel', X + 15, y + 34, { lineBreak: false })
      .text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, X, y + 34, { width: L - 15, align: 'right', lineBreak: false });
    y += 55 + 10;

    // ─── Bloc élève ─────────────────────────────────────────────────────────
    const lignes = [
      eleve.classe && `Classe : ${eleve.classe}`,
      eleve.filiere && `Filière : ${eleve.filiere}`,
      `Compétences : ${stats.acquises} acquises / ${stats.total} au total`,
    ].filter(Boolean);
    const hauteurBloc = 30 + lignes.length * 12 + 6;
    doc.rect(X, y, L, hauteurBloc).fillColor('#f8fafc').fill();
    doc.font('Helvetica-Bold').fontSize(14).fillColor(NOIR)
      .text(nettoyer(`${eleve.prenom} ${eleve.nom}`), X + 15, y + 10, { width: L - 230, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(9).fillColor(GRIS);
    lignes.forEach((t, i) => doc.text(nettoyer(t), X + 15, y + 30 + i * 12, { width: L - 230, lineBreak: false }));

    // Barre de progression, alignée à droite dans la largeur utile
    const largeurBarre = 150;
    const xBarre = X + L - 15 - 40 - largeurBarre;
    const yBarre = y + hauteurBloc / 2 - 4;
    doc.roundedRect(xBarre, yBarre, largeurBarre, 8, 4).fillColor(FILET).fill();
    if (stats.pourcentage > 0) {
      doc.roundedRect(xBarre, yBarre, Math.max(8, (largeurBarre * stats.pourcentage) / 100), 8, 4).fillColor(BLEU).fill();
    }
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLEU)
      .text(`${stats.pourcentage} %`, xBarre + largeurBarre + 6, yBarre - 2, { width: 40, lineBreak: false });
    y += hauteurBloc + 14;

    // ─── Titre de section, sur toute la largeur ─────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLEU).text('Tableau de synthèse par pôle', X, y, { width: L, lineBreak: false });
    y += 18;

    // ─── Tableaux par pôle ──────────────────────────────────────────────────
    const xLibelle = X + COL_CODE;
    const largeurLibelle = L - COL_CODE - COL_NIVEAU;
    const xNiveau = X + L - COL_NIVEAU;

    const nouvellePage = () => {
      doc.addPage();
      y = MARGE;
    };

    const enteteColonnes = () => {
      doc.rect(X, y, L, HAUTEUR_ENTETE_COLONNES).fillColor('#f1f5f9').fill();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRIS);
      doc.text('Code', X + PADDING, y + 5, { width: COL_CODE - PADDING, lineBreak: false });
      doc.text('Compétence', xLibelle + PADDING, y + 5, { width: largeurLibelle - 2 * PADDING, lineBreak: false });
      doc.text('Niveau', xNiveau, y + 5, { width: COL_NIVEAU, align: 'center', lineBreak: false });
      y += HAUTEUR_ENTETE_COLONNES;
    };

    const entetePole = (pole, couleur, suite = false) => {
      doc.rect(X, y, L, HAUTEUR_ENTETE_POLE).fillColor(couleur).fill();
      const titre = `${pole.libelle}${pole.court ? ` · ${pole.court}` : ''}${suite ? ' (suite)' : ''}`;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff')
        .text(nettoyer(titre), X + 8, y + 5.5, { width: L - 130, lineBreak: false, ellipsis: true })
        .text(`${pole.acquises}/${pole.competences.length} acquises`, X, y + 5.5, { width: L - 8, align: 'right', lineBreak: false });
      y += HAUTEUR_ENTETE_POLE;
      enteteColonnes();
    };

    // Hauteur d'une ligne : celle du libellé le plus long (retour à la ligne autorisé)
    const hauteurTexte = (c) => {
      doc.font('Helvetica').fontSize(TAILLE_TEXTE);
      return doc.heightOfString(nettoyer(c.description), { width: largeurLibelle - 2 * PADDING });
    };
    const hauteurLigne = (c) => Math.max(hauteurTexte(c), PASTILLE.hauteur) + 2 * PADDING;

    poles.forEach((pole, i) => {
      const couleur = COULEURS_POLES[i % COULEURS_POLES.length];
      const premiere = pole.competences[0];
      // En-tête de pôle jamais seul en bas de page : il faut la place pour au moins une ligne
      const besoin = HAUTEUR_ENTETE_POLE + HAUTEUR_ENTETE_COLONNES + (premiere ? hauteurLigne(premiere) : 0);
      if (y + besoin > limiteBas()) nouvellePage();
      entetePole(pole, couleur);

      pole.competences.forEach((c, j) => {
        const h = hauteurLigne(c);
        const hTexte = hauteurTexte(c);
        // Une ligne n'est jamais coupée : sinon page suivante avec l'en-tête du pôle répété
        if (y + h > limiteBas()) {
          nouvellePage();
          entetePole(pole, couleur, true);
        }
        if (j % 2 === 1) doc.rect(X, y, L, h).fillColor('#fafafa').fill();
        doc.font('Helvetica-Bold').fontSize(TAILLE_TEXTE).fillColor(couleur)
          .text(nettoyer(c.code), X + PADDING, y + (h - TAILLE_TEXTE * 1.15) / 2, { width: COL_CODE - PADDING, lineBreak: false });
        doc.font('Helvetica').fontSize(TAILLE_TEXTE).fillColor(NOIR)
          .text(nettoyer(c.description), xLibelle + PADDING, y + (h - hTexte) / 2, { width: largeurLibelle - 2 * PADDING });
        pastille(doc, xNiveau + (COL_NIVEAU - PASTILLE.largeur) / 2, y + (h - PASTILLE.hauteur) / 2, c.niveau);
        doc.moveTo(X, y + h).lineTo(X + L, y + h).lineWidth(0.5).strokeColor(FILET).stroke();
        y += h;
      });
      y += 10;
    });

    if (!poles.length) {
      doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Aucune compétence dans le référentiel.', X, y, { width: L });
      y += 20;
    }

    // ─── Légende centrée, sur une ou deux lignes dans la largeur utile ──────
    const elements = [...Object.keys(PASTILLES), null].map((n) => {
      const p = PASTILLES[n] ?? NON_EVALUE;
      const largeurPastille = n ? 22 : 52;
      doc.font('Helvetica').fontSize(8);
      const largeurLibelle = n ? doc.widthOfString(p.libelle) : 0;
      return { n, p, largeurPastille, largeurLibelle, largeur: largeurPastille + (n ? 4 + largeurLibelle : 0) };
    });
    const ESPACE = 16;
    const lignesLegende = [[]];
    let largeurCourante = 0;
    for (const el of elements) {
      if (largeurCourante && largeurCourante + ESPACE + el.largeur > L) {
        lignesLegende.push([]);
        largeurCourante = 0;
      }
      largeurCourante += (largeurCourante ? ESPACE : 0) + el.largeur;
      lignesLegende[lignesLegende.length - 1].push(el);
    }
    const hauteurLegende = 14 + lignesLegende.length * 20;
    if (y + hauteurLegende > limiteBas()) nouvellePage();
    doc.moveTo(X, y).lineTo(X + L, y).lineWidth(0.5).strokeColor(FILET).stroke();
    y += 10;
    for (const ligne of lignesLegende) {
      const total = ligne.reduce((s, el) => s + el.largeur, 0) + ESPACE * (ligne.length - 1);
      let x = X + (L - total) / 2;
      for (const el of ligne) {
        pastille(doc, x, y, el.n, el.largeurPastille);
        if (el.n) {
          doc.font('Helvetica').fontSize(8).fillColor(GRIS)
            .text(nettoyer(el.p.libelle), x + el.largeurPastille + 4, y + 3.5, { lineBreak: false });
        }
        x += el.largeur + ESPACE;
      }
      y += 20;
    }

    // ─── Pied de page sur toutes les pages ──────────────────────────────────
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const margeBasse = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // évite un saut de page automatique en écrivant dans la marge
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
        .text(`EvalPro — Profil de certification — page ${i + 1}/${count}`, X, doc.page.height - MARGE + 8, { width: L, align: 'center', lineBreak: false });
      doc.page.margins.bottom = margeBasse;
    }
    doc.end();
  });
