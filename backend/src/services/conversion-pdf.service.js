import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Conversion fidèle .docx → PDF avec LibreOffice en mode headless :
// mise en page, tableaux, images, surlignages et commentaires Word (en marge)
// sont rendus tels que dans Word. Si LibreOffice est absent, l'appelant
// se replie sur la remise en page pdfkit.

const CHEMINS_CONNUS = [
  '/usr/bin/soffice',
  '/usr/bin/libreoffice',
  '/usr/lib/libreoffice/program/soffice',
  '/opt/libreoffice/program/soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
];

// Commentaires Word exportés dans la marge de droite (option ignorée par les versions < 7.4)
const FILTRE_PDF = 'pdf:writer_pdf_Export:{"ExportNotesInMargin":{"type":"boolean","value":"true"}}';

let cheminSoffice;

export const trouverLibreOffice = () => {
  if (cheminSoffice === undefined) {
    const candidats = [process.env.LIBREOFFICE_PATH, ...CHEMINS_CONNUS].filter(Boolean);
    cheminSoffice = candidats.find((c) => existsSync(c)) ?? null;
  }
  return cheminSoffice;
};

const executer = (fichier, args, timeout) =>
  new Promise((resolve, reject) => {
    execFile(fichier, args, { timeout, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { message: `LibreOffice : ${stderr?.trim() || err.message}` }));
      else resolve(stdout);
    });
  });

// Une seule instance LibreOffice à la fois : deux processus ne peuvent pas partager le même profil
let fileAttente = Promise.resolve();
const enSerie = (tache) => {
  const suite = fileAttente.then(tache, tache);
  fileAttente = suite.catch(() => {});
  return suite;
};

const PROFIL = join(tmpdir(), 'evalpro-libreoffice-profil');

/**
 * Convertit plusieurs .docx en PDF en un seul lancement de LibreOffice.
 * @param {Buffer[]} buffers
 * @returns {Promise<(Buffer|null)[]>} un PDF par fichier, null si sa conversion a échoué
 */
export const convertirDocxEnPdf = (buffers) => enSerie(async () => {
  const soffice = trouverLibreOffice();
  if (!soffice) throw new Error('LibreOffice introuvable');

  const dossier = await mkdtemp(join(tmpdir(), 'evalpro-conversion-'));
  try {
    const entrees = buffers.map((_, i) => join(dossier, `copie-${i}.docx`));
    await Promise.all(buffers.map((b, i) => writeFile(entrees[i], b)));

    await executer(soffice, [
      `-env:UserInstallation=${pathToFileURL(PROFIL).href}`,
      '--headless', '--norestore', '--nolockcheck',
      '--convert-to', FILTRE_PDF,
      '--outdir', dossier,
      ...entrees,
    ], 60_000 + 15_000 * buffers.length);

    return Promise.all(entrees.map((e) => readFile(e.replace(/\.docx$/, '.pdf')).catch(() => null)));
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
});
