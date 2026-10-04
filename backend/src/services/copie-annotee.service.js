import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Annotation d'une copie Word (.docx) directement dans son XML (OOXML) :
// on conserve la mise en page de l'élève et on ajoute surlignages, texte barré,
// commentaires Word natifs et un bilan de correction en fin de document.

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const REL_COMMENTS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
const CT_COMMENTS = 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml';

export const LIBELLES_CATEGORIES = {
  calcul: 'Erreur de calcul',
  orthographe: 'Orthographe',
  manquant: 'Information manquante',
  procedure: 'Erreur de procédure',
  correct: 'Point correct',
};

// Ordre des enfants de w:rPr imposé par le schéma OOXML (Word refuse parfois un ordre différent)
const ORDRE_RPR = [
  'rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline',
  'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing',
  'w', 'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText',
  'vertAlign', 'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath',
];

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

export const estDocx = (mimeType, nom = '') =>
  mimeType?.includes('wordprocessingml') || nom.toLowerCase().endsWith('.docx');

// ─── Helpers DOM ──────────────────────────────────────────────────────────────

const estW = (n, nom) => n?.nodeType === 1 && n.namespaceURI === W && n.localName === nom;
const enfantsElements = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 1);

const ancetre = (node, nom) => {
  let n = node.parentNode;
  while (n && !estW(n, nom)) n = n.parentNode;
  return n;
};

const creerW = (doc, nom, attrs = {}) => {
  const el = doc.createElementNS(W, `w:${nom}`);
  for (const [k, v] of Object.entries(attrs)) el.setAttributeNS(W, `w:${k}`, String(v));
  return el;
};

const creerTexte = (doc, texte) => {
  const t = creerW(doc, 't');
  t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  t.appendChild(doc.createTextNode(texte));
  return t;
};

const insererApres = (el, ref) => ref.parentNode.insertBefore(el, ref.nextSibling);

// Ajoute (ou remplace) une propriété de mise en forme en respectant l'ordre du schéma
const definirProprieteRun = (run, nom, attrs = {}) => {
  const doc = run.ownerDocument;
  let rPr = enfantsElements(run).find((n) => estW(n, 'rPr'));
  if (!rPr) {
    rPr = creerW(doc, 'rPr');
    run.insertBefore(rPr, run.firstChild);
  }
  enfantsElements(rPr).filter((n) => estW(n, nom)).forEach((n) => rPr.removeChild(n));
  const rang = ORDRE_RPR.indexOf(nom);
  const suivant = enfantsElements(rPr).find((n) => ORDRE_RPR.indexOf(n.localName) > rang);
  rPr.insertBefore(creerW(doc, nom, attrs), suivant ?? null);
};

// ─── Indexation du texte des paragraphes ──────────────────────────────────────

// Éclate un run contenant plusieurs éléments (texte, tabulation, saut…) en runs
// élémentaires portant chacun la même mise en forme, pour pouvoir les découper.
const eclaterRun = (run) => {
  const rPr = enfantsElements(run).find((n) => estW(n, 'rPr'));
  const contenus = enfantsElements(run).filter((n) => !estW(n, 'rPr'));
  if (contenus.length <= 1) return;
  for (const c of contenus) {
    const nouveau = creerW(run.ownerDocument, 'r');
    if (rPr) nouveau.appendChild(rPr.cloneNode(true));
    nouveau.appendChild(c);
    run.parentNode.insertBefore(nouveau, run);
  }
  run.parentNode.removeChild(run);
};

const texteAtome = (run) => {
  const c = enfantsElements(run).find((n) => !estW(n, 'rPr'));
  if (!c) return '';
  if (estW(c, 't')) return c.textContent;
  if (estW(c, 'tab') || estW(c, 'br') || estW(c, 'cr')) return ' ';
  return '';
};

const indexerParagraphe = (p) => {
  const runsDuParagraphe = () =>
    Array.from(p.getElementsByTagNameNS(W, 'r')).filter((r) => ancetre(r, 'p') === p);
  runsDuParagraphe().forEach(eclaterRun);

  const atomes = [];
  let texte = '';
  for (const run of runsDuParagraphe()) {
    const t = texteAtome(run);
    atomes.push({ run, debut: texte.length, fin: texte.length + t.length });
    texte += t;
  }
  const pStyle = p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? '';
  return { p, texte, atomes, titre: /^(heading|titre|title)/i.test(pStyle), plages: [] };
};

// Coupe le run qui chevauche la position `pos` pour qu'une limite de run tombe exactement dessus
const couper = (info, pos) => {
  const i = info.atomes.findIndex((a) => a.debut < pos && pos < a.fin);
  if (i === -1) return;
  const a = info.atomes[i];
  const t = enfantsElements(a.run).find((n) => estW(n, 't'));
  const k = pos - a.debut;
  const clone = a.run.cloneNode(true);
  const tClone = enfantsElements(clone).find((n) => estW(n, 't'));
  const contenu = t.textContent;
  t.parentNode.replaceChild(creerTexte(a.run.ownerDocument, contenu.slice(0, k)), t);
  tClone.parentNode.replaceChild(creerTexte(a.run.ownerDocument, contenu.slice(k)), tClone);
  insererApres(clone, a.run);
  info.atomes.splice(i, 1, { run: a.run, debut: a.debut, fin: pos }, { run: clone, debut: pos, fin: a.fin });
};

// ─── Recherche tolérante des extraits cités par l'IA ──────────────────────────

// Normalise espaces, apostrophes et casse en gardant la correspondance vers le texte d'origine
const normaliser = (s) => {
  let norm = '';
  const index = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i].toLowerCase();
    if (/[’‘`´]/.test(c)) c = "'";
    if (/[“”«»]/.test(c)) c = '"';
    if (/\s/.test(c)) {
      if (norm.endsWith(' ')) continue;
      c = ' ';
    }
    norm += c;
    index.push(i);
  }
  return { norm, index };
};

const chevauche = (plages, debut, fin) => plages.some((pl) => debut < pl.fin && pl.debut < fin);

const localiser = (infos, extrait) => {
  const cible = extrait.trim();
  if (cible.length < 2) return null;

  // 1er passage : correspondance exacte ; 2e passage : correspondance normalisée
  for (const info of infos) {
    let pos = info.texte.indexOf(cible);
    while (pos !== -1) {
      if (!chevauche(info.plages, pos, pos + cible.length)) return { info, debut: pos, fin: pos + cible.length };
      pos = info.texte.indexOf(cible, pos + 1);
    }
  }
  const cibleNorm = normaliser(cible).norm.trim();
  for (const info of infos) {
    const { norm, index } = normaliser(info.texte);
    let pos = norm.indexOf(cibleNorm);
    while (pos !== -1) {
      const debut = index[pos];
      const fin = index[pos + cibleNorm.length - 1] + 1;
      if (!chevauche(info.plages, debut, fin)) return { info, debut, fin };
      pos = norm.indexOf(cibleNorm, pos + 1);
    }
  }
  return null;
};

// ─── Commentaires Word (comments.xml + relation + type de contenu) ────────────

const preparerCommentaires = async (zip, parser) => {
  const cheminRels = 'word/_rels/document.xml.rels';
  const rels = parser.parseFromString(await zip.file(cheminRels).async('string'), 'text/xml');
  const relations = Array.from(rels.getElementsByTagNameNS(NS_RELS, 'Relationship'));
  let relation = relations.find((r) => r.getAttribute('Type') === REL_COMMENTS);

  if (!relation) {
    const ids = new Set(relations.map((r) => r.getAttribute('Id')));
    let n = relations.length + 1;
    while (ids.has(`rId${n}`)) n++;
    relation = rels.createElementNS(NS_RELS, 'Relationship');
    relation.setAttribute('Id', `rId${n}`);
    relation.setAttribute('Type', REL_COMMENTS);
    relation.setAttribute('Target', 'comments.xml');
    rels.documentElement.appendChild(relation);
  }

  const cible = relation.getAttribute('Target').replace(/^\/?(word\/)?/, '');
  const chemin = `word/${cible}`;

  // Déclaration du type de contenu
  const ct = parser.parseFromString(await zip.file('[Content_Types].xml').async('string'), 'text/xml');
  const dejaDeclare = Array.from(ct.getElementsByTagNameNS(NS_CT, 'Override'))
    .some((o) => o.getAttribute('PartName') === `/${chemin}`);
  if (!dejaDeclare) {
    const o = ct.createElementNS(NS_CT, 'Override');
    o.setAttribute('PartName', `/${chemin}`);
    o.setAttribute('ContentType', CT_COMMENTS);
    ct.documentElement.appendChild(o);
  }

  const existant = zip.file(chemin);
  const comments = parser.parseFromString(
    existant
      ? await existant.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}"/>`,
    'text/xml'
  );
  const idMax = Math.max(-1, ...Array.from(comments.getElementsByTagNameNS(W, 'comment'))
    .map((c) => Number(c.getAttributeNS(W, 'id')) || 0));

  return { rels, ct, comments, chemin, prochainId: idMax + 1 };
};

const ajouterCommentaire = (comments, id, auteur, lignes) => {
  const c = creerW(comments, 'comment', {
    id, author: auteur, initials: auteur.split(/\s+/).map((m) => m[0] ?? '').join('').slice(0, 3).toUpperCase(),
    date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  });
  for (const { gras, texte } of lignes) {
    const p = creerW(comments, 'p');
    for (const morceau of [gras, texte].filter(Boolean)) {
      const r = creerW(comments, 'r');
      if (morceau === gras) {
        const rPr = creerW(comments, 'rPr');
        rPr.appendChild(creerW(comments, 'b'));
        r.appendChild(rPr);
      }
      r.appendChild(creerTexte(comments, morceau));
      p.appendChild(r);
    }
    c.appendChild(p);
  }
  comments.documentElement.appendChild(c);
};

// ─── Bilan de correction ajouté en fin de document ────────────────────────────

const paragraphe = (doc, morceaux, { taille = 22, filet = false, espaceAvant = 0 } = {}) => {
  const p = creerW(doc, 'p');
  const pPr = creerW(doc, 'pPr');
  if (filet) {
    const bdr = creerW(doc, 'pBdr');
    bdr.appendChild(creerW(doc, 'top', { val: 'single', sz: 8, space: 6, color: '4F46E5' }));
    pPr.appendChild(bdr);
  }
  pPr.appendChild(creerW(doc, 'spacing', { before: espaceAvant, after: 80 }));
  p.appendChild(pPr);
  for (const { texte, gras, couleur, italique } of morceaux) {
    const r = creerW(doc, 'r');
    const rPr = creerW(doc, 'rPr');
    if (gras) rPr.appendChild(creerW(doc, 'b'));
    if (italique) rPr.appendChild(creerW(doc, 'i'));
    if (couleur) rPr.appendChild(creerW(doc, 'color', { val: couleur }));
    rPr.appendChild(creerW(doc, 'sz', { val: taille }));
    r.appendChild(rPr);
    r.appendChild(creerTexte(doc, texte));
    p.appendChild(r);
  }
  return p;
};

export const construireBilan = (resultat, analyse, nonLocalisees) => {
  const axes = analyse.axesProgres?.length ? analyse.axesProgres : (resultat.conseilsPrioritaires ?? []);
  const aReprendre = [
    ...(analyse.informationsManquantes ?? []).map((t) => ({ categorie: 'manquant', texte: t })),
    ...nonLocalisees.map((a) => ({
      categorie: a.categorie,
      texte: `${a.explication}${a.correction ? ` (correction : ${a.correction})` : ''} — « ${a.extrait} »`,
    })),
  ];
  return {
    note: `${resultat.noteGlobale}/${resultat.noteMax}${resultat.mention ? ` — ${resultat.mention}` : ''}`,
    appreciation: resultat.appreciationGenerale ?? '',
    axes,
    aReprendre,
  };
};

const ajouterBilan = (doc, bilan) => {
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const sectPr = enfantsElements(body).filter((n) => estW(n, 'sectPr')).pop() ?? null;
  const ajouter = (p) => body.insertBefore(p, sectPr);

  ajouter(paragraphe(doc, [{ texte: 'Correction', gras: true, couleur: '4F46E5' }], { taille: 30, filet: true, espaceAvant: 360 }));
  ajouter(paragraphe(doc, [{ texte: 'Note obtenue : ', gras: true }, { texte: bilan.note, gras: true, couleur: '4F46E5' }], { taille: 26 }));
  ajouter(paragraphe(doc, [{ texte: 'Appréciation générale', gras: true }], { espaceAvant: 160 }));
  ajouter(paragraphe(doc, [{ texte: bilan.appreciation }]));
  if (bilan.axes.length) {
    ajouter(paragraphe(doc, [{ texte: 'Axes de progrès', gras: true }], { espaceAvant: 160 }));
    bilan.axes.forEach((a) => ajouter(paragraphe(doc, [{ texte: `•  ${a}` }])));
  }
  if (bilan.aReprendre.length) {
    ajouter(paragraphe(doc, [{ texte: 'Autres points à reprendre', gras: true }], { espaceAvant: 160 }));
    bilan.aReprendre.forEach((a) => ajouter(paragraphe(doc, [
      { texte: `•  ${LIBELLES_CATEGORIES[a.categorie] ?? a.categorie} : `, gras: true, couleur: 'C00000' },
      { texte: a.texte },
    ])));
  }
  ajouter(paragraphe(doc, [{
    texte: 'Légende : surligné en rouge = erreur (détail en commentaire) · surligné en vert = point réussi · texte barré = réponse fausse.',
    italique: true, couleur: '64748B',
  }], { taille: 18, espaceAvant: 200 }));
};

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * Annote une copie .docx.
 * Retourne le fichier annoté et un modèle (texte + plages annotées) réutilisé pour le PDF.
 */
// Bandeau d'identification en tête de copie (nom de l'élève + note), sur fond bleu clair
const ajouterEnTete = (doc, eleve, note) => {
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const p = paragraphe(doc, [
    { texte: `${eleve.nom} ${eleve.prenom}`, gras: true, couleur: '1E293B' },
    { texte: `      Note : ${note}`, gras: true, couleur: '4F46E5' },
  ], { taille: 28 });
  const pPr = enfantsElements(p).find((n) => estW(n, 'pPr'));
  pPr.insertBefore(creerW(doc, 'shd', { val: 'clear', color: 'auto', fill: 'EEF2FF' }), pPr.firstChild);
  body.insertBefore(p, body.firstChild);
};

export const annoterDocx = async (buffer, { analyse, resultat, eleve = null, auteur = 'Enseignant' }) => {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw erreur('Fichier Word illisible (format .docx attendu)', 422);
  }
  if (!zip.file('word/document.xml')) throw erreur('Fichier Word invalide : document.xml absent', 422);

  const parser = new DOMParser();
  const doc = parser.parseFromString(await zip.file('word/document.xml').async('string'), 'text/xml');
  const infos = Array.from(doc.getElementsByTagNameNS(W, 'p')).map(indexerParagraphe);
  const commentaires = await preparerCommentaires(zip, parser);

  const nonLocalisees = [];
  for (const annotation of analyse.annotations ?? []) {
    const trouve = localiser(infos, annotation.extrait ?? '');
    if (!trouve) {
      if (annotation.categorie !== 'correct') nonLocalisees.push(annotation);
      continue;
    }
    const { info, debut, fin } = trouve;
    couper(info, debut);
    couper(info, fin);
    const runs = info.atomes.filter((a) => a.debut >= debut && a.fin <= fin && a.fin > a.debut).map((a) => a.run);
    if (!runs.length) {
      if (annotation.categorie !== 'correct') nonLocalisees.push(annotation);
      continue;
    }

    const estErreur = annotation.categorie !== 'correct';
    const barrer = estErreur && annotation.reponseFausse === true;
    for (const run of runs) {
      definirProprieteRun(run, 'highlight', { val: estErreur ? 'red' : 'green' });
      if (barrer) definirProprieteRun(run, 'strike');
    }

    // Commentaire Word sur chaque erreur
    if (estErreur) {
      const id = commentaires.prochainId++;
      const premier = runs[0];
      const dernier = runs[runs.length - 1];
      premier.parentNode.insertBefore(creerW(doc, 'commentRangeStart', { id }), premier);
      const finPlage = creerW(doc, 'commentRangeEnd', { id });
      insererApres(finPlage, dernier);
      const reference = creerW(doc, 'r');
      reference.appendChild(creerW(doc, 'commentReference', { id }));
      insererApres(reference, finPlage);

      ajouterCommentaire(commentaires.comments, id, auteur, [
        { gras: `${LIBELLES_CATEGORIES[annotation.categorie] ?? 'Erreur'} : `, texte: annotation.explication },
        ...(annotation.correction ? [{ gras: 'Correction : ', texte: annotation.correction }] : []),
      ]);
    }
    info.plages.push({ debut, fin, annotation, barrer });
  }

  const bilan = construireBilan(resultat, analyse, nonLocalisees);
  ajouterBilan(doc, bilan);
  if (eleve) ajouterEnTete(doc, eleve, bilan.note);

  const xml = new XMLSerializer();
  zip.file('word/document.xml', xml.serializeToString(doc));
  zip.file(commentaires.chemin, xml.serializeToString(commentaires.comments));
  zip.file('word/_rels/document.xml.rels', xml.serializeToString(commentaires.rels));
  zip.file('[Content_Types].xml', xml.serializeToString(commentaires.ct));

  // Modèle pour le rendu PDF : paragraphes découpés en segments annotés, renvois numérotés
  let numero = 0;
  const notes = [];
  const paragraphes = infos.map((info) => {
    const plages = [...info.plages].sort((a, b) => a.debut - b.debut);
    const segments = [];
    let curseur = 0;
    for (const pl of plages) {
      if (pl.debut > curseur) segments.push({ texte: info.texte.slice(curseur, pl.debut) });
      const estErreur = pl.annotation.categorie !== 'correct';
      const seg = { texte: info.texte.slice(pl.debut, pl.fin), style: estErreur ? 'erreur' : 'correct', barre: pl.barrer };
      if (estErreur) {
        seg.numero = ++numero;
        notes.push({ numero, ...pl.annotation });
      }
      segments.push(seg);
      curseur = pl.fin;
    }
    if (curseur < info.texte.length) segments.push({ texte: info.texte.slice(curseur) });
    return { titre: info.titre, segments };
  });

  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    modele: { paragraphes, notes, bilan },
  };
};
