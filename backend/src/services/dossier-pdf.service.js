import PDFDocument from 'pdfkit';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  indigo:   '#3730a3',
  indigoL:  '#e0e7ff',
  indigoM:  '#6366f1',
  slate:    '#1e293b',
  gris:     '#64748b',
  grisL:    '#f1f5f9',
  grisXL:   '#f8fafc',
  blanc:    '#ffffff',
  border:   '#cbd5e1',
  rouge:    '#dc2626',
  rougeL:   '#fef2f2',
  vert:     '#15803d',
  vertL:    '#f0fdf4',
  amber:    '#d97706',
  amberL:   '#fffbeb',
  bleu:     '#1d4ed8',
  bleuL:    '#eff6ff',
  vide:     '#f0f4ff',   // case à remplir (bleu très pâle)
  videBord: '#6366f1',   // bordure case à remplir
};

// Largeur utile entre marges
const PW = 515; // 595 - 40*2
const ML = 40;  // marge gauche

// ── Helpers de dessin ─────────────────────────────────────────────────────────

/** Rectangle coloré plein */
function rect(doc, x, y, w, h, fill) {
  doc.rect(x, y, w, h).fillColor(fill).fill();
}

/** Bordure seule */
function border(doc, x, y, w, h, stroke = C.border, lw = 0.5) {
  doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(lw).stroke();
}

/** Case "à remplir" avec fond bleu très pâle et bordure pointillée */
function caseVide(doc, x, y, w, h) {
  rect(doc, x, y, w, h, C.vide);
  doc.rect(x, y, w, h).dash(3, { space: 2 }).strokeColor(C.videBord).lineWidth(0.5).stroke();
  doc.undash();
}

/** Texte standard */
function txt(doc, texte, x, y, opts = {}) {
  doc
    .fillColor(opts.color ?? C.slate)
    .fontSize(opts.size ?? 9)
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .text(String(texte ?? ''), x, y, { width: opts.width ?? 200, align: opts.align ?? 'left', lineGap: 1 });
}

/** Ligne horizontale */
function hline(doc, y, x1 = ML, x2 = ML + PW, color = C.border, lw = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(lw).stroke();
}

/** Vérifie si on dépasse la page et en ajoute une si besoin */
function checkPage(doc, marge = 100) {
  if (doc.y > 842 - marge) doc.addPage();
}

// ── COMPOSANTS RÉUTILISABLES ──────────────────────────────────────────────────

function headerBandeau(doc, texteGauche, texteDroit, couleur = C.indigo) {
  rect(doc, 0, 0, 595, 10, couleur);
  txt(doc, texteGauche, ML, 18, { bold: true, size: 8, color: couleur });
  txt(doc, texteDroit, ML, 18, { size: 7, color: C.gris, width: PW, align: 'right' });
  doc.y = 34;
}

function encadreConsigne(doc, texte) {
  const y = doc.y;
  rect(doc, ML, y, PW, 2, C.amber);
  const lines = Math.ceil(texte.length / 90);
  const h = 14 + lines * 13;
  rect(doc, ML, y + 2, PW, h, C.amberL);
  border(doc, ML, y + 2, PW, h, C.amber);
  txt(doc, texte, ML + 8, y + 8, { size: 8, color: '#92400e', width: PW - 16 });
  doc.y = y + h + 10;
}

// ── PAGE DE GARDE ─────────────────────────────────────────────────────────────

function pageGarde(doc, dossier) {
  // Bande indigo haut
  rect(doc, 0, 0, 595, 120, C.indigo);

  txt(doc, 'SITUATION PROFESSIONNELLE', ML, 22, { bold: true, size: 22, color: C.blanc, width: PW });
  txt(doc, dossier.titre ?? '', ML, 52, { size: 13, color: '#c7d2fe', width: PW });
  txt(doc, `Filière : ${dossier.entreprise?.activite ?? ''}  ·  Niveau : ${dossier.niveau ?? 'BAC PRO'}  ·  Durée : ${dossier.dureeMinutes ?? 120} minutes  ·  Barème : ${dossier.baremeTotal ?? 20} points`, ML, 80, { size: 8, color: '#c7d2fe', width: PW });

  doc.y = 140;

  // Encadré candidat
  rect(doc, ML, 140, PW, 65, C.grisXL);
  border(doc, ML, 140, PW, 65);
  txt(doc, 'IDENTIFICATION DU CANDIDAT', ML + 8, 148, { bold: true, size: 8, color: C.gris, width: 200 });

  const fields = [['NOM & Prénom :', 160, 185], ['Classe :', 300, 185], ['Date :', 420, 185],
                  ['Établissement :', 160, 202]];
  for (const [label, xLbl, y] of fields) {
    txt(doc, label, ML + 8, y, { size: 8, color: C.gris, bold: true, width: 90 });
    const xLine = ML + 8 + (xLbl - ML - 16);
    doc.moveTo(xLine, y + 11).lineTo(xLine + 115, y + 11).strokeColor(C.border).lineWidth(0.5).stroke();
  }

  doc.y = 222;

  // Contexte
  rect(doc, ML, doc.y, PW, 16, C.slate);
  txt(doc, 'CONTEXTE', ML + 8, doc.y + 3, { bold: true, size: 9, color: C.blanc, width: 200 });
  doc.y += 22;
  rect(doc, ML, doc.y, PW, 2, C.indigoM);
  doc.y += 8;
  txt(doc, dossier.contexte ?? '', ML + 6, doc.y, { size: 9, color: C.slate, width: PW - 12 });
  doc.y += 28;

  // Mise en situation
  rect(doc, ML, doc.y, PW, 16, C.indigoM);
  txt(doc, 'MISE EN SITUATION', ML + 8, doc.y + 3, { bold: true, size: 9, color: C.blanc, width: 300 });
  doc.y += 22;
  txt(doc, dossier.misEnSituation ?? '', ML + 6, doc.y, { size: 9, color: C.slate, width: PW - 12 });
  doc.y += 30;

  // Tableau des tâches
  rect(doc, ML, doc.y, PW, 16, C.slate);
  txt(doc, 'TRAVAIL DEMANDÉ', ML + 8, doc.y + 3, { bold: true, size: 9, color: C.blanc, width: 200 });
  doc.y += 16;

  // En-tête tableau tâches
  rect(doc, ML, doc.y, PW, 16, C.grisL);
  border(doc, ML, doc.y, PW, 16);
  txt(doc, 'Tâche', ML + 6, doc.y + 3, { bold: true, size: 8, color: C.gris, width: 30 });
  txt(doc, 'Intitulé', ML + 50, doc.y + 3, { bold: true, size: 8, color: C.gris, width: 320 });
  txt(doc, 'Annexe', ML + 390, doc.y + 3, { bold: true, size: 8, color: C.gris, width: 60, align: 'center' });
  txt(doc, 'Points', ML + 455, doc.y + 3, { bold: true, size: 8, color: C.gris, width: 55, align: 'right' });
  doc.y += 16;

  let totalPts = 0;
  for (const t of (dossier.taches ?? [])) {
    checkPage(doc, 40);
    const bg = (t.numero ?? 0) % 2 === 0 ? C.grisXL : C.blanc;
    rect(doc, ML, doc.y, PW, 16, bg);
    border(doc, ML, doc.y, PW, 16);

    rect(doc, ML, doc.y, 40, 16, C.indigoL);
    txt(doc, `T${t.numero}`, ML + 8, doc.y + 3, { bold: true, size: 8, color: C.indigo, width: 24, align: 'center' });
    txt(doc, t.intitule ?? '', ML + 50, doc.y + 3, { size: 8, color: C.slate, width: 330 });
    if (t.annexe) {
      txt(doc, `Annexe ${t.annexe}`, ML + 390, doc.y + 3, { size: 8, color: C.indigoM, width: 60, align: 'center', bold: true });
    }
    txt(doc, `${t.points ?? 0} pts`, ML + 455, doc.y + 3, { bold: true, size: 8, color: C.slate, width: 55, align: 'right' });
    totalPts += (t.points ?? 0);
    doc.y += 16;
  }

  // Ligne total
  rect(doc, ML, doc.y, PW, 18, C.indigo);
  txt(doc, 'TOTAL', ML + 390, doc.y + 4, { bold: true, size: 9, color: C.blanc, width: 55, align: 'center' });
  txt(doc, `${totalPts} pts`, ML + 455, doc.y + 4, { bold: true, size: 10, color: C.blanc, width: 55, align: 'right' });
  doc.y += 22;

  // Liste documents
  if (dossier.documents?.length) {
    doc.y += 8;
    txt(doc, `DOSSIER : ${dossier.documents.length} document${dossier.documents.length > 1 ? 's' : ''} à lire + ${dossier.annexes?.length ?? 0} annexe${(dossier.annexes?.length ?? 0) > 1 ? 's' : ''} à compléter`, ML, doc.y, { bold: true, size: 8, color: C.gris, width: PW });
    doc.y += 12;
    for (const d of dossier.documents) {
      txt(doc, `  ▸  Document ${d.numero} — ${d.titre}`, ML + 4, doc.y, { size: 8, color: C.gris, width: PW });
      doc.y += 11;
    }
    for (const a of (dossier.annexes ?? [])) {
      txt(doc, `  ▸  Annexe ${a.numero} — ${a.titre}  (${a.points} pts)`, ML + 4, doc.y, { size: 8, color: C.indigoM, width: PW, bold: true });
      doc.y += 11;
    }
  }
}

// ── DOCUMENTS À LIRE ──────────────────────────────────────────────────────────

// TODO : l'entreprise n'est actuellement affichée nulle part sur la page catalogue.
function pageCatalogue(doc, doc_data, _entreprise) {
  doc.addPage();
  headerBandeau(doc, `Document ${doc_data.numero} — ${doc_data.titre}`, 'DOCUMENT À LIRE');

  // Titre document
  rect(doc, ML, doc.y, PW, 22, C.bleu);
  txt(doc, `DOCUMENT ${doc_data.numero}`, ML + 8, doc.y + 3, { bold: true, size: 8, color: '#bfdbfe', width: 80 });
  txt(doc, doc_data.titre?.toUpperCase() ?? '', ML + 90, doc.y + 6, { bold: true, size: 11, color: C.blanc, width: PW - 100 });
  doc.y += 28;

  if (!doc_data.articles?.length) return;

  // En-tête tableau catalogue
  rect(doc, ML, doc.y, PW, 18, C.slate);
  const cols = [ML+4, ML+90, ML+330, ML+390, ML+450];
  const heads = ['Référence', 'Désignation', 'Unité', 'Prix HT', 'Conditionn.'];
  const widths = [82, 238, 56, 56, 60];
  heads.forEach((h, i) => txt(doc, h, cols[i], doc.y + 4, { bold: true, size: 8, color: C.blanc, width: widths[i] }));
  doc.y += 18;

  let alt = false;
  for (const art of doc_data.articles) {
    checkPage(doc, 30);
    const bg = alt ? C.grisXL : C.blanc;
    rect(doc, ML, doc.y, PW, 16, bg);
    border(doc, ML, doc.y, PW, 16, C.border);

    txt(doc, art.reference ?? '', cols[0], doc.y + 3, { size: 8, color: C.indigo, bold: true, width: widths[0] });
    txt(doc, art.designation ?? '', cols[1], doc.y + 3, { size: 8, color: C.slate, width: widths[1] });
    txt(doc, art.unite ?? '', cols[2], doc.y + 3, { size: 8, color: C.gris, width: widths[2], align: 'center' });
    txt(doc, art.prixHT != null ? `${Number(art.prixHT).toFixed(2)} €` : '—', cols[3], doc.y + 3, { size: 8, bold: true, color: C.slate, width: widths[3], align: 'right' });
    txt(doc, art.conditionnement ?? '', cols[4], doc.y + 3, { size: 8, color: C.gris, width: widths[4] });
    doc.y += 16;
    alt = !alt;
  }

  rect(doc, ML, doc.y, PW, 14, C.indigoL);
  txt(doc, 'Prix hors taxes — TVA en vigueur applicable sur le montant HT. Tarif valable jusqu\'au 31/12/2024.', ML + 8, doc.y + 3, { size: 7, color: C.indigo, width: PW - 16 });
  doc.y += 18;
}

function pageCorrespondance(doc, doc_data) {
  doc.addPage();
  headerBandeau(doc, `Document ${doc_data.numero} — ${doc_data.titre}`, 'DOCUMENT À LIRE');

  rect(doc, ML, doc.y, PW, 22, C.bleu);
  txt(doc, `DOCUMENT ${doc_data.numero}`, ML + 8, doc.y + 3, { bold: true, size: 8, color: '#bfdbfe', width: 80 });
  txt(doc, doc_data.titre?.toUpperCase() ?? '', ML + 90, doc.y + 6, { bold: true, size: 11, color: C.blanc, width: PW - 100 });
  doc.y += 28;

  // Entêtes correspondance
  const metaRows = [
    ['De :', doc_data.expediteur ?? ''],
    ['À :', doc_data.destinataire ?? ''],
    ['Date :', doc_data.date ?? ''],
    ['Objet :', doc_data.objet ?? ''],
  ];
  for (const [lbl, val] of metaRows) {
    rect(doc, ML, doc.y, PW, 14, C.grisXL);
    border(doc, ML, doc.y, PW, 14);
    txt(doc, lbl, ML + 6, doc.y + 3, { bold: true, size: 8, color: C.gris, width: 50 });
    txt(doc, val, ML + 60, doc.y + 3, { size: 8, color: C.slate, width: PW - 70 });
    doc.y += 14;
  }
  doc.y += 10;
  hline(doc, doc.y);
  doc.y += 10;

  // Lignes commande si présentes
  if (doc_data.lignes?.length) {
    rect(doc, ML, doc.y, PW, 16, C.slate);
    const cols = [ML+4, ML+90, ML+340, ML+400];
    ['Référence','Désignation','Quantité','Unité'].forEach((h, i) =>
      txt(doc, h, cols[i], doc.y + 3, { bold: true, size: 8, color: C.blanc, width: [82,248,56,60][i] })
    );
    doc.y += 16;
    let alt = false;
    for (const l of doc_data.lignes) {
      rect(doc, ML, doc.y, PW, 16, alt ? C.grisXL : C.blanc);
      border(doc, ML, doc.y, PW, 16);
      txt(doc, l.reference ?? '', cols[0], doc.y + 3, { size: 8, bold: true, color: C.indigo, width: 82 });
      txt(doc, l.designation ?? '', cols[1], doc.y + 3, { size: 8, color: C.slate, width: 248 });
      txt(doc, String(l.quantite ?? ''), cols[2], doc.y + 3, { size: 8, bold: true, color: C.slate, width: 56, align: 'right' });
      txt(doc, l.unite ?? '', cols[3], doc.y + 3, { size: 8, color: C.gris, width: 60 });
      doc.y += 16;
      alt = !alt;
    }
    doc.y += 8;
  }

  // Corps texte
  if (doc_data.corps) {
    txt(doc, doc_data.corps, ML + 6, doc.y, { size: 9, color: C.slate, width: PW - 12 });
    doc.y += 30;
  }
}

// ── ANNEXE : FACTURE ──────────────────────────────────────────────────────────

function pageFacture(doc, annexe) {
  doc.addPage();
  headerBandeau(doc, `Annexe ${annexe.numero} — ${annexe.titre}`, `${annexe.points} points`);

  // Badge Annexe
  rect(doc, ML, doc.y, PW, 24, C.rouge);
  txt(doc, `ANNEXE ${annexe.numero}`, ML + 8, doc.y + 2, { bold: true, size: 8, color: '#fecaca', width: 80 });
  txt(doc, annexe.titre?.toUpperCase() ?? '', ML + 90, doc.y + 7, { bold: true, size: 12, color: C.blanc, width: PW - 100 });
  txt(doc, `${annexe.points} POINTS`, ML + 430, doc.y + 7, { bold: true, size: 10, color: '#fecaca', width: 80, align: 'right' });
  doc.y += 30;

  encadreConsigne(doc, annexe.consigne ?? '');

  // En-tête document
  rect(doc, ML, doc.y, PW, 8, C.rouge);
  doc.y += 8;

  rect(doc, ML, doc.y, PW, 30, C.rougeL);
  txt(doc, 'FACTURE', ML + 8, doc.y + 4, { bold: true, size: 18, color: C.rouge, width: 180 });
  txt(doc, `N° ${annexe.numeroDoc ?? 'FAC-____-____'}`, ML + 8, doc.y + 20, { size: 8, color: C.rouge, width: 180 });
  txt(doc, `Date : ${annexe.dateDoc ?? '____________'}`, ML + 200, doc.y + 20, { size: 8, color: C.gris, width: 120 });
  doc.y += 34;

  // Blocs émetteur / client
  const em = annexe.emetteur ?? {};
  const cl = annexe.client ?? {};
  const boxH = 72;
  const yBox = doc.y;

  rect(doc, ML, yBox, 248, boxH, C.grisXL);
  border(doc, ML, yBox, 248, boxH);
  txt(doc, 'ÉMETTEUR', ML + 6, yBox + 5, { bold: true, size: 7, color: C.gris, width: 100 });
  txt(doc, em.raisonSociale ?? '', ML + 6, yBox + 16, { bold: true, size: 10, color: C.slate, width: 234 });
  txt(doc, [em.adresse, `${em.codePostal ?? ''} ${em.ville ?? ''}`, em.tel, em.email].filter(Boolean).join('\n'), ML + 6, yBox + 30, { size: 8, color: C.gris, width: 234, lineGap: 1 });
  if (em.siret) txt(doc, `SIRET : ${em.siret}`, ML + 6, yBox + 60, { size: 7, color: C.gris, width: 234 });

  rect(doc, ML + 267, yBox, 248, boxH, C.grisXL);
  border(doc, ML + 267, yBox, 248, boxH);
  txt(doc, 'CLIENT', ML + 273, yBox + 5, { bold: true, size: 7, color: C.gris, width: 100 });
  txt(doc, cl.raisonSociale ?? '', ML + 273, yBox + 16, { bold: true, size: 10, color: C.slate, width: 234 });
  txt(doc, [cl.adresse, `${cl.codePostal ?? ''} ${cl.ville ?? ''}`, cl.contact].filter(Boolean).join('\n'), ML + 273, yBox + 30, { size: 8, color: C.gris, width: 234, lineGap: 1 });

  doc.y = yBox + boxH + 10;

  // Tableau lignes
  const cols = { ref: ML+2, des: ML+86, qte: ML+318, uni: ML+360, pu: ML+395, rem: ML+435, tot: ML+468 };
  const widths = { ref: 82, des: 230, qte: 40, uni: 32, pu: 38, rem: 30, tot: 44 };

  // En-tête
  rect(doc, ML, doc.y, PW, 17, C.slate);
  const hds = [['Référence', cols.ref, widths.ref, 'left'], ['Désignation', cols.des, widths.des, 'left'],
    ['Qté', cols.qte, widths.qte, 'right'], ['Unité', cols.uni, widths.uni, 'center'],
    ['P.U. HT', cols.pu, widths.pu, 'right'], ['Rem.%', cols.rem, widths.rem, 'right'],
    ['Total HT', cols.tot, widths.tot, 'right']];
  hds.forEach(([h, x, w, align]) => txt(doc, h, x, doc.y + 4, { bold: true, size: 7, color: C.blanc, width: w, align }));
  doc.y += 17;

  let alt = false;
  for (const l of (annexe.lignesFacture ?? [])) {
    checkPage(doc, 80);
    const rowH = 18;
    rect(doc, ML, doc.y, PW, rowH, alt ? C.grisXL : C.blanc);
    border(doc, ML, doc.y, PW, rowH);
    alt = !alt;

    txt(doc, l.reference ?? '', cols.ref, doc.y + 4, { size: 8, bold: true, color: C.indigo, width: widths.ref });
    txt(doc, l.designation ?? '', cols.des, doc.y + 4, { size: 8, color: C.slate, width: widths.des });
    txt(doc, String(l.quantite ?? ''), cols.qte, doc.y + 4, { size: 8, bold: true, color: C.slate, width: widths.qte, align: 'right' });
    txt(doc, l.unite ?? '', cols.uni, doc.y + 4, { size: 7, color: C.gris, width: widths.uni, align: 'center' });
    txt(doc, l.prixUHT != null ? Number(l.prixUHT).toFixed(2) : '', cols.pu, doc.y + 4, { size: 8, color: C.slate, width: widths.pu, align: 'right' });

    if (l.remisePct != null) {
      txt(doc, `${l.remisePct}%`, cols.rem, doc.y + 4, { size: 8, color: C.amber, bold: true, width: widths.rem, align: 'right' });
    } else {
      txt(doc, '—', cols.rem, doc.y + 4, { size: 8, color: C.gris, width: widths.rem, align: 'right' });
    }

    // Case Total HT — à compléter
    if (l.totalHT == null) {
      caseVide(doc, cols.tot - 1, doc.y + 2, widths.tot + 1, rowH - 4);
    } else {
      txt(doc, Number(l.totalHT).toFixed(2), cols.tot, doc.y + 4, { size: 8, bold: true, color: C.slate, width: widths.tot, align: 'right' });
    }
    doc.y += rowH;
  }

  // Bloc totaux
  doc.y += 6;
  const xLbl = ML + 310;
  const xVal = ML + 435;
  const wLbl = 120;
  const wVal = 76;

  const lignesTotaux = [
    ['Total HT', null, false],
    [`TVA ${annexe.tauxTVA ?? 20} %`, null, false],
    ['TOTAL TTC', null, true],
  ];

  for (const [lbl, , bold] of lignesTotaux) {
    const rH = bold ? 20 : 16;
    if (bold) rect(doc, xLbl - 4, doc.y, wLbl + wVal + 12, rH, C.rouge);
    else rect(doc, xLbl - 4, doc.y, wLbl + wVal + 12, rH, C.grisXL);
    border(doc, xLbl - 4, doc.y, wLbl + wVal + 12, rH);
    txt(doc, lbl, xLbl, doc.y + (bold ? 5 : 3), { bold, size: bold ? 9 : 8, color: bold ? C.blanc : C.gris, width: wLbl });
    // Case vide à remplir
    caseVide(doc, xVal, doc.y + 2, wVal - 2, rH - 4);
    txt(doc, '€', xVal + wVal, doc.y + (bold ? 5 : 3), { size: 8, color: bold ? C.blanc : C.gris, width: 14 });
    doc.y += rH;
  }

  doc.y += 10;
  txt(doc, `Mode de règlement : _______________________   Référence commande : _______________________`, ML, doc.y, { size: 8, color: C.gris, width: PW });
  doc.y += 14;
  hline(doc, doc.y);
  doc.y += 6;
  txt(doc, 'Document fictif à usage pédagogique — EvalPro', ML, doc.y, { size: 7, color: C.gris, width: PW, align: 'center' });
}

// ── ANNEXE : FICHE DE STOCK ───────────────────────────────────────────────────

function pageFicheStock(doc, annexe) {
  doc.addPage();
  headerBandeau(doc, `Annexe ${annexe.numero} — ${annexe.titre}`, `${annexe.points} points`);

  // Badge Annexe
  rect(doc, ML, doc.y, PW, 24, C.vert);
  txt(doc, `ANNEXE ${annexe.numero}`, ML + 8, doc.y + 2, { bold: true, size: 8, color: '#bbf7d0', width: 80 });
  txt(doc, annexe.titre?.toUpperCase() ?? '', ML + 90, doc.y + 7, { bold: true, size: 12, color: C.blanc, width: PW - 180 });
  txt(doc, `${annexe.points} POINTS`, ML + 430, doc.y + 7, { bold: true, size: 10, color: '#bbf7d0', width: 80, align: 'right' });
  doc.y += 30;

  encadreConsigne(doc, annexe.consigne ?? '');

  // Fiche article
  const art = annexe.articleStock ?? {};
  rect(doc, ML, doc.y, PW, 50, C.grisXL);
  border(doc, ML, doc.y, PW, 50);
  rect(doc, ML, doc.y, 8, 50, C.vert);

  txt(doc, 'ARTICLE', ML + 14, doc.y + 5, { bold: true, size: 7, color: C.gris, width: 60 });
  txt(doc, art.designation ?? '', ML + 14, doc.y + 16, { bold: true, size: 11, color: C.slate, width: 260 });
  txt(doc, `Référence : ${art.reference ?? ''}   |   Unité : ${art.unite ?? ''}   |   Prix unitaire HT : ${art.prixUnitaireHT != null ? Number(art.prixUnitaireHT).toFixed(2) + ' €' : '—'}`, ML + 14, doc.y + 32, { size: 8, color: C.gris, width: PW - 24 });

  if (art.stockMinimum != null) {
    rect(doc, ML + PW - 130, doc.y + 8, 120, 18, C.amberL);
    border(doc, ML + PW - 130, doc.y + 8, 120, 18, C.amber);
    txt(doc, `Stock mini : ${art.stockMinimum} ${art.unite ?? ''}`, ML + PW - 125, doc.y + 12, { bold: true, size: 8, color: C.amber, width: 110 });
  }
  doc.y += 58;

  // Tableau mouvements
  const c = { date: ML+2, libelle: ML+64, type: ML+295, ent: ML+330, sor: ML+380, solde: ML+430 };
  const w = { date: 60, libelle: 229, type: 32, ent: 48, sor: 48, solde: 82 };

  rect(doc, ML, doc.y, PW, 18, C.slate);
  [['Date', c.date, w.date, 'center'], ['Libellé', c.libelle, w.libelle, 'left'],
   ['Op.', c.type, w.type, 'center'], ['Entrée', c.ent, w.ent, 'right'],
   ['Sortie', c.sor, w.sor, 'right'], ['Stock', c.solde, w.solde, 'right']]
    .forEach(([h, x, ww, align]) => txt(doc, h, x, doc.y + 4, { bold: true, size: 8, color: C.blanc, width: ww, align }));
  doc.y += 18;

  let alt = false;
  for (const mv of (annexe.mouvements ?? [])) {
    checkPage(doc, 40);
    const rH = 18;
    rect(doc, ML, doc.y, PW, rH, alt ? C.grisXL : C.blanc);
    border(doc, ML, doc.y, PW, rH);
    alt = !alt;

    txt(doc, mv.date ?? '', c.date, doc.y + 4, { size: 8, color: C.gris, width: w.date, align: 'center' });
    txt(doc, mv.libelle ?? '', c.libelle, doc.y + 4, { size: 8, color: C.slate, width: w.libelle });

    // Badge type opération
    const typeColors = { SI: [C.indigoL, C.indigo], E: [C.vertL, C.vert], S: [C.rougeL, C.rouge] };
    const [bgT, fgT] = typeColors[mv.typeOp] ?? [C.grisXL, C.gris];
    rect(doc, c.type, doc.y + 3, w.type, rH - 6, bgT);
    txt(doc, mv.typeOp ?? '', c.type, doc.y + 5, { bold: true, size: 7, color: fgT, width: w.type, align: 'center' });

    // Entrée
    if (mv.entree != null) {
      txt(doc, String(mv.entree), c.ent, doc.y + 4, { size: 8, bold: true, color: C.vert, width: w.ent, align: 'right' });
    } else {
      txt(doc, '—', c.ent, doc.y + 4, { size: 8, color: C.gris, width: w.ent, align: 'right' });
    }

    // Sortie
    if (mv.sortie != null) {
      txt(doc, String(mv.sortie), c.sor, doc.y + 4, { size: 8, bold: true, color: C.rouge, width: w.sor, align: 'right' });
    } else {
      txt(doc, '—', c.sor, doc.y + 4, { size: 8, color: C.gris, width: w.sor, align: 'right' });
    }

    // Solde — vide ou rempli
    if (mv.aCompleter || mv.solde == null) {
      caseVide(doc, c.solde, doc.y + 2, w.solde, rH - 4);
    } else {
      rect(doc, c.solde, doc.y + 2, w.solde, rH - 4, C.indigoL);
      txt(doc, String(mv.solde), c.solde, doc.y + 4, { bold: true, size: 8, color: C.indigo, width: w.solde, align: 'right' });
    }
    doc.y += rH;
  }

  // Légende
  doc.y += 8;
  const legende = [['SI', C.indigoL, C.indigo, 'Stock Initial'], ['E', C.vertL, C.vert, 'Entrée en stock'], ['S', C.rougeL, C.rouge, 'Sortie de stock']];
  let xLeg = ML;
  for (const [code, bg, fg, label] of legende) {
    rect(doc, xLeg, doc.y, 22, 14, bg);
    border(doc, xLeg, doc.y, 22, 14);
    txt(doc, code, xLeg, doc.y + 2, { bold: true, size: 8, color: fg, width: 22, align: 'center' });
    txt(doc, label, xLeg + 26, doc.y + 3, { size: 8, color: C.gris, width: 120 });
    xLeg += 150;
  }
  doc.y += 20;

  txt(doc, 'Document fictif à usage pédagogique — EvalPro', ML, doc.y, { size: 7, color: C.gris, width: PW, align: 'center' });
}

// ── ANNEXE : BON DE LIVRAISON ─────────────────────────────────────────────────

function pageBonLivraison(doc, annexe) {
  doc.addPage();
  headerBandeau(doc, `Annexe ${annexe.numero} — ${annexe.titre}`, `${annexe.points} points`);

  // Badge Annexe
  rect(doc, ML, doc.y, PW, 24, C.indigoM);
  txt(doc, `ANNEXE ${annexe.numero}`, ML + 8, doc.y + 2, { bold: true, size: 8, color: '#c7d2fe', width: 80 });
  txt(doc, annexe.titre?.toUpperCase() ?? '', ML + 90, doc.y + 7, { bold: true, size: 12, color: C.blanc, width: PW - 180 });
  txt(doc, `${annexe.points} POINTS`, ML + 430, doc.y + 7, { bold: true, size: 10, color: '#c7d2fe', width: 80, align: 'right' });
  doc.y += 30;

  encadreConsigne(doc, annexe.consigne ?? '');

  // Infos BL
  const yBL = doc.y;
  rect(doc, ML, yBL, PW, 22, C.indigoL);
  border(doc, ML, yBL, PW, 22);
  txt(doc, `BON DE LIVRAISON  N° ${annexe.numeroDoc ?? 'BL-____-____'}`, ML + 8, yBL + 4, { bold: true, size: 11, color: C.indigo, width: 280 });
  txt(doc, `Date : ${annexe.dateDoc ?? '____________'}`, ML + 300, yBL + 4, { size: 9, color: C.gris, width: 150 });

  if (annexe.fournisseur || annexe.client) {
    const y2 = yBL + 22;
    const fou = annexe.fournisseur ?? {};
    const cli = annexe.client ?? {};
    rect(doc, ML, y2, 248, 60, C.grisXL);
    border(doc, ML, y2, 248, 60);
    txt(doc, 'FOURNISSEUR', ML + 6, y2 + 5, { bold: true, size: 7, color: C.gris, width: 100 });
    txt(doc, fou.raisonSociale ?? '', ML + 6, y2 + 16, { bold: true, size: 10, color: C.slate, width: 234 });
    txt(doc, [fou.adresse, `${fou.codePostal ?? ''} ${fou.ville ?? ''}`].filter(Boolean).join('\n'), ML + 6, y2 + 30, { size: 8, color: C.gris, width: 234 });

    rect(doc, ML + 267, y2, 248, 60, C.grisXL);
    border(doc, ML + 267, y2, 248, 60);
    txt(doc, 'DESTINATAIRE', ML + 273, y2 + 5, { bold: true, size: 7, color: C.gris, width: 100 });
    txt(doc, cli.raisonSociale ?? '', ML + 273, y2 + 16, { bold: true, size: 10, color: C.slate, width: 234 });
    txt(doc, [cli.adresse, `${cli.codePostal ?? ''} ${cli.ville ?? ''}`].filter(Boolean).join('\n'), ML + 273, y2 + 30, { size: 8, color: C.gris, width: 234 });
    doc.y = y2 + 68;
  } else {
    doc.y = yBL + 30;
  }

  // Tableau lignes BL
  const c = { ref: ML+2, des: ML+90, qteCmd: ML+338, qteLiv: ML+386, conf: ML+435, ano: ML+466 };
  const w = { ref: 86, des: 246, qteCmd: 46, qteLiv: 46, conf: 28, ano: 46 };

  rect(doc, ML, doc.y, PW, 18, C.slate);
  [['Référence', c.ref, w.ref, 'left'], ['Désignation', c.des, w.des, 'left'],
   ['Qté commandée', c.qteCmd, w.qteCmd, 'right'], ['Qté livrée', c.qteLiv, w.qteLiv, 'right'],
   ['✓', c.conf, w.conf, 'center'], ['Anomalie', c.ano, w.ano, 'center']]
    .forEach(([h, x, ww, align]) => txt(doc, h, x, doc.y + 4, { bold: true, size: 7, color: C.blanc, width: ww, align }));
  doc.y += 18;

  let alt = false;
  for (const l of (annexe.lignesBL ?? [])) {
    checkPage(doc, 40);
    const rH = 20;
    rect(doc, ML, doc.y, PW, rH, alt ? C.grisXL : C.blanc);
    border(doc, ML, doc.y, PW, rH);
    alt = !alt;

    txt(doc, l.reference ?? '', c.ref, doc.y + 5, { size: 8, bold: true, color: C.indigo, width: w.ref });
    txt(doc, l.designation ?? '', c.des, doc.y + 5, { size: 8, color: C.slate, width: w.des });
    txt(doc, String(l.quantiteCommandee ?? ''), c.qteCmd, doc.y + 5, { size: 8, bold: true, color: C.slate, width: w.qteCmd, align: 'right' });

    // Qté livrée — case à remplir
    if (l.aCompleter || l.quantiteLivree == null) {
      caseVide(doc, c.qteLiv, doc.y + 3, w.qteLiv, rH - 6);
    } else {
      txt(doc, String(l.quantiteLivree), c.qteLiv, doc.y + 5, { size: 8, bold: true, color: C.vert, width: w.qteLiv, align: 'right' });
    }

    // Case conforme
    caseVide(doc, c.conf, doc.y + 3, w.conf, rH - 6);

    // Case anomalie
    if (l.aCompleter) {
      caseVide(doc, c.ano, doc.y + 3, w.ano, rH - 6);
    } else {
      txt(doc, l.anomalie ?? '—', c.ano, doc.y + 5, { size: 7, color: C.gris, width: w.ano, align: 'center' });
    }
    doc.y += rH;
  }

  // Zone signatures
  doc.y += 12;
  rect(doc, ML, doc.y, PW, 50, C.grisXL);
  border(doc, ML, doc.y, PW, 50);

  const xSig1 = ML + 30;
  const xSig2 = ML + 290;
  txt(doc, 'Signature et cachet du livreur', xSig1, doc.y + 6, { size: 7, bold: true, color: C.gris, width: 200 });
  txt(doc, 'Signature du réceptionnaire + date', xSig2, doc.y + 6, { size: 7, bold: true, color: C.gris, width: 200 });
  // Lignes de signature
  hline(doc, doc.y + 42, xSig1, xSig1 + 180, C.border);
  hline(doc, doc.y + 42, xSig2, xSig2 + 180, C.border);
  doc.y += 56;

  // Zone observations
  rect(doc, ML, doc.y, PW, 30, C.blanc);
  border(doc, ML, doc.y, PW, 30);
  txt(doc, 'Observations :', ML + 6, doc.y + 4, { bold: true, size: 8, color: C.gris, width: 80 });
  hline(doc, doc.y + 26, ML + 90, ML + PW - 4, C.border);
  doc.y += 34;

  txt(doc, 'Document fictif à usage pédagogique — EvalPro', ML, doc.y, { size: 7, color: C.gris, width: PW, align: 'center' });
}

// ── PIED DE PAGE (toutes pages) ───────────────────────────────────────────────

function piedDePages(doc, titre) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    hline(doc, 825, ML, ML + PW, C.border);
    txt(doc, `${titre ?? 'Situation professionnelle'} — EvalPro`, ML, 829, { size: 6, color: C.gris, width: 350 });
    txt(doc, `Page ${i + 1} / ${range.count}`, ML, 829, { size: 7, color: C.gris, width: PW, align: 'right' });
  }
}

// ── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────

export const genererPdfDossier = (dossier) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: false, bufferPages: true });
    const buf = [];
    doc.on('data', (b) => buf.push(b));
    doc.on('end', () => resolve(Buffer.concat(buf)));
    doc.on('error', reject);

    // Page 1 : Garde
    doc.addPage();
    pageGarde(doc, dossier);

    // Documents à lire
    for (const d of (dossier.documents ?? [])) {
      if (d.type === 'catalogue') pageCatalogue(doc, d, dossier.entreprise);
      else pageCorrespondance(doc, d);
    }

    // Annexes
    for (const a of (dossier.annexes ?? [])) {
      if (a.type === 'facture')      pageFacture(doc, a);
      else if (a.type === 'fiche_stock') pageFicheStock(doc, a);
      else if (a.type === 'bon_livraison') pageBonLivraison(doc, a);
    }

    piedDePages(doc, dossier.titre);
    doc.end();
  });
