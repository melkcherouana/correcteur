import PDFDocument from 'pdfkit';

const INDIGO   = '#4338ca';
const GRIS     = '#64748b';
const NOIR     = '#1e293b';
const BLANC    = '#ffffff';
const GRIS_L   = '#f8fafc';
const BORDER   = '#e2e8f0';

const TYPE_LABELS = {
  facture:         'FACTURE',
  devis:           'DEVIS',
  bon_de_commande: 'BON DE COMMANDE',
  bon_de_livraison:'BON DE LIVRAISON',
  bon_de_retour:   'BON DE RETOUR',
};

const TYPE_COULEURS = {
  facture:          '#dc2626',
  devis:            '#2563eb',
  bon_de_commande:  '#7c3aed',
  bon_de_livraison: '#059669',
  bon_de_retour:    '#d97706',
};

function fmt(n) {
  return typeof n === 'number'
    ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
}

function entete(doc, document) {
  const couleur = TYPE_COULEURS[document.type] ?? INDIGO;
  const typeLabel = TYPE_LABELS[document.type] ?? document.type.toUpperCase();

  // Bande de couleur en haut
  doc.rect(0, 0, 595, 8).fillColor(couleur).fill();

  // Titre document
  doc
    .fillColor(couleur)
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(typeLabel, 40, 24);

  doc
    .fillColor(GRIS)
    .fontSize(9)
    .font('Helvetica')
    .text(`N° ${document.numero ?? ''}`, 40, 52)
    .text(`Du : ${document.date ?? ''}`, 40, 64);

  if (document.objet) {
    doc
      .fillColor(NOIR)
      .fontSize(9)
      .font('Helvetica')
      .text(`Objet : ${document.objet}`, 40, 78, { width: 300 });
  }

  // Encadrés émetteur / destinataire
  const boxH = 85;
  const y = 96;

  // Émetteur
  doc.rect(40, y, 230, boxH).fillColor(GRIS_L).fill();
  doc.rect(40, y, 230, boxH).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fillColor(GRIS).fontSize(7).font('Helvetica-Bold').text('ÉMETTEUR', 48, y + 6);
  const em = document.emetteur ?? {};
  doc
    .fillColor(NOIR).fontSize(9).font('Helvetica-Bold')
    .text(em.raisonSociale ?? '', 48, y + 18, { width: 214 });
  doc
    .fillColor(GRIS).fontSize(8).font('Helvetica')
    .text([em.adresse, `${em.codePostal ?? ''} ${em.ville ?? ''}`, em.tel, em.email].filter(Boolean).join('\n'), 48, y + 32, { width: 214, lineGap: 1 });
  if (em.siret) {
    doc.fillColor(GRIS).fontSize(7).text(`SIRET : ${em.siret}`, 48, y + 72);
  }

  // Destinataire
  doc.rect(325, y, 230, boxH).fillColor(GRIS_L).fill();
  doc.rect(325, y, 230, boxH).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fillColor(GRIS).fontSize(7).font('Helvetica-Bold').text('DESTINATAIRE', 333, y + 6);
  const dest = document.destinataire ?? {};
  doc
    .fillColor(NOIR).fontSize(9).font('Helvetica-Bold')
    .text(dest.raisonSociale ?? '', 333, y + 18, { width: 214 });
  doc
    .fillColor(GRIS).fontSize(8).font('Helvetica')
    .text([dest.adresse, `${dest.codePostal ?? ''} ${dest.ville ?? ''}`, dest.contact].filter(Boolean).join('\n'), 333, y + 32, { width: 214, lineGap: 1 });

  doc.y = y + boxH + 16;
}

function tableau(doc, lignes) {
  const colX  = [40, 120, 340, 400, 460, 515];
  const colW  = [78, 218, 58, 58, 54, 40];
  const heads = ['Référence', 'Désignation', 'Qté', 'P.U. HT', 'Total HT', 'U.'];

  // En-tête tableau
  doc.rect(40, doc.y, 515, 18).fillColor('#1e293b').fill();
  heads.forEach((h, i) => {
    doc
      .fillColor(BLANC).fontSize(8).font('Helvetica-Bold')
      .text(h, colX[i], doc.y - 14, { width: colW[i], align: i >= 2 ? 'right' : 'left' });
  });
  doc.y += 6;

  // Lignes
  let alt = false;
  for (const l of (lignes ?? [])) {
    if (doc.y > 700) doc.addPage();
    const h = 18;
    if (alt) doc.rect(40, doc.y, 515, h).fillColor('#f8fafc').fill();
    alt = !alt;

    const yL = doc.y + 4;
    doc
      .fillColor(GRIS).fontSize(8).font('Helvetica')
      .text(l.reference ?? '', colX[0], yL, { width: colW[0] });
    doc
      .fillColor(NOIR).fontSize(8).font('Helvetica')
      .text(l.designation ?? '', colX[1], yL, { width: colW[1] });
    doc
      .fillColor(GRIS).fontSize(8).font('Helvetica')
      .text(String(l.quantite ?? ''), colX[2], yL, { width: colW[2], align: 'right' });
    doc
      .fillColor(GRIS).fontSize(8).font('Helvetica')
      .text(fmt(l.prixUnitaireHT), colX[3], yL, { width: colW[3], align: 'right' });
    doc
      .fillColor(NOIR).fontSize(8).font('Helvetica-Bold')
      .text(fmt(l.totalHT), colX[4], yL, { width: colW[4], align: 'right' });
    doc
      .fillColor(GRIS).fontSize(7).font('Helvetica')
      .text(l.unite ?? '', colX[5], yL, { width: colW[5], align: 'right' });
    doc.y += h;
  }

  // Ligne de séparation
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y += 6;
}

function totaux(doc, document) {
  const xLabel = 380;
  const xVal   = 490;
  const w      = 65;
  const couleur = TYPE_COULEURS[document.type] ?? INDIGO;

  const lignes = [
    { label: 'Total HT',       val: fmt(document.totalHT),  bold: false },
    { label: `TVA (${document.tauxTVA ?? 20} %)`, val: fmt(document.totalTVA), bold: false },
    { label: 'TOTAL TTC',      val: fmt(document.totalTTC), bold: true },
  ];

  for (const r of lignes) {
    const y = doc.y;
    if (r.bold) {
      doc.rect(xLabel - 4, y - 2, 179, 18).fillColor(couleur).fill();
      doc.fillColor(BLANC).fontSize(10).font('Helvetica-Bold')
        .text(r.label, xLabel, y + 2, { width: 100 })
        .text(r.val + ' €', xVal, y + 2, { width: w, align: 'right' });
      doc.y += 20;
    } else {
      doc.fillColor(GRIS).fontSize(9).font('Helvetica')
        .text(r.label, xLabel, y, { width: 100 })
        .text(r.val + ' €', xVal, y, { width: w, align: 'right' });
      doc.y += 16;
    }
  }
}

function piedDePage(doc, document, numero, total) {
  const couleur = TYPE_COULEURS[document.type] ?? INDIGO;

  doc.rect(0, 805, 595, 3).fillColor(couleur).fill();

  if (document.conditions) {
    doc
      .fillColor(GRIS).fontSize(7).font('Helvetica')
      .text(`Conditions : ${document.conditions}`, 40, 812, { width: 400 });
  }
  if (document.notes) {
    doc
      .fillColor(GRIS).fontSize(7).font('Helvetica')
      .text(document.notes, 40, 822, { width: 400 });
  }
  doc
    .fillColor(GRIS).fontSize(7).font('Helvetica')
    .text(`Document pédagogique fictif — EvalPro   |   Page ${numero} / ${total}`, 40, 832, { align: 'center', width: 515 });
}

// TODO : le scénario n'est actuellement affiché nulle part dans le PDF généré.
export const genererPdfDocumentsCommerciaux = (documents, _scenario) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: false });
    const buf = [];
    doc.on('data', (b) => buf.push(b));
    doc.on('end', () => resolve(Buffer.concat(buf)));
    doc.on('error', reject);

    const nbDocs = documents.length;

    for (let i = 0; i < nbDocs; i++) {
      const d = documents[i];
      doc.addPage();

      entete(doc, d);
      tableau(doc, d.lignes);
      doc.moveDown(0.5);
      totaux(doc, d);

      piedDePage(doc, d, i + 1, nbDocs);
    }

    doc.end();
  });
