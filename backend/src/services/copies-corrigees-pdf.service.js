import PDFDocument from 'pdfkit';
import { LIBELLES_CATEGORIES } from './copie-annotee.service.js';

// PDF unique regroupant toutes les copies annotées : page de garde puis, pour
// chaque élève, le texte de sa copie avec les mêmes annotations que le Word
// (surlignage rouge/vert, texte barré, renvois numérotés) et le bilan de correction.
// pdfkit ne sait pas convertir un .docx : le texte est donc remis en page ici.

const MARGE = 50;
const BLEU = '#3730a3';
const GRIS = '#64748b';
const NOIR = '#1e293b';
const ROUGE = '#c00000';
// Teintes opaques : des rectangles semi-transparents juxtaposés laisseraient des bandes plus foncées entre les mots
const SURLIGNAGE = { erreur: '#ffa6a6', correct: '#a6ecc3' };

// Les polices standard de pdfkit ne couvrent que le jeu WinAnsi
const WINANSI_SUPPL = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const nettoyer = (s = '') =>
  String(s)
    .replace(/[\t\u00a0\u202f]/g, ' ')
    .replace(/[\u2010-\u2012]/g, '-')
    .replace(/./gsu, (c) => (c.charCodeAt(0) <= 0xff || WINANSI_SUPPL.includes(c) ? c : '?'));

const nomEleve = (e) => `${e.nom} ${e.prenom}`;

const basDePage = (doc) => doc.page.height - doc.page.margins.bottom;

const assurerPlace = (doc, hauteur) => {
  if (doc.y + hauteur > basDePage(doc)) doc.addPage();
};

// ─── Mise en page manuelle d'un paragraphe annoté ─────────────────────────────
// (pdfkit ne sait pas surligner un morceau de texte en flux continu)

const ecrireParagraphe = (doc, { titre, segments }) => {
  const taille = titre ? 12 : 10.5;
  const police = titre ? 'Helvetica-Bold' : 'Helvetica';
  const interligne = taille * 1.45;
  const largeur = doc.page.width - 2 * MARGE;
  doc.font(police).fontSize(taille);

  if (!segments.some((s) => s.texte.trim())) {
    doc.y += interligne * 0.5;
    return;
  }

  let x = MARGE;
  let y = doc.y;
  const nouvelleLigne = () => {
    x = MARGE;
    y += interligne;
    if (y + interligne > basDePage(doc)) {
      doc.addPage();
      doc.font(police).fontSize(taille);
      y = doc.page.margins.top;
    }
  };
  if (y + interligne > basDePage(doc)) {
    doc.addPage();
    doc.font(police).fontSize(taille);
    y = doc.page.margins.top;
  }

  for (const seg of segments) {
    const mots = nettoyer(seg.texte).split(/(\s+)/).filter(Boolean);
    for (const mot of mots) {
      const espace = /^\s+$/.test(mot);
      if (espace && x === MARGE) continue;
      const texte = espace ? ' ' : mot;
      const l = doc.widthOfString(texte);
      if (!espace && x + l > MARGE + largeur && x > MARGE) nouvelleLigne();

      if (seg.style) {
        doc.save().rect(x, y - 1, l, taille + 3).fill(SURLIGNAGE[seg.style]).restore();
      }
      doc.fillColor(NOIR).font(police).fontSize(taille).text(texte, x, y, { lineBreak: false });
      if (seg.barre && !espace) {
        doc.save().moveTo(x, y + taille * 0.45).lineTo(x + l, y + taille * 0.45)
          .lineWidth(0.9).strokeColor(ROUGE).stroke().restore();
      }
      x += l;
    }
    // Renvoi vers l'annotation, en exposant
    if (seg.numero) {
      const renvoi = `[${seg.numero}]`;
      doc.font('Helvetica-Bold').fontSize(7);
      const l = doc.widthOfString(renvoi);
      if (x + l > MARGE + largeur) nouvelleLigne();
      doc.fillColor(ROUGE).text(renvoi, x + 1, y - 2, { lineBreak: false });
      x += l + 2;
      doc.font(police).fontSize(taille);
    }
  }
  doc.x = MARGE;
  doc.y = y + interligne + 3;
};

// ─── Blocs ────────────────────────────────────────────────────────────────────

const titreSection = (doc, texte, couleur = BLEU) => {
  assurerPlace(doc, 40);
  doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor(couleur)
    .text(nettoyer(texte), MARGE, doc.y, { width: doc.page.width - 2 * MARGE });
  doc.moveDown(0.3);
};

const texteCourant = (doc, texte, options = {}) => {
  doc.font(options.gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.taille ?? 10).fillColor(options.couleur ?? NOIR)
    .text(nettoyer(texte), MARGE + (options.retrait ?? 0), doc.y, { width: doc.page.width - 2 * MARGE - (options.retrait ?? 0), ...options.pdf });
};

const pastille = (doc, x, y, couleur, barre = false) => {
  doc.save().rect(x, y, 26, 11).fill(couleur).restore();
  if (barre) doc.save().moveTo(x + 2, y + 5.5).lineTo(x + 24, y + 5.5).lineWidth(0.9).strokeColor(ROUGE).stroke().restore();
};

const legende = (doc) => {
  const y = doc.y;
  pastille(doc, MARGE, y, SURLIGNAGE.erreur);
  doc.font('Helvetica').fontSize(9).fillColor(NOIR).text('Erreur (détail en annotation)', MARGE + 32, y + 1, { lineBreak: false });
  pastille(doc, MARGE + 190, y, SURLIGNAGE.correct);
  doc.text('Point réussi', MARGE + 222, y + 1, { lineBreak: false });
  pastille(doc, MARGE + 310, y, SURLIGNAGE.erreur, true);
  doc.text('Réponse fausse (barrée)', MARGE + 342, y + 1, { lineBreak: false });
  doc.x = MARGE;
  doc.y = y + 20;
};

// ─── Page de garde ────────────────────────────────────────────────────────────

const pageDeGarde = (doc, { evaluation, copies, ignorees }) => {
  const largeur = doc.page.width - 2 * MARGE;
  doc.rect(MARGE, MARGE, largeur, 60).fillColor('#eef2ff').fill();
  doc.fillColor(BLEU).font('Helvetica-Bold').fontSize(18).text('EvalPro', MARGE + 15, MARGE + 15)
    .font('Helvetica').fontSize(10).fillColor(GRIS).text('Lycée professionnel', MARGE + 15, MARGE + 36);

  doc.font('Helvetica-Bold').fontSize(24).fillColor(NOIR).text('Copies corrigées', MARGE, 170, { width: largeur, align: 'center' });
  doc.moveDown(0.4).font('Helvetica').fontSize(15).fillColor(BLEU).text(nettoyer(evaluation.titre), { width: largeur, align: 'center' });
  doc.moveDown(1.5);

  const infos = [
    ['Classe', evaluation.classe?.nom],
    ['Matière', evaluation.sequence?.matiere?.nom],
    ['Date', evaluation.datePassage ? new Date(evaluation.datePassage).toLocaleDateString('fr-FR') : null],
    ['Enseignant', evaluation.createur ? `${evaluation.createur.prenom} ${evaluation.createur.nom}` : null],
    ['Copies', `${copies.length} copie${copies.length > 1 ? 's' : ''} annotée${copies.length > 1 ? 's' : ''}`],
  ].filter(([, v]) => v);
  if (copies.length) {
    const moyenne = copies.reduce((s, c) => s + (c.resultat.noteGlobale / (c.resultat.noteMax || 1)) * evaluation.noteMax, 0) / copies.length;
    infos.push(['Moyenne', `${moyenne.toFixed(1).replace('.', ',')}/${evaluation.noteMax}`]);
  }
  for (const [label, valeur] of infos) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(GRIS).text(`${label} :`, MARGE + 110, y, { width: 90 });
    doc.font('Helvetica').fillColor(NOIR).text(nettoyer(valeur), MARGE + 205, y, { width: largeur - 205 });
    doc.moveDown(0.3);
  }

  // Récapitulatif des notes
  doc.moveDown(1.2);
  const colonnes = [
    { titre: 'Élève', x: MARGE + 8, l: 220 },
    { titre: 'Note', x: MARGE + 240, l: 70 },
    { titre: 'Mention', x: MARGE + 320, l: 100 },
    { titre: 'Erreurs', x: MARGE + 430, l: 60 },
  ];
  const ligne = (valeurs, entete = false) => {
    assurerPlace(doc, 20);
    const y = doc.y;
    if (entete) doc.rect(MARGE, y - 3, largeur, 18).fillColor('#eef2ff').fill();
    else doc.moveTo(MARGE, y + 14).lineTo(MARGE + largeur, y + 14).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.font(entete ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(entete ? BLEU : NOIR);
    colonnes.forEach((c, i) => doc.text(nettoyer(valeurs[i]), c.x, y, { width: c.l, lineBreak: false, ellipsis: true }));
    doc.x = MARGE;
    doc.y = y + 18;
  };
  ligne(colonnes.map((c) => c.titre), true);
  for (const c of copies) {
    ligne([nomEleve(c.eleve), `${c.resultat.noteGlobale}/${c.resultat.noteMax}`, c.resultat.mention ?? '', String(c.modele.notes.length)]);
  }

  if (ignorees.length) {
    titreSection(doc, 'Copies non incluses', ROUGE);
    ignorees.forEach((i) => texteCourant(doc, `•  ${nomEleve(i.eleve)} — ${i.raison}`, { taille: 9.5 }));
  }

  doc.moveDown(1);
  assurerPlace(doc, 40);
  texteCourant(doc, 'Légende des annotations', { gras: true, taille: 10, couleur: BLEU });
  doc.moveDown(0.3);
  legende(doc);
  texteCourant(doc, `Document généré le ${new Date().toLocaleDateString('fr-FR')}.`, { taille: 8.5, couleur: GRIS });
};

// ─── Copie d'un élève ─────────────────────────────────────────────────────────

const pageCopie = (doc, { eleve, resultat, fichierNom, modele }) => {
  doc.addPage();
  const largeur = doc.page.width - 2 * MARGE;

  // En-tête de copie
  doc.rect(MARGE, MARGE, largeur, 46).fillColor('#eef2ff').fill();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NOIR).text(nettoyer(nomEleve(eleve)), MARGE + 12, MARGE + 9, { width: 300 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(nettoyer(fichierNom), MARGE + 12, MARGE + 28, { width: 300, lineBreak: false, ellipsis: true });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BLEU)
    .text(`${resultat.noteGlobale}/${resultat.noteMax}`, MARGE, MARGE + 8, { width: largeur - 12, align: 'right' });
  if (resultat.mention) {
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(nettoyer(resultat.mention), MARGE, MARGE + 28, { width: largeur - 12, align: 'right' });
  }
  doc.x = MARGE;
  doc.y = MARGE + 62;

  // Texte de la copie annoté
  for (const p of modele.paragraphes) ecrireParagraphe(doc, p);

  // Annotations numérotées
  if (modele.notes.length) {
    titreSection(doc, 'Annotations');
    for (const n of modele.notes) {
      assurerPlace(doc, 30);
      texteCourant(doc, `[${n.numero}] ${LIBELLES_CATEGORIES[n.categorie] ?? n.categorie} — « ${n.extrait} »`, { gras: true, taille: 9.5, couleur: ROUGE });
      texteCourant(doc, n.explication, { taille: 9.5, retrait: 14 });
      if (n.correction) texteCourant(doc, `Correction : ${n.correction}`, { taille: 9.5, retrait: 14, couleur: '#15803d' });
      doc.moveDown(0.3);
    }
  }

  // Bilan
  const { bilan } = modele;
  titreSection(doc, 'Correction');
  texteCourant(doc, `Note obtenue : ${bilan.note}`, { gras: true, taille: 11 });
  doc.moveDown(0.5);
  texteCourant(doc, 'Appréciation générale', { gras: true });
  texteCourant(doc, bilan.appreciation);
  if (bilan.axes.length) {
    doc.moveDown(0.5);
    texteCourant(doc, 'Axes de progrès', { gras: true });
    bilan.axes.forEach((a) => texteCourant(doc, `•  ${a}`, { retrait: 8 }));
  }
  if (bilan.aReprendre.length) {
    doc.moveDown(0.5);
    texteCourant(doc, 'Autres points à reprendre', { gras: true });
    bilan.aReprendre.forEach((a) => texteCourant(doc, `•  ${LIBELLES_CATEGORIES[a.categorie] ?? a.categorie} : ${a.texte}`, { retrait: 8 }));
  }
};

// ─── Point d'entrée ───────────────────────────────────────────────────────────

export const genererPdfCopiesCorrigees = ({ evaluation, copies, ignorees }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGE, size: 'A4', bufferPages: true, info: { Title: `Copies corrigées — ${evaluation.titre}` } });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    pageDeGarde(doc, { evaluation, copies, ignorees });
    copies.forEach((c) => pageCopie(doc, c));

    // Pagination (la marge basse est neutralisée le temps d'écrire le pied de page)
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const margeBasse = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
        .text(`${nettoyer(evaluation.titre)} — page ${i + 1}/${count}`, MARGE, doc.page.height - 30, { width: doc.page.width - 2 * MARGE, align: 'center', lineBreak: false });
      doc.page.margins.bottom = margeBasse;
    }
    doc.end();
  });
