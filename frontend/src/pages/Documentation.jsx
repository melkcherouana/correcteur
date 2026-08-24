import { useState } from 'react';
import {
  BookOpen, GraduationCap, Users, ShieldCheck,
  LogIn, ClipboardList, Target, TrendingUp, ScrollText,
  Plus, Upload, Sparkles, PenLine, BarChart2,
  UserPlus, School, CalendarDays, FileSpreadsheet,
  ChevronRight, CheckCircle2, Info, ClipboardCheck,
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Données des guides ─────────────────────────────────── */

const GUIDES = [
  {
    id: 'eleve',
    label: 'Élève',
    icon: GraduationCap,
    couleur: 'sky',
    description: 'Accéder à vos évaluations, suivre vos compétences et consulter votre progression.',
    etapes: [
      {
        numero: 1,
        titre: 'Se connecter à EvalPro',
        icon: LogIn,
        details: [
          "Rendez-vous sur l'adresse EvalPro fournie par votre établissement.",
          "Saisissez votre identifiant (adresse e-mail) et votre mot de passe.",
          'Cliquez sur « Se connecter » pour accéder à votre espace personnel.',
        ],
        conseil: "En cas d'oubli de mot de passe, contactez votre enseignant ou l'administrateur.",
      },
      {
        numero: 2,
        titre: 'Consulter mes devoirs',
        icon: ClipboardList,
        details: [
          'Depuis le menu latéral, cliquez sur « Mes devoirs ».',
          "La liste de vos évaluations s'affiche avec leur statut (à rendre, corrigé…).",
          'Cliquez sur une évaluation pour voir le détail, les critères et votre note.',
        ],
      },
      {
        numero: 3,
        titre: 'Voir mes compétences',
        icon: Target,
        details: [
          'Depuis le menu latéral, ouvrez le groupe « Mes compétences » puis cliquez sur « Compétences ».',
          'Chaque compétence affiche votre niveau : Non acquis, En cours, Acquis ou Dépassé.',
          'Consultez les détails par bloc de compétences de votre référentiel.',
        ],
        conseil: 'Les niveaux sont mis à jour automatiquement après chaque correction.',
      },
      {
        numero: 4,
        titre: 'Suivre ma progression',
        icon: TrendingUp,
        details: [
          'Le tableau de bord affiche votre progression globale via des graphiques.',
          'Visualisez vos points forts et les compétences à renforcer.',
          "Comparez votre évolution sur l'année scolaire.",
        ],
      },
      {
        numero: 5,
        titre: 'Consulter mon suivi (absences, PFMP)',
        icon: CalendarDays,
        details: [
          'Accédez à « Mon suivi » dans le menu latéral.',
          'L\'onglet « Mes absences » liste vos absences et retards, avec leur statut de justification.',
          'L\'onglet « PFMP » affiche vos périodes de formation en entreprise et l\'évaluation de vos compétences par votre tuteur et votre enseignant.',
        ],
      },
      {
        numero: 6,
        titre: 'Consulter mon bulletin et ma certification',
        icon: ScrollText,
        details: [
          'Accédez à la section « Bulletins » pour télécharger votre bulletin de compétences en PDF, avec appréciation de vos enseignants.',
          'Accédez à « Certification » pour visualiser votre radar de maîtrise par pôle de compétences.',
          'Depuis « Certification », téléchargez votre profil de certification complet en PDF.',
        ],
      },
    ],
  },
  {
    id: 'enseignant',
    label: 'Enseignant',
    icon: Users,
    couleur: 'indigo',
    description: "Importer le référentiel, créer des évaluations, suivre absences/PFMP/CCF et exploiter l'IA pour générer des situations professionnelles.",
    etapes: [
      {
        numero: 1,
        titre: 'Accéder au tableau de bord',
        icon: LogIn,
        details: [
          'Connectez-vous avec vos identifiants enseignant (créés par l\'administrateur de l\'établissement).',
          'Le tableau de bord affiche vos statistiques : élèves, classes, évaluations récentes.',
          'Les actions rapides (nouvelle évaluation, IA…) sont accessibles en un clic.',
        ],
      },
      {
        numero: 2,
        titre: 'Importer le référentiel de compétences',
        icon: Upload,
        details: [
          'Accédez à « Paramètres > Référentiel » dans le menu latéral.',
          'Importez le référentiel officiel du diplôme au format PDF.',
          "L'IA analyse le document et propose une structure en pôles et compétences, réorganisable par glisser-déposer avant validation de l'import.",
        ],
        conseil: "Étape obligatoire en amont : sans référentiel importé, aucune compétence n'est disponible pour créer une évaluation.",
      },
      {
        numero: 3,
        titre: 'Créer une évaluation',
        icon: Plus,
        details: [
          'Cliquez sur « Évaluations » dans le menu latéral.',
          'Cliquez sur « Nouvelle évaluation » et remplissez le formulaire (titre, type, date, classe, matière).',
          'Associez les compétences du référentiel à évaluer, et rattachez-la à une séquence si besoin.',
        ],
        conseil: 'Vous pouvez sauvegarder en brouillon avant de publier pour les élèves.',
      },
      {
        numero: 4,
        titre: 'Saisir et corriger les notes',
        icon: PenLine,
        details: [
          "Ouvrez l'évaluation concernée depuis la liste.",
          'Cliquez sur chaque élève pour saisir son niveau par compétence, ou laissez l\'IA corriger un devoir déposé par l\'élève.',
          "L'appréciation générée par l'IA (note, points forts, axes d'amélioration) s'affiche automatiquement dès que la correction est disponible, sans clic supplémentaire.",
          'Publiez la correction pour que les élèves puissent consulter leurs résultats.',
        ],
      },
      {
        numero: 5,
        titre: 'Suivre absences, PFMP et CCF',
        icon: ClipboardCheck,
        details: [
          'Accédez à « Suivi élèves » dans le menu latéral.',
          '« Absences » : saisie par classe et par date, justification, statistiques par élève et par classe.',
          '« PFMP » : création des périodes de stage, évaluation des compétences par le tuteur et l\'enseignant, validation.',
          '« CCF » : création de contrôles en cours de formation, notation par élève, suivi de la complétion.',
        ],
      },
      {
        numero: 6,
        titre: "Utiliser les outils IA (Cours IA)",
        icon: Sparkles,
        details: [
          '« Séquences » organise votre progression pédagogique (aucune IA) ; « Situations pro » regroupe 7 générateurs IA de contenu, sans lien automatique avec vos séquences.',
          '« Situations pro » : génère un dossier complet — contexte d\'entreprise, documents à lire, annexes à remplir (facture, fiche de stock, bon de livraison) — un cas pratique prêt à distribuer.',
          '« Cours complet » : génère un cours structuré (plan + contenu détaillé) à partir d\'une compétence du référentiel — pour préparer une séance de cours.',
          '« Support de travail » : génère un exercice ciblé avec corrigé, plus court qu\'un cours complet, sans le décor entreprise.',
          '« Appréciation & Remédiation », « Questions d\'entretien », « Commentaire bulletin », « Compétences fragiles » : outils d\'analyse à partir des notes et compétences déjà enregistrées pour un élève.',
        ],
        conseil: "« Situations pro » (dossier avec documents commerciaux) et « Cours complet » (cours magistral) sont les deux onglets les plus proches à distinguer : le premier simule un contexte d'entreprise, le second prépare une leçon.",
      },
      {
        numero: 7,
        titre: 'Consulter les bilans',
        icon: BarChart2,
        details: [
          'Accédez à « Bilans > Certification » pour le radar de maîtrise par pôle et la grille de synthèse par classe.',
          'Accédez à « Bilans > Bulletins » pour générer un bulletin PDF avec commentaire IA par élève.',
          'Exportez ces documents en PDF pour les conseils de classe.',
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administrateur',
    icon: ShieldCheck,
    couleur: 'rose',
    description: "Gérer les utilisateurs, les classes et les années scolaires de l'établissement.",
    etapes: [
      {
        numero: 1,
        titre: 'Gérer les utilisateurs',
        icon: UserPlus,
        details: [
          'Depuis « Administration > Utilisateurs », consultez tous les comptes.',
          'Créez un utilisateur en cliquant sur « Nouvel utilisateur » et remplissez le formulaire.',
          "Attribuez le rôle approprié : Élève, Enseignant ou Admin.",
          'Modifiez ou désactivez un compte depuis les actions du tableau.',
        ],
        conseil: "Utilisez l'import Excel pour créer plusieurs utilisateurs en une seule opération.",
      },
      {
        numero: 2,
        titre: 'Créer et gérer les classes',
        icon: School,
        details: [
          'Accédez à « Paramètres > Classes ».',
          'Créez une classe en renseignant un nom, un niveau et une année scolaire.',
          "Affectez les élèves à chaque classe (l'accès des enseignants n'est pas restreint par classe).",
          "Consultez le détail d'une classe pour voir ses membres et évaluations.",
        ],
      },
      {
        numero: 3,
        titre: 'Gérer les années scolaires',
        icon: CalendarDays,
        details: [
          'Accédez à « Paramètres > Années scolaires ».',
          'Créez une nouvelle année (ex : 2024-2025) avec ses dates de début et de fin.',
          "Définissez l'année active : elle sera utilisée par défaut lors de la création de classes.",
          "Archivez les années passées pour conserver l'historique.",
        ],
      },
      {
        numero: 4,
        titre: 'Suivre PFMP, CCF et absences',
        icon: ClipboardCheck,
        details: [
          'Accédez à « Suivi élèves » dans le menu latéral, accessible comme pour les enseignants.',
          'Consultez et gérez les PFMP, les CCF et les absences de tous les élèves de l\'établissement.',
        ],
      },
      {
        numero: 5,
        titre: 'Import en masse',
        icon: FileSpreadsheet,
        details: [
          'Préparez votre fichier Excel selon le modèle fourni (Prénom, Nom, Email, Rôle, Classe).',
          'Depuis la page « Utilisateurs », cliquez sur « Importer ».',
          "Vérifiez l'aperçu des données détectées avant de valider.",
          'Les erreurs sont signalées ligne par ligne pour correction.',
        ],
        conseil: "Téléchargez le modèle Excel depuis l'interface pour éviter les erreurs de format.",
      },
    ],
  },
];

/* ─── Couleurs par guide ─────────────────────────────────── */

const COULEURS = {
  sky: {
    onglet:   'bg-sky-600 text-white',
    ongletInactif: 'text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30',
    badge:    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    icone:    'bg-sky-600',
    numero:   'bg-sky-600 text-white',
    trait:    'border-sky-200 dark:border-sky-800',
    conseil:  'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-300',
  },
  indigo: {
    onglet:   'bg-indigo-600 text-white',
    ongletInactif: 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
    badge:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    icone:    'bg-indigo-600',
    numero:   'bg-indigo-600 text-white',
    trait:    'border-indigo-200 dark:border-indigo-800',
    conseil:  'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300',
  },
  rose: {
    onglet:   'bg-rose-600 text-white',
    ongletInactif: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30',
    badge:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    icone:    'bg-rose-600',
    numero:   'bg-rose-600 text-white',
    trait:    'border-rose-200 dark:border-rose-800',
    conseil:  'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300',
  },
};

/* ─── Composant étape ────────────────────────────────────── */

function Etape({ etape, couleur, estDerniere }) {
  const c = COULEURS[couleur];
  const Icon = etape.icon;

  return (
    <div className="flex gap-4">
      {/* Colonne gauche : numéro + trait vertical */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', c.numero)}>
          {etape.numero}
        </div>
        {!estDerniere && (
          <div className={clsx('w-px flex-1 mt-2 border-l-2 border-dashed', c.trait)} />
        )}
      </div>

      {/* Colonne droite : contenu */}
      <div className={clsx('pb-8', estDerniere && 'pb-0')}>
        {/* En-tête de l'étape */}
        <div className="flex items-center gap-2 mb-3">
          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', c.icone)}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {etape.titre}
          </h3>
        </div>

        {/* Liste des sous-étapes */}
        <ul className="space-y-2 mb-3">
          {etape.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        {/* Conseil optionnel */}
        {etape.conseil && (
          <div className={clsx('flex items-start gap-2 text-xs px-3 py-2 rounded-lg border', c.conseil)}>
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{etape.conseil}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────── */

export default function Documentation() {
  const [guideActif, setGuideActif] = useState('eleve');
  const guide = GUIDES.find((g) => g.id === guideActif);
  const c = COULEURS[guide.couleur];
  const GuideIcon = guide.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ─── En-tête ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50">Documentation EvalPro</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Guides d'utilisation par profil</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-3 leading-relaxed">
          Retrouvez ci-dessous les guides pas à pas pour chaque profil d'utilisateur.
          Sélectionnez votre profil pour accéder aux instructions adaptées.
        </p>
      </div>

      {/* ─── Onglets de sélection ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Barre d'onglets */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {GUIDES.map((g) => {
            const Ic = g.icon;
            const actif = g.id === guideActif;
            const cc = COULEURS[g.couleur];
            return (
              <button
                key={g.id}
                onClick={() => setGuideActif(g.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors',
                  actif
                    ? cc.onglet
                    : clsx('text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b-2 border-transparent')
                )}
              >
                <Ic className="w-4 h-4" />
                <span className="hidden sm:inline">{g.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bandeau descriptif du guide actif */}
        <div className={clsx('flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-700/50')}>
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0', c.icone)}>
            <GuideIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-50">
              Guide {guide.label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{guide.description}</p>
          </div>
          <span className={clsx('ml-auto text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline-flex', c.badge)}>
            {guide.etapes.length} étapes
          </span>
        </div>

        {/* Étapes du guide */}
        <div className="px-6 py-6">
          {guide.etapes.map((etape, i) => (
            <Etape
              key={etape.numero}
              etape={etape}
              couleur={guide.couleur}
              estDerniere={i === guide.etapes.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ─── Pied de page / aide ─── */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-0.5">Besoin d'aide supplémentaire ?</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Contactez l'administrateur de votre établissement ou consultez la documentation technique complète fournie par votre référent numérique.
          </p>
        </div>
      </div>
    </div>
  );
}
