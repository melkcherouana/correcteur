import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ShadingType, PageBreak, Footer, SimpleField,
  TableLayoutType, VerticalAlign,
} from 'docx';

// Couleurs hex sans #
const INDIGO   = '3730a3';
const INDIGO_L = 'e0e7ff';
const SLATE    = '1e293b';
const GRIS     = '64748b';
const GRIS_L   = 'f1f5f9';
const ROUGE    = 'dc2626';
const ROUGE_L  = 'fef2f2';
const VERT     = '15803d';
const VERT_L   = 'f0fdf4';
const AMBER    = 'd97706';
const AMBER_L  = 'fffbeb';
const BLEU     = '1d4ed8';
const BLEU_L   = 'eff6ff';
const BLANC    = 'ffffff';
const VIDE     = 'dbeafe';

// Helpers
function run(texte, opts = {}) {
  return new TextRun({
    text: String(texte ?? '').replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
    bold: opts.bold ?? false,
    italics: opts.italic ?? false,
    color: opts.color ?? SLATE,
    size: (opts.size ?? 9) * 2,
    font: 'Calibri',
  });
}

function para(runs, opts = {}) {
  const children = Array.isArray(runs) ? runs : [run(String(runs ?? ''), opts)];
  return new Paragraph({
    children,
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { before: opts.spaceBefore ?? 0, after: opts.spaceAfter ?? 60 },
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
  });
}

function saut() {
  return new Paragraph({ children: [new PageBreak()] });
}

function cell(texte, opts = {}) {
  const bg = opts.bg ?? BLANC;
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({
        text: String(texte ?? '').replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
        bold: opts.bold ?? false,
        color: opts.color ?? SLATE,
        size: (opts.size ?? 9) * 2,
        font: 'Calibri',
      })],
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 30, after: 30 },
    })],
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    borders: borders(opts.borderColor ?? 'cbd5e1'),
    columnSpan: opts.colspan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
  });
}

function cellVide(opts = {}) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Calibri' })], spacing: { before: 30, after: 30 } })],
    shading: { type: ShadingType.SOLID, color: VIDE, fill: VIDE },
    borders: borders('6366f1', BorderStyle.DASHED),
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
  });
}

function borders(color = 'cbd5e1', style = BorderStyle.SINGLE) {
  const b = { style, size: 6, color };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}

function rowTete(cells) {
  return new TableRow({ children: cells, tableHeader: true });
}

function fmt(v) {
  if (v == null) return '';
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function titre(texte, bg = INDIGO) {
  return new Paragraph({
    children: [new TextRun({
      text: String(texte ?? '').toUpperCase().replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
      bold: true, color: BLANC, size: 44, font: 'Calibri',
    })],
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    spacing: { before: 0, after: 0 },
    alignment: AlignmentType.LEFT,
  });
}

function sousTitre(texte, bg = '4338ca') {
  return new Paragraph({
    children: [new TextRun({
      text: String(texte ?? '').replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
      bold: true, color: BLANC, size: 26, font: 'Calibri',
    })],
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    spacing: { before: 0, after: 200 },
  });
}

function consigne(texte) {
  return new Paragraph({
    children: [new TextRun({
      text: 'Consigne : ' + String(texte ?? '').replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
      color: '92400e', size: 18, font: 'Calibri',
    })],
    shading: { type: ShadingType.SOLID, color: AMBER_L, fill: AMBER_L },
    border: { left: { style: BorderStyle.THICK, size: 20, color: AMBER } },
    spacing: { before: 80, after: 160 },
  });
}

function bandeauSection(texte, bg = INDIGO) {
  return new Paragraph({
    children: [new TextRun({
      text: String(texte ?? '').replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, ''),
      bold: true, color: BLANC, size: 22, font: 'Calibri',
    })],
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    spacing: { before: 120, after: 0 },
  });
}

// ── PAGE DE GARDE ─────────────────────────────────────────────────────────────

function pageGarde(dossier) {
  const blocs = [];

  blocs.push(titre('SITUATION PROFESSIONNELLE'));
  blocs.push(sousTitre(dossier.titre ?? ''));

  // Infos sur une ligne
  const tags = [
    dossier.entreprise?.activite && `Filiere : ${dossier.entreprise.activite}`,
    dossier.niveau && `Niveau : ${dossier.niveau}`,
    `Duree : ${dossier.dureeMinutes ?? 120} min`,
    `Bareme : ${dossier.baremeTotal ?? 20} pts`,
  ].filter(Boolean).join('   |   ');
  blocs.push(para(tags, { color: GRIS, size: 9, spaceAfter: 200 }));

  // Identification candidat
  blocs.push(bandeauSection('IDENTIFICATION DU CANDIDAT', SLATE));
  blocs.push(new Table({
    rows: [
      ['NOM et Prenom', 'Classe', 'Etablissement', 'Date'].map(lbl =>
        new TableRow({ children: [
          cell(lbl, { bg: GRIS_L, bold: true, color: GRIS, size: 9, width: 2200 }),
          cellVide({ width: 4700 }),
        ]})
      ),
    ].flat(),
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));

  // Contexte
  blocs.push(bandeauSection('CONTEXTE', SLATE));
  blocs.push(para(dossier.contexte ?? '', { bg: GRIS_L, spaceBefore: 0, spaceAfter: 0 }));
  blocs.push(para(''));

  // Mise en situation
  blocs.push(bandeauSection('MISE EN SITUATION', '4338ca'));
  blocs.push(para(dossier.misEnSituation ?? '', { bg: INDIGO_L, spaceBefore: 0, spaceAfter: 0 }));
  blocs.push(para(''));

  // Tableau des taches
  blocs.push(bandeauSection('TRAVAIL DEMANDE', SLATE));
  const taches = dossier.taches ?? [];
  if (taches.length > 0) {
    blocs.push(new Table({
      rows: [
        rowTete([
          cell('Tache', { bg: INDIGO, color: BLANC, bold: true, size: 9, width: 800 }),
          cell('Intitule', { bg: INDIGO, color: BLANC, bold: true, size: 9 }),
          cell('Annexe', { bg: INDIGO, color: BLANC, bold: true, size: 9, width: 1400, align: AlignmentType.CENTER }),
          cell('Points', { bg: INDIGO, color: BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.RIGHT }),
        ]),
        ...taches.map((t, i) => new TableRow({ children: [
          cell(`T${t.numero}`, { bg: i % 2 === 0 ? INDIGO_L : BLANC, bold: true, color: INDIGO, size: 9, width: 800, align: AlignmentType.CENTER }),
          cell(t.intitule ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9 }),
          cell(t.annexe ? `Annexe ${t.annexe}` : '', { bg: i % 2 === 0 ? INDIGO_L : BLANC, color: INDIGO, bold: true, size: 9, width: 1400, align: AlignmentType.CENTER }),
          cell(`${t.points ?? 0} pts`, { bg: i % 2 === 0 ? GRIS_L : BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.RIGHT }),
        ]})),
        new TableRow({ children: [
          cell('', { bg: INDIGO, color: BLANC, size: 9, width: 800 }),
          cell('TOTAL', { bg: INDIGO, color: BLANC, bold: true, size: 10, align: AlignmentType.RIGHT }),
          cell('', { bg: INDIGO, color: BLANC, size: 9, width: 1400 }),
          cell(`${taches.reduce((s, t) => s + (t.points ?? 0), 0)} pts`, { bg: INDIGO, color: BLANC, bold: true, size: 10, width: 1000, align: AlignmentType.RIGHT }),
        ]}),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }));
  }

  return blocs;
}

// ── CATALOGUE ──────────────────────────────────────────────────────────────────

function pageCatalogue(d) {
  const blocs = [saut()];
  blocs.push(new Paragraph({
    children: [
      new TextRun({ text: `DOCUMENT ${d.numero}  `, bold: true, color: BLANC, size: 18, font: 'Calibri' }),
      new TextRun({ text: String(d.titre ?? '').toUpperCase(), bold: true, color: BLANC, size: 26, font: 'Calibri' }),
    ],
    shading: { type: ShadingType.SOLID, color: BLEU, fill: BLEU },
    spacing: { before: 0, after: 200 },
  }));

  if (!d.articles?.length) return blocs;

  blocs.push(new Table({
    rows: [
      rowTete([
        cell('Reference', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1800 }),
        cell('Designation', { bg: SLATE, color: BLANC, bold: true, size: 9 }),
        cell('Unite', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.CENTER }),
        cell('Prix HT', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
        cell('Conditionnement', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1600 }),
      ]),
      ...d.articles.map((a, i) => new TableRow({ children: [
        cell(a.reference ?? '', { bg: i % 2 === 0 ? BLEU_L : BLANC, bold: true, color: BLEU, size: 9, width: 1800 }),
        cell(a.designation ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9 }),
        cell(a.unite ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9, width: 1000, align: AlignmentType.CENTER }),
        cell(a.prixHT != null ? `${Number(a.prixHT).toFixed(2)} EUR` : '-', { bg: i % 2 === 0 ? GRIS_L : BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
        cell(a.conditionnement ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 8, width: 1600 }),
      ]})),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para('Prix hors taxes. TVA en vigueur applicable.', { color: GRIS, size: 8, spaceBefore: 80 }));
  return blocs;
}

// ── CORRESPONDANCE ─────────────────────────────────────────────────────────────

function pageCorrespondance(d) {
  const blocs = [saut()];
  blocs.push(new Paragraph({
    children: [
      new TextRun({ text: `DOCUMENT ${d.numero}  `, bold: true, color: BLANC, size: 18, font: 'Calibri' }),
      new TextRun({ text: String(d.titre ?? '').toUpperCase(), bold: true, color: BLANC, size: 26, font: 'Calibri' }),
    ],
    shading: { type: ShadingType.SOLID, color: BLEU, fill: BLEU },
    spacing: { before: 0, after: 120 },
  }));

  blocs.push(new Table({
    rows: [
      ['De :', 'A :', 'Date :', 'Objet :'].map((lbl, i) => {
        const vals = [d.expediteur, d.destinataire, d.date, d.objet];
        return new TableRow({ children: [
          cell(lbl, { bg: GRIS_L, bold: true, color: GRIS, size: 9, width: 1400 }),
          cell(vals[i] ?? '', { bg: BLANC, size: 9 }),
        ]});
      }),
    ].flat(),
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: borders(),
  }));

  if (d.lignes?.length) {
    blocs.push(para(''));
    blocs.push(new Table({
      rows: [
        rowTete([
          cell('Reference', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1800 }),
          cell('Designation', { bg: SLATE, color: BLANC, bold: true, size: 9 }),
          cell('Quantite', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
          cell('Unite', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.CENTER }),
        ]),
        ...d.lignes.map((l, i) => new TableRow({ children: [
          cell(l.reference ?? '', { bg: i % 2 === 0 ? BLEU_L : BLANC, bold: true, color: BLEU, size: 9, width: 1800 }),
          cell(l.designation ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9 }),
          cell(String(l.quantite ?? ''), { bg: i % 2 === 0 ? GRIS_L : BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
          cell(l.unite ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9, width: 1000, align: AlignmentType.CENTER }),
        ]})),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }));
  }

  if (d.corps) {
    blocs.push(para(''));
    blocs.push(para(d.corps));
  }

  return blocs;
}

// ── ANNEXE FACTURE ─────────────────────────────────────────────────────────────

function annexeFacture(a) {
  const blocs = [saut()];
  blocs.push(titre(`ANNEXE ${a.numero} - ${a.titre ?? ''}`, ROUGE));
  blocs.push(new Paragraph({
    children: [new TextRun({ text: `${a.points ?? 0} POINTS`, bold: true, color: BLANC, size: 20, font: 'Calibri' })],
    shading: { type: ShadingType.SOLID, color: 'b91c1c', fill: 'b91c1c' },
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 120 },
  }));

  blocs.push(consigne(a.consigne ?? ''));

  // En-tete FACTURE
  blocs.push(new Paragraph({
    children: [
      new TextRun({ text: 'FACTURE', bold: true, color: ROUGE, size: 40, font: 'Calibri' }),
      new TextRun({ text: `  N° ${a.numeroDoc ?? ''}   Date : ${a.dateDoc ?? ''}`, color: GRIS, size: 20, font: 'Calibri' }),
    ],
    spacing: { before: 80, after: 80 },
  }));

  // Emetteur / Client
  const em = a.emetteur ?? {};
  const cl = a.client ?? {};
  const adresseEm = [em.adresse, `${em.codePostal ?? ''} ${em.ville ?? ''}`, em.siret ? `SIRET : ${em.siret}` : '', em.tel, em.email].filter(Boolean).join(' - ');
  const adresseCl = [cl.adresse, `${cl.codePostal ?? ''} ${cl.ville ?? ''}`, cl.contact].filter(Boolean).join(' - ');

  blocs.push(new Table({
    rows: [new TableRow({ children: [
      new TableCell({
        children: [
          para([run('EMETTEUR', { bold: true, color: GRIS, size: 8 })]),
          para([run(em.raisonSociale ?? '', { bold: true, size: 11 })]),
          para([run(adresseEm, { color: GRIS, size: 8 })]),
        ],
        shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
        borders: borders(),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      }),
      new TableCell({ children: [para('')], width: { size: 200, type: WidthType.DXA }, borders: borders(BLANC) }),
      new TableCell({
        children: [
          para([run('CLIENT', { bold: true, color: GRIS, size: 8 })]),
          para([run(cl.raisonSociale ?? '', { bold: true, size: 11 })]),
          para([run(adresseCl, { color: GRIS, size: 8 })]),
        ],
        shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
        borders: borders(),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      }),
    ]})],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));

  // Tableau lignes
  blocs.push(new Table({
    rows: [
      rowTete([
        cell('Reference', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1600 }),
        cell('Designation', { bg: SLATE, color: BLANC, bold: true, size: 9 }),
        cell('Qte', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 700, align: AlignmentType.RIGHT }),
        cell('U.', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 600, align: AlignmentType.CENTER }),
        cell('P.U. HT', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
        cell('Rem%', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 800, align: AlignmentType.RIGHT }),
        cell('Total HT', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1300, align: AlignmentType.RIGHT }),
      ]),
      ...(a.lignesFacture ?? []).map((l, i) => new TableRow({ children: [
        cell(l.reference ?? '', { bg: i % 2 === 0 ? INDIGO_L : BLANC, bold: true, color: INDIGO, size: 9, width: 1600 }),
        cell(l.designation ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9 }),
        cell(String(l.quantite ?? ''), { bg: i % 2 === 0 ? GRIS_L : BLANC, bold: true, size: 9, width: 700, align: AlignmentType.RIGHT }),
        cell(l.unite ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9, width: 600, align: AlignmentType.CENTER }),
        cell(l.prixUHT != null ? Number(l.prixUHT).toFixed(2) : '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9, width: 1200, align: AlignmentType.RIGHT }),
        cell(l.remisePct != null ? `${l.remisePct}%` : '-', { bg: i % 2 === 0 ? AMBER_L : BLANC, color: AMBER, bold: true, size: 9, width: 800, align: AlignmentType.RIGHT }),
        l.totalHT == null ? cellVide({ width: 1300 }) : cell(Number(l.totalHT).toFixed(2), { bold: true, size: 9, width: 1300, align: AlignmentType.RIGHT }),
      ]})),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));

  // Totaux
  blocs.push(new Table({
    rows: [
      new TableRow({ children: [
        new TableCell({ children: [para('')], borders: borders(BLANC), width: { size: 5400, type: WidthType.DXA } }),
        cell('Total HT', { bg: GRIS_L, color: GRIS, size: 9, width: 2000, align: AlignmentType.RIGHT }),
        cellVide({ width: 1800 }),
      ]}),
      new TableRow({ children: [
        new TableCell({ children: [para('')], borders: borders(BLANC), width: { size: 5400, type: WidthType.DXA } }),
        cell(`TVA ${a.tauxTVA ?? 20} %`, { bg: GRIS_L, color: GRIS, size: 9, width: 2000, align: AlignmentType.RIGHT }),
        cellVide({ width: 1800 }),
      ]}),
      new TableRow({ children: [
        new TableCell({ children: [para('')], borders: borders(BLANC), width: { size: 5400, type: WidthType.DXA } }),
        cell('TOTAL TTC', { bg: ROUGE, color: BLANC, bold: true, size: 11, width: 2000, align: AlignmentType.RIGHT }),
        cellVide({ width: 1800 }),
      ]}),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));
  blocs.push(para('Mode de reglement : _______________________   Reference commande : _______________________', { color: GRIS, size: 8 }));
  blocs.push(para('Document fictif a usage pedagogique - EvalPro', { color: GRIS, size: 7, align: AlignmentType.CENTER, spaceBefore: 200 }));
  return blocs;
}

// ── ANNEXE FICHE DE STOCK ──────────────────────────────────────────────────────

function annexeFicheStock(a) {
  const blocs = [saut()];
  blocs.push(titre(`ANNEXE ${a.numero} - ${a.titre ?? ''}`, VERT));
  blocs.push(new Paragraph({
    children: [new TextRun({ text: `${a.points ?? 0} POINTS`, bold: true, color: BLANC, size: 20, font: 'Calibri' })],
    shading: { type: ShadingType.SOLID, color: '166534', fill: '166534' },
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 120 },
  }));

  blocs.push(consigne(a.consigne ?? ''));

  const art = a.articleStock ?? {};
  blocs.push(new Table({
    rows: [new TableRow({ children: [
      cell('ARTICLE', { bg: VERT, color: BLANC, bold: true, size: 8, width: 1200 }),
      cell(art.designation ?? '', { bg: VERT_L, bold: true, size: 11 }),
      cell(`Ref. : ${art.reference ?? ''}`, { bg: VERT_L, size: 9, width: 1600 }),
      cell(`P.U. HT : ${art.prixUnitaireHT != null ? Number(art.prixUnitaireHT).toFixed(2) + ' EUR' : '-'}`, { bg: VERT_L, size: 9, width: 1600 }),
      cell(`Stock mini : ${art.stockMinimum ?? '-'} ${art.unite ?? ''}`, { bg: AMBER_L, color: AMBER, bold: true, size: 9, width: 1800 }),
    ]})],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));

  blocs.push(new Table({
    rows: [
      rowTete([
        cell('Date', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.CENTER }),
        cell('Libelle de l\'operation', { bg: SLATE, color: BLANC, bold: true, size: 9 }),
        cell('Op.', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 700, align: AlignmentType.CENTER }),
        cell('Entree', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.RIGHT }),
        cell('Sortie', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1000, align: AlignmentType.RIGHT }),
        cell('Stock', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1200, align: AlignmentType.RIGHT }),
      ]),
      ...(a.mouvements ?? []).map((mv, i) => {
        const typeBg  = { SI: INDIGO_L, E: VERT_L, S: ROUGE_L }[mv.typeOp] ?? GRIS_L;
        const typeClr = { SI: INDIGO,   E: VERT,   S: ROUGE  }[mv.typeOp] ?? GRIS;
        const rowBg   = i % 2 === 0 ? GRIS_L : BLANC;
        return new TableRow({ children: [
          cell(mv.date ?? '', { bg: rowBg, size: 9, width: 1200, align: AlignmentType.CENTER }),
          cell(mv.libelle ?? '', { bg: rowBg, size: 9 }),
          cell(mv.typeOp ?? '', { bg: typeBg, bold: true, color: typeClr, size: 9, width: 700, align: AlignmentType.CENTER }),
          mv.entree != null
            ? cell(String(mv.entree), { bg: VERT_L, bold: true, color: VERT, size: 9, width: 1000, align: AlignmentType.RIGHT })
            : cell('-', { bg: rowBg, color: GRIS, size: 9, width: 1000, align: AlignmentType.RIGHT }),
          mv.sortie != null
            ? cell(String(mv.sortie), { bg: ROUGE_L, bold: true, color: ROUGE, size: 9, width: 1000, align: AlignmentType.RIGHT })
            : cell('-', { bg: rowBg, color: GRIS, size: 9, width: 1000, align: AlignmentType.RIGHT }),
          (mv.aCompleter || mv.solde == null)
            ? cellVide({ width: 1200 })
            : cell(String(mv.solde), { bg: INDIGO_L, bold: true, color: INDIGO, size: 9, width: 1200, align: AlignmentType.RIGHT }),
        ]});
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));
  blocs.push(para([
    run('SI', { bold: true, color: INDIGO, size: 8 }), run(' = Stock initial   ', { color: GRIS, size: 8 }),
    run('E',  { bold: true, color: VERT,   size: 8 }), run(' = Entree   ',        { color: GRIS, size: 8 }),
    run('S',  { bold: true, color: ROUGE,  size: 8 }), run(' = Sortie   Cases bleues = a completer', { color: GRIS, size: 8 }),
  ]));
  blocs.push(para('Document fictif a usage pedagogique - EvalPro', { color: GRIS, size: 7, align: AlignmentType.CENTER, spaceBefore: 200 }));
  return blocs;
}

// ── ANNEXE BON DE LIVRAISON ────────────────────────────────────────────────────

function annexeBonLivraison(a) {
  const blocs = [saut()];
  blocs.push(titre(`ANNEXE ${a.numero} - ${a.titre ?? ''}`, INDIGO));
  blocs.push(new Paragraph({
    children: [new TextRun({ text: `${a.points ?? 0} POINTS`, bold: true, color: BLANC, size: 20, font: 'Calibri' })],
    shading: { type: ShadingType.SOLID, color: '4338ca', fill: '4338ca' },
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 120 },
  }));

  blocs.push(consigne(a.consigne ?? ''));

  blocs.push(new Paragraph({
    children: [
      new TextRun({ text: 'BON DE LIVRAISON', bold: true, color: INDIGO, size: 36, font: 'Calibri' }),
      new TextRun({ text: `  N° ${a.numeroDoc ?? ''}   Date : ${a.dateDoc ?? ''}`, color: GRIS, size: 20, font: 'Calibri' }),
    ],
    spacing: { before: 80, after: 80 },
  }));

  const fou = a.fournisseur ?? {};
  const cli = a.client ?? {};
  if (fou.raisonSociale || cli.raisonSociale) {
    blocs.push(new Table({
      rows: [new TableRow({ children: [
        new TableCell({
          children: [
            para([run('FOURNISSEUR', { bold: true, color: GRIS, size: 8 })]),
            para([run(fou.raisonSociale ?? '', { bold: true, size: 11 })]),
            para([run([fou.adresse, `${fou.codePostal ?? ''} ${fou.ville ?? ''}`].filter(Boolean).join(' - '), { color: GRIS, size: 8 })]),
          ],
          shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
          borders: borders(),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
        new TableCell({ children: [para('')], width: { size: 200, type: WidthType.DXA }, borders: borders(BLANC) }),
        new TableCell({
          children: [
            para([run('DESTINATAIRE', { bold: true, color: GRIS, size: 8 })]),
            para([run(cli.raisonSociale ?? '', { bold: true, size: 11 })]),
            para([run([cli.adresse, `${cli.codePostal ?? ''} ${cli.ville ?? ''}`].filter(Boolean).join(' - '), { color: GRIS, size: 8 })]),
          ],
          shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
          borders: borders(),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
      ]})],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }));
    blocs.push(para(''));
  }

  blocs.push(new Table({
    rows: [
      rowTete([
        cell('Reference', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1600 }),
        cell('Designation', { bg: SLATE, color: BLANC, bold: true, size: 9 }),
        cell('Qte commandee', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1400, align: AlignmentType.RIGHT }),
        cell('Qte livree', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1400, align: AlignmentType.RIGHT }),
        cell('Conforme', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 900, align: AlignmentType.CENTER }),
        cell('Anomalie', { bg: SLATE, color: BLANC, bold: true, size: 9, width: 1400, align: AlignmentType.CENTER }),
      ]),
      ...(a.lignesBL ?? []).map((l, i) => new TableRow({ children: [
        cell(l.reference ?? '', { bg: i % 2 === 0 ? INDIGO_L : BLANC, bold: true, color: INDIGO, size: 9, width: 1600 }),
        cell(l.designation ?? '', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 9 }),
        cell(String(l.quantiteCommandee ?? ''), { bg: i % 2 === 0 ? GRIS_L : BLANC, bold: true, size: 9, width: 1400, align: AlignmentType.RIGHT }),
        (l.aCompleter || l.quantiteLivree == null) ? cellVide({ width: 1400 }) : cell(String(l.quantiteLivree), { bg: VERT_L, bold: true, color: VERT, size: 9, width: 1400, align: AlignmentType.RIGHT }),
        cellVide({ width: 900 }),
        l.aCompleter ? cellVide({ width: 1400 }) : cell(l.anomalie ?? '-', { bg: i % 2 === 0 ? GRIS_L : BLANC, size: 8, width: 1400, align: AlignmentType.CENTER }),
      ]})),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));
  blocs.push(new Table({
    rows: [new TableRow({ children: [
      new TableCell({
        children: [
          para([run('Signature du livreur', { bold: true, color: GRIS, size: 9 })]),
          para(''), para(''),
          para('_____________________________________', { color: GRIS }),
        ],
        shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
        borders: borders(),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      }),
      new TableCell({ children: [para('')], width: { size: 400, type: WidthType.DXA }, borders: borders(BLANC) }),
      new TableCell({
        children: [
          para([run('Signature receptionnaire + date', { bold: true, color: GRIS, size: 9 })]),
          para(''), para(''),
          para('_____________________________________', { color: GRIS }),
        ],
        shading: { type: ShadingType.SOLID, color: GRIS_L, fill: GRIS_L },
        borders: borders(),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      }),
    ]})],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }));

  blocs.push(para(''));
  blocs.push(para([run('Observations : ', { bold: true, color: GRIS, size: 9 }), run('_______________________________________________________________________', { color: GRIS, size: 9 })]));
  blocs.push(para('Document fictif a usage pedagogique - EvalPro', { color: GRIS, size: 7, align: AlignmentType.CENTER, spaceBefore: 200 }));
  return blocs;
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

export const genererDocxDossier = async (dossier) => {
  const blocs = [...pageGarde(dossier)];

  for (const d of (dossier.documents ?? [])) {
    if (d.type === 'catalogue') blocs.push(...pageCatalogue(d));
    else blocs.push(...pageCorrespondance(d));
  }

  for (const a of (dossier.annexes ?? [])) {
    if (a.type === 'facture')            blocs.push(...annexeFacture(a));
    else if (a.type === 'fiche_stock')   blocs.push(...annexeFicheStock(a));
    else if (a.type === 'bon_livraison') blocs.push(...annexeBonLivraison(a));
  }

  const titreDoc = String(dossier.titre ?? 'Situation professionnelle')
    .replace(/[^\x09\x0A\x0D\x20-퟿-�]/g, '');

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Calibri', size: 18 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${titreDoc} - EvalPro   |   Page `, size: 14, color: GRIS, font: 'Calibri' }),
              new SimpleField('PAGE'),
              new TextRun({ text: ' / ', size: 14, color: GRIS, font: 'Calibri' }),
              new SimpleField('NUMPAGES'),
            ],
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e2e8f0' } },
          })],
        }),
      },
      children: blocs,
    }],
  });

  return Packer.toBuffer(doc);
};
