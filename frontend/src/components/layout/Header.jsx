import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import NotificationsDropdown from '../notifications/NotificationsDropdown.jsx';

const ROLE_LABELS = { ADMIN: 'Admin', ENSEIGNANT: 'Enseignant', ELEVE: 'Élève' };

const TITRES = {
  '/':                 'Tableau de bord',
  '/classes':          'Classes',
  '/evaluations':      'Évaluations',
  '/notes':            'Notes',
  '/competences':      'Compétences',
  '/ia':               'Assistant IA',
  '/users':            'Utilisateurs',
  '/annees':           'Années scolaires',
  '/mon-portfolio':    'Mon portfolio',
  '/sequences':        'Séquences',
  '/pfmps':            'PFMP',
  '/ccf':              'CCF',
  '/absences':         'Absences',
  '/bulletins':        'Bulletins',
  '/certification':    'Certification',
  '/import-referentiel': 'Import référentiel',
  '/documentation':      'Documentation',
};

export default function Header({ onMenuClick, isDark, onToggleDark }) {
  const { pathname } = useLocation();
  const { utilisateur } = useAuth();

  const titre = TITRES[pathname] ?? TITRES['/' + pathname.split('/')[1]] ?? 'EvalPro';

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-50">{titre}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Bouton mode clair / sombre */}
        <button
          onClick={onToggleDark}
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark
            ? <Sun  className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {utilisateur?.prenom?.[0]}{utilisateur?.nom?.[0]}
            </span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {utilisateur?.prenom} {utilisateur?.nom}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {ROLE_LABELS[utilisateur?.role] ?? utilisateur?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
