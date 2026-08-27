import prisma from '../utils/prisma.js';

export const listerAnnees = async () =>
  prisma.anneeFormation.findMany({ orderBy: { debut: 'desc' } });

export const obtenirAnneeActive = async () =>
  prisma.anneeFormation.findFirst({ where: { actif: true } });

// ─── Bornes d'un trimestre pour une année scolaire ───────────────────────────
// Repli sur un découpage en tiers égaux si finTrimestre1/2 ne sont pas renseignées.
export const bornesTrimestre = (annee, trimestre) => {
  const debut = new Date(annee.debut);
  const fin = new Date(annee.fin);
  const dureeMs = fin.getTime() - debut.getTime();
  const t1 = annee.finTrimestre1 ? new Date(annee.finTrimestre1) : new Date(debut.getTime() + dureeMs / 3);
  const t2 = annee.finTrimestre2 ? new Date(annee.finTrimestre2) : new Date(debut.getTime() + (dureeMs * 2) / 3);

  if (trimestre <= 1) return { debut, fin: t1 };
  if (trimestre === 2) return { debut: t1, fin: t2 };
  return { debut: t2, fin };
};

export const obtenirAnnee = async (id) => {
  const a = await prisma.anneeFormation.findUnique({ where: { id } });
  if (!a) throw Object.assign(new Error('Année introuvable'), { status: 404 });
  return a;
};

export const creerAnnee = async ({ libelle, debut, fin, finTrimestre1, finTrimestre2 }) => {
  const existante = await prisma.anneeFormation.findUnique({ where: { libelle } });
  if (existante) throw Object.assign(new Error(`L'année "${libelle}" existe déjà`), { status: 409 });
  return prisma.anneeFormation.create({
    data: {
      libelle,
      debut: new Date(debut),
      fin: new Date(fin),
      finTrimestre1: finTrimestre1 ? new Date(finTrimestre1) : null,
      finTrimestre2: finTrimestre2 ? new Date(finTrimestre2) : null,
    },
  });
};

export const mettreAJourAnnee = async (id, donnees) => {
  await obtenirAnnee(id);
  const data = { ...donnees };
  if (data.debut) data.debut = new Date(data.debut);
  if (data.fin) data.fin = new Date(data.fin);
  if ('finTrimestre1' in data) data.finTrimestre1 = data.finTrimestre1 ? new Date(data.finTrimestre1) : null;
  if ('finTrimestre2' in data) data.finTrimestre2 = data.finTrimestre2 ? new Date(data.finTrimestre2) : null;
  return prisma.anneeFormation.update({ where: { id }, data });
};

export const supprimerAnnee = async (id) => {
  const annee = await obtenirAnnee(id);
  if (annee.actif) throw Object.assign(new Error('Impossible de supprimer l\'année active'), { status: 409 });
  await prisma.anneeFormation.delete({ where: { id } });
};

// ─── Changement d'année scolaire ─────────────────────────────────────────────
// Progression des niveaux par filière : la dernière étape de chaque parcours
// vaut « dernière année » → la classe est archivée à la promotion suivante
// plutôt que promue. Un CAP dure 2 ans, un BAC PRO 3 ans, un BTS 2 ans : un
// seuil unique (ex. « niveauActuel >= 3 ») serait faux pour CAP/BTS, qui
// seraient alors indéfiniment promus vers un niveau inexistant.
// Doit rester synchronisé avec la liste NIVEAUX du formulaire de création de
// classe (frontend/src/pages/Classes.jsx).
const NIVEAU_SUIVANT = {
  '2nde Pro':      '1ère Pro',
  '1ère Pro':      'Terminale Pro',
  'Terminale Pro': null,
  'CAP 1':         'CAP 2',
  'CAP 2':         null,
  'BTS 1':         'BTS 2',
  'BTS 2':         null,
};

// Renommage optionnel : préfixe numérique du nom de classe incrémenté
// (ex. "1EPC A" → "2EPC A") lorsque le nom suit cette convention. La
// décision de promouvoir ou archiver ne repose JAMAIS sur le nom : un champ
// texte libre sans validation de format (ex. "Terminale VENTE", "BTS1-COM"
// sans chiffre en tête) ne doit pas faire échouer silencieusement la
// promotion, sans quoi la classe resterait active avec l'ancienne année
// sans aucun avertissement.
export const changerAnnee = async (nouvelleAnneeId) => {
  const nouvelleAnnee = await obtenirAnnee(nouvelleAnneeId);
  if (nouvelleAnnee.actif) {
    throw Object.assign(new Error('Cette année est déjà active'), { status: 409 });
  }

  return prisma.$transaction(async (tx) => {
    // Désactiver l'année courante
    await tx.anneeFormation.updateMany({ where: { actif: true }, data: { actif: false } });
    await tx.anneeFormation.update({ where: { id: nouvelleAnneeId }, data: { actif: true } });

    const classes = await tx.classe.findMany({ where: { actif: true } });

    // Traitement du préfixe numérique du nom le plus élevé vers le plus bas
    // pour éviter les conflits sur la contrainte @unique lors du renommage
    // (ex. renommer "2EPC A" en "3EPC A" avant que l'ancienne "3EPC A" ne
    // soit archivée sous un autre nom). Sans préfixe, le nom n'est pas
    // modifié donc l'ordre n'a pas d'incidence pour ces classes-là.
    const prefixeNom = (nom) => parseInt(nom.trim().match(/^(\d+)/)?.[1] ?? '0', 10);
    classes.sort((a, b) => prefixeNom(b.nom) - prefixeNom(a.nom));

    const promues = [];
    const archivees = [];
    const nonReconnues = [];

    for (const classe of classes) {
      if (!(classe.niveau in NIVEAU_SUIVANT)) {
        // Niveau libre/erroné non présent dans la table de progression :
        // on ne touche à rien plutôt que de risquer une promotion ou un
        // archivage incorrect. Signalé pour correction manuelle par l'admin.
        nonReconnues.push({ nom: classe.nom, niveau: classe.niveau });
        continue;
      }

      const niveauSuivant = NIVEAU_SUIVANT[classe.niveau];

      if (niveauSuivant === null) {
        // Dernière année du parcours → archiver + renommer pour libérer
        // le nom (contrainte @unique)
        const ancienNom = classe.nom;
        await tx.classe.update({
          where: { id: classe.id },
          data: { actif: false, nom: `${ancienNom} [${classe.annee}]` },
        });
        archivees.push(ancienNom);
      } else {
        const match = classe.nom.trim().match(/^(\d+)(.+)$/);
        const nouveauNom = match ? `${parseInt(match[1], 10) + 1}${match[2]}` : classe.nom;

        await tx.classe.update({
          where: { id: classe.id },
          data: {
            nom: nouveauNom,
            niveau: niveauSuivant,
            annee: nouvelleAnnee.libelle,
          },
        });
        promues.push({ avant: classe.nom, apres: nouveauNom });
      }
    }

    return {
      annee: nouvelleAnnee,
      bilan: {
        classesPromues: promues,
        classesArchivees: archivees,
        classesNonReconnues: nonReconnues,
        totalTraitees: promues.length + archivees.length,
      },
    };
  });
};
