import PDFDocument from 'pdfkit';

// Palette couleurs
const INDIGO   = '#4338ca';
const INDIGO_L = '#e0e7ff';
const GRIS     = '#64748b';
const NOIR     = '#1e293b';
const BLANC    = '#ffffff';
const VERT     = '#166534';
const VERT_L   = '#dcfce7';
const ORANGE   = '#9a3412';
const ORANGE_L = '#ffedd5';
const ROUGE    = '#991b1b';
const ROUGE_L  = '#fee2e2';
const GRIS_L   = '#f8fafc';
const BORDER   = '#e2e8f0';

const DIFFICULTE = {
  accessible:    { bg: VERT_L,   text: VERT,   label: 'Accessible' },
  intermediaire: { bg: ORANGE_L, text: ORANGE, label: 'Intermédiaire' },
  expert:        { bg: ROUGE_L,  text: ROUGE,  label: 'Expert' },
};

// Dessine un rectangle arrondi simulé (PDFKit ne supporte pas nativement)
function bandeau(doc, y, h, couleur) {
  doc.rect(40, y, 515, h).fillColor(couleur).fill();
}

function sectionTitre(doc, texte) {
  if (doc.y > 700) doc.addPage();
  const y = doc.y;
  bandeau(doc, y - 4, 22, INDIGO_L);
  doc
    .fillColor(INDIGO)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(texte.toUpperCase(), 50, y, { width: 495 });
  doc.moveDown(0.8);
}

function ligne(doc, label, valeur, y) {
  doc
    .fillColor(GRIS).fontSize(9).font('Helvetica-Bold').text(label, 55, y, { continued: false, width: 120 });
  doc
    .fillColor(NOIR).fontSize(9).font('Helvetica').text(valeur ?? '—', 175, y, { width: 370 });
}

export const genererPdfScenario = (scenario) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buf = [];
    doc.on('data', (b) => buf.push(b));
    doc.on('end', () => resolve(Buffer.concat(buf)));
    doc.on('error', reject);

    const dateGen = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    // ── EN-TÊTE ────────────────────────────────────────────────────────────────
    bandeau(doc, 40, 70, INDIGO);
    doc
      .fillColor(BLANC)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('EvalPro', 55, 50);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#c7d2fe')
      .text('Lycée professionnel', 55, 73);

    doc
      .fillColor(BLANC)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('SITUATION PROFESSIONNELLE', 200, 53, { align: 'right', width: 345 });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#c7d2fe')
      .text(`Générée le ${dateGen}`, 200, 73, { align: 'right', width: 345 });

    doc.moveDown(3.5);

    // ── INFOS GÉNÉRALES ────────────────────────────────────────────────────────
    const yInfo = doc.y;
    bandeau(doc, yInfo, 80, GRIS_L);

    const diff = DIFFICULTE[scenario.niveauDifficulte] ?? null;

    doc
      .fillColor(NOIR)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(scenario.titre ?? 'Scénario sans titre', 55, yInfo + 8, { width: 400 });

    if (diff) {
      doc
        .rect(430, yInfo + 8, 110, 16)
        .fillColor(diff.bg)
        .fill();
      doc
        .fillColor(diff.text)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(diff.label.toUpperCase(), 432, yInfo + 12, { width: 106, align: 'center' });
    }

    let rowY = yInfo + 34;
    if (scenario.missionPrincipale) {
      doc
        .fillColor(GRIS)
        .fontSize(9)
        .font('Helvetica')
        .text(scenario.missionPrincipale, 55, rowY, { width: 485, lineGap: 1 });
      rowY += 20;
    }

    const tags = [
      scenario.filiere   && `Filière : ${scenario.filiere}`,
      scenario.niveau    && `Niveau : ${scenario.niveau}`,
      scenario.dureeMinutes && `Durée : ${scenario.dureeMinutes} min`,
      scenario.noteMaximale && `Barème : ${scenario.noteMaximale} pts`,
    ].filter(Boolean);

    if (tags.length) {
      doc
        .fillColor(GRIS)
        .fontSize(8)
        .font('Helvetica')
        .text(tags.join('   •   '), 55, rowY, { width: 485 });
    }

    doc.y = yInfo + 88;
    doc.moveDown(0.8);

    // ── ENTREPRISE ─────────────────────────────────────────────────────────────
    if (scenario.entreprise) {
      sectionTitre(doc, 'Contexte entreprise');

      const ent = scenario.entreprise;
      const yEnt = doc.y;
      bandeau(doc, yEnt, 2, BORDER);
      doc.moveDown(0.3);

      doc
        .fillColor(NOIR)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${ent.nom ?? ''}`, 55);
      if (ent.secteur) {
        doc
          .fillColor(GRIS)
          .fontSize(9)
          .font('Helvetica')
          .text(ent.secteur, { lineGap: 1 });
      }
      if (ent.description) {
        doc.moveDown(0.3);
        doc
          .fillColor(NOIR)
          .fontSize(9)
          .font('Helvetica')
          .text(ent.description, 55, doc.y, { width: 485, lineGap: 2 });
      }
      if (ent.contact) {
        doc.moveDown(0.3);
        doc
          .fillColor(GRIS)
          .fontSize(8)
          .font('Helvetica')
          .text(`Contact : ${ent.contact}`, 55);
      }
      doc.moveDown(1);
    }

    // ── RÔLE & DÉCLENCHEUR ─────────────────────────────────────────────────────
    if (scenario.roleEleve || scenario.declencheur) {
      sectionTitre(doc, 'Mission confiée à l\'élève');
      if (scenario.roleEleve) {
        doc
          .fillColor(GRIS).fontSize(9).font('Helvetica-Bold')
          .text('Rôle :', 55, doc.y, { continued: true });
        doc
          .fillColor(NOIR).fontSize(9).font('Helvetica')
          .text(' ' + scenario.roleEleve, { width: 480, lineGap: 2 });
        doc.moveDown(0.4);
      }
      if (scenario.declencheur) {
        doc
          .fillColor(GRIS).fontSize(9).font('Helvetica-Bold')
          .text('Déclencheur :', 55, doc.y, { continued: true });
        doc
          .fillColor(NOIR).fontSize(9).font('Helvetica')
          .text(' ' + scenario.declencheur, { width: 460, lineGap: 2 });
      }
      doc.moveDown(1);
    }

    // ── TÂCHES ─────────────────────────────────────────────────────────────────
    if (scenario.taches?.length > 0) {
      sectionTitre(doc, `Tâches à réaliser (${scenario.taches.length})`);

      for (const t of scenario.taches) {
        if (doc.y > 690) doc.addPage();

        const yT = doc.y;
        // Numéro cercle simulé
        doc
          .rect(55, yT, 20, 20)
          .fillColor(INDIGO)
          .fill();
        doc
          .fillColor(BLANC)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(String(t.numero ?? ''), 56, yT + 5, { width: 18, align: 'center' });

        doc
          .fillColor(NOIR)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(t.intitule ?? '', 82, yT + 4, { width: 380 });

        if (t.dureeMinutes) {
          doc
            .fillColor(GRIS)
            .fontSize(8)
            .font('Helvetica')
            .text(`${t.dureeMinutes} min`, 460, yT + 6, { width: 75, align: 'right' });
        }

        doc.y = yT + 26;

        if (t.description) {
          doc
            .fillColor(GRIS)
            .fontSize(9)
            .font('Helvetica')
            .text(t.description, 82, doc.y, { width: 453, lineGap: 2 });
          doc.moveDown(0.4);
        }

        if (t.livrableAttendu) {
          doc
            .fillColor(GRIS).fontSize(8).font('Helvetica-Bold')
            .text('Livrable :', 82, doc.y, { continued: true });
          doc
            .fillColor(NOIR).fontSize(8).font('Helvetica')
            .text(' ' + t.livrableAttendu, { width: 440, lineGap: 1 });
          doc.moveDown(0.3);
        }

        if (t.criteresDEvaluation?.length > 0) {
          doc
            .fillColor(GRIS)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('Critères d\'évaluation :', 82, doc.y);
          doc.moveDown(0.2);

          for (const cr of t.criteresDEvaluation) {
            const yCr = doc.y;
            doc
              .fillColor(GRIS)
              .fontSize(8)
              .font('Helvetica')
              .text('·', 88, yCr, { continued: true })
              .fillColor(NOIR)
              .text(` ${cr.critere ?? ''}`, { width: 380, lineGap: 1, continued: false });
            if (cr.baremePoints) {
              doc
                .fillColor(INDIGO)
                .fontSize(8)
                .font('Helvetica-Bold')
                .text(`${cr.baremePoints} pts`, 460, yCr, { width: 75, align: 'right' });
            }
            doc.moveDown(0.25);
          }
        }

        // Trait séparateur entre tâches
        doc.moveDown(0.4);
        doc.moveTo(82, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.moveDown(0.6);
      }
    }

    // ── PRÉREQUIS & DOCUMENTS ─────────────────────────────────────────────────
    const hasPrereq = scenario.prerequis?.length > 0;
    const hasDocs   = scenario.documentsACreer?.length > 0;

    if (hasPrereq || hasDocs) {
      if (doc.y > 680) doc.addPage();

      if (hasPrereq && hasDocs) {
        // Deux colonnes
        sectionTitre(doc, 'Prérequis  &  Documents à préparer');
        const yCol = doc.y;
        const midX = 290;

        doc
          .fillColor(INDIGO).fontSize(9).font('Helvetica-Bold')
          .text('Prérequis', 55, yCol);
        doc
          .fillColor(INDIGO).fontSize(9).font('Helvetica-Bold')
          .text('Documents à préparer', midX, yCol);

        const maxItems = Math.max(scenario.prerequis.length, scenario.documentsACreer.length);
        for (let i = 0; i < maxItems; i++) {
          const y2 = doc.y;
          if (scenario.prerequis[i]) {
            doc
              .fillColor(NOIR).fontSize(8).font('Helvetica')
              .text(`· ${scenario.prerequis[i]}`, 55, y2, { width: 220, lineGap: 1 });
          }
          if (scenario.documentsACreer[i]) {
            doc
              .fillColor(NOIR).fontSize(8).font('Helvetica')
              .text(`· ${scenario.documentsACreer[i]}`, midX, y2, { width: 240, lineGap: 1 });
          }
          doc.moveDown(0.5);
        }
      } else if (hasPrereq) {
        sectionTitre(doc, 'Prérequis');
        for (const p of scenario.prerequis) {
          doc.fillColor(NOIR).fontSize(9).font('Helvetica')
            .text(`· ${p}`, 55, doc.y, { width: 485, lineGap: 1 });
          doc.moveDown(0.3);
        }
      } else {
        sectionTitre(doc, 'Documents à préparer');
        for (const d of scenario.documentsACreer) {
          doc.fillColor(NOIR).fontSize(9).font('Helvetica')
            .text(`· ${d}`, 55, doc.y, { width: 485, lineGap: 1 });
          doc.moveDown(0.3);
        }
      }
    }

    // ── PIED DE PAGE ───────────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc
        .moveTo(40, 800).lineTo(555, 800)
        .strokeColor(BORDER).lineWidth(0.5).stroke();
      doc
        .fillColor(GRIS).fontSize(7).font('Helvetica')
        .text(
          `EvalPro — Situation professionnelle générée par IA — ${dateGen}`,
          40, 805, { width: 350 }
        );
      doc
        .fillColor(GRIS).fontSize(7).font('Helvetica')
        .text(`Page ${i + 1} / ${pages.count}`, 40, 805, { align: 'right', width: 515 });
    }

    doc.end();
  });
