import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed EvalPro…\n');

  // ─── Utilisateurs ──────────────────────────────────────────────────────────

  const hash = (mdp) => bcrypt.hash(mdp, 12);

  const admin = await prisma.utilisateur.upsert({
    where: { email: 'admin@evalpro.fr' },
    update: { role: 'ADMIN', actif: true },
    create: {
      email:     'admin@evalpro.fr',
      motDePasse: await hash('Admin1234!'),
      prenom:    'Admin',
      nom:       'EvalPro',
      role:      'ADMIN',
    },
  });
  console.log(`✅ Admin       : ${admin.email}`);

  const enseignant = await prisma.utilisateur.upsert({
    where: { email: 'dupont.marie@evalpro.fr' },
    update: {},
    create: {
      email:     'dupont.marie@evalpro.fr',
      motDePasse: await hash('Enseignant1!'),
      prenom:    'Marie',
      nom:       'Dupont',
      role:      'ENSEIGNANT',
    },
  });
  console.log(`✅ Enseignant  : ${enseignant.email}`);


  // ─── Filières ──────────────────────────────────────────────────────────────

  const filieres = await Promise.all([
    prisma.filiere.upsert({
      where: { code: 'EPC' },
      update: {},
      create: { code: 'EPC', nom: 'Électrotechnique', description: 'BAC PRO Électrotechnique, Énergie, Équipements Communicants' },
    }),
    prisma.filiere.upsert({
      where: { code: 'MEI' },
      update: {},
      create: { code: 'MEI', nom: 'Maintenance Équipements Industriels', description: 'BAC PRO MEI' },
    }),
    prisma.filiere.upsert({
      where: { code: 'COM' },
      update: {},
      create: { code: 'COM', nom: 'Commerce', description: 'BAC PRO Métiers du Commerce et de la Vente' },
    }),
  ]);
  console.log(`\n✅ Filières    : ${filieres.map((f) => f.code).join(', ')}`);

  // ─── Année scolaire ────────────────────────────────────────────────────────

  const annee = await prisma.anneeFormation.upsert({
    where: { libelle: '2025-2026' },
    update: { actif: true },
    create: {
      libelle: '2025-2026',
      debut:   new Date('2025-09-01'),
      fin:     new Date('2026-06-30'),
      actif:   true,
    },
  });
  // Désactiver les autres années
  await prisma.anneeFormation.updateMany({
    where: { libelle: { not: '2025-2026' } },
    data:  { actif: false },
  });
  console.log(`✅ Année active : ${annee.libelle}`);

  // ─── Classes ───────────────────────────────────────────────────────────────

  const classesData = [
    { nom: '1EPC A', niveau: '1', filiereCode: 'EPC' },
    { nom: '2EPC A', niveau: '2', filiereCode: 'EPC' },
    { nom: '3EPC A', niveau: '3', filiereCode: 'EPC' },
    { nom: '1MEI A', niveau: '1', filiereCode: 'MEI' },
    { nom: '2COM A', niveau: '2', filiereCode: 'COM' },
  ];

  const classesCreees = [];
  for (const cd of classesData) {
    const filiere = filieres.find((f) => f.code === cd.filiereCode);
    const cls = await prisma.classe.upsert({
      where: { nom: cd.nom },
      update: { actif: true },
      create: { nom: cd.nom, niveau: cd.niveau, annee: annee.libelle, filiereId: filiere.id },
    });
    classesCreees.push(cls);
  }
  console.log(`✅ Classes     : ${classesCreees.map((c) => c.nom).join(', ')}`);

  // ─── Élèves (10 élèves répartis sur 2 classes) ────────────────────────────

  const elevesData = [
    { prenom: 'Lucas',   nom: 'Bernard',   email: 'lucas.bernard@eleve.fr',   classe: '1EPC A' },
    { prenom: 'Emma',    nom: 'Leroy',     email: 'emma.leroy@eleve.fr',      classe: '1EPC A' },
    { prenom: 'Nathan',  nom: 'Moreau',    email: 'nathan.moreau@eleve.fr',   classe: '1EPC A' },
    { prenom: 'Chloé',   nom: 'Simon',     email: 'chloe.simon@eleve.fr',     classe: '1EPC A' },
    { prenom: 'Antoine', nom: 'Laurent',   email: 'antoine.laurent@eleve.fr', classe: '1EPC A' },
    { prenom: 'Inès',    nom: 'Michel',    email: 'ines.michel@eleve.fr',     classe: '2EPC A' },
    { prenom: 'Théo',    nom: 'Garcia',    email: 'theo.garcia@eleve.fr',     classe: '2EPC A' },
    { prenom: 'Jade',    nom: 'Martinez',  email: 'jade.martinez@eleve.fr',   classe: '2EPC A' },
    { prenom: 'Maxime',  nom: 'Petit',     email: 'maxime.petit@eleve.fr',    classe: '2EPC A' },
    { prenom: 'Léa',     nom: 'Rousseau',  email: 'lea.rousseau@eleve.fr',    classe: '2EPC A' },
  ];

  let nbEleves = 0;
  for (const ed of elevesData) {
    const eleve = await prisma.utilisateur.upsert({
      where: { email: ed.email },
      update: {},
      create: {
        email:     ed.email,
        motDePasse: await hash('Eleve1234!'),
        prenom:    ed.prenom,
        nom:       ed.nom,
        role:      'ELEVE',
      },
    });

    const classe = classesCreees.find((c) => c.nom === ed.classe);
    if (classe) {
      await prisma.classeEleve.upsert({
        where: { eleveId: eleve.id },
        update: { classeId: classe.id },
        create: { eleveId: eleve.id, classeId: classe.id },
      });
    }
    nbEleves++;
  }
  console.log(`✅ Élèves      : ${nbEleves} créés / mis à jour`);

  // ─── Matières ──────────────────────────────────────────────────────────────

  const matieres = await Promise.all([
    prisma.matiere.upsert({
      where: { code: 'ELEC' },
      update: {},
      create: { code: 'ELEC', nom: 'Électrotechnique', coefficient: 5 },
    }),
    prisma.matiere.upsert({
      where: { code: 'AUTO' },
      update: {},
      create: { code: 'AUTO', nom: 'Automatismes', coefficient: 4 },
    }),
    prisma.matiere.upsert({
      where: { code: 'MATH' },
      update: {},
      create: { code: 'MATH', nom: 'Mathématiques', coefficient: 3 },
    }),
    prisma.matiere.upsert({
      where: { code: 'PSE' },
      update: {},
      create: { code: 'PSE', nom: 'PSE', coefficient: 1 },
    }),
  ]);
  console.log(`✅ Matières    : ${matieres.map((m) => m.code).join(', ')}`);

  // ─── Lier l'enseignant à ses matières ─────────────────────────────────────

  for (const matiere of matieres.slice(0, 2)) {
    await prisma.matiereEnseignant.upsert({
      where: { enseignantId_matiereId: { enseignantId: enseignant.id, matiereId: matiere.id } },
      update: {},
      create: { enseignantId: enseignant.id, matiereId: matiere.id },
    });
  }
  console.log(`✅ Matières liées à ${enseignant.prenom} ${enseignant.nom}`);

  // ─── Compétences (filière EPC) ────────────────────────────────────────────

  const elecMatiere = matieres.find((m) => m.code === 'ELEC');

  const competences = [
    { code: 'C1.1', description: 'Analyser un système électrique à partir d\'un dossier technique' },
    { code: 'C1.2', description: 'Identifier les composants et leurs fonctions dans un schéma' },
    { code: 'C2.1', description: 'Réaliser un câblage selon un schéma fourni' },
    { code: 'C2.2', description: 'Effectuer des mesures électriques et interpréter les résultats' },
    { code: 'C3.1', description: 'Diagnostiquer une panne à partir d\'observations et de mesures' },
  ];

  for (const cd of competences) {
    await prisma.competence.upsert({
      where: { code_matiereId: { code: cd.code, matiereId: elecMatiere.id } },
      update: {},
      create: { ...cd, matiereId: elecMatiere.id },
    });
  }
  console.log(`✅ Compétences : ${competences.length} créées (filière EPC)`);

  // ─── Séquence et évaluation de démonstration ──────────────────────────────

  const autoMatiere = matieres.find((m) => m.code === 'AUTO');
  const classe1EPC  = classesCreees.find((c) => c.nom === '1EPC A');

  const sequence = await prisma.sequence.upsert({
    where: { id: 'seed-seq-1' },
    update: {},
    create: {
      id:          'seed-seq-1',
      titre:       'S1 — Circuits électriques de base',
      description: 'Lois de Kirchhoff, résistances, puissance',
      objectifs:   'Maîtriser les grandeurs électriques fondamentales',
      ordre:       1,
      matiereId:   elecMatiere.id,
    },
  });

  const evaluation = await prisma.evaluation.upsert({
    where: { id: 'seed-eval-1' },
    update: {},
    create: {
      id:          'seed-eval-1',
      titre:       'DS N°1 — Circuits électriques',
      type:        'DEVOIR_SURVEILLE',
      statut:      'PUBLIEE',
      noteMax:     20,
      coefficient: 2,
      datePassage: new Date('2026-06-15'),
      sequenceId:  sequence.id,
      classeId:    classe1EPC.id,
      createurId:  enseignant.id,
    },
  });
  console.log(`✅ Évaluation  : "${evaluation.titre}" (${evaluation.statut})`);

  // ─── Résumé ────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────');
  console.log('🎉 Seed terminé avec succès !\n');
  console.log('Comptes disponibles :');
  console.log('  Admin      : admin@evalpro.fr         / Admin1234!');
  console.log('  Enseignant : dupont.marie@evalpro.fr  / Enseignant1!');
  console.log('  Élèves     : lucas.bernard@eleve.fr   / Eleve1234!');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
