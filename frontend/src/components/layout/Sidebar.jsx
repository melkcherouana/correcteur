import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ClipboardList, Target, BarChart2, Sparkles,
  ScrollText, Settings, Users, GraduationCap,
  CalendarDays, ClipboardCheck, BookOpen, PenLine,
  ChevronLeft, ChevronRight, ChevronDown, X, LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV = {
  ELEVE: [
    { label: 'Accueil',          to: '/',            icon: Home,          exact: true },
    { label: 'Mes devoirs',      to: '/evaluations', icon: ClipboardList },
    {
      label: 'Mes compétences',
      icon: Target,
      children: [
        { label: 'Compétences',  to: '/competences'   },
        { label: 'Mon portfolio', to: '/mon-portfolio' },
      ],
    },
    {
      label: 'Mon bilan',
      icon: BarChart2,
      children: [
        { label: 'Certification', to: '/certification' },
        { label: 'Bulletins',     to: '/bulletins'      },
      ],
    },
    {
      label: 'Mon suivi',
      icon: CalendarDays,
      children: [
        { label: 'PFMP',      to: '/pfmps'    },
        { label: 'Absences',  to: '/absences' },
      ],
    },
    { label: 'Documentation', to: '/documentation', icon: BookOpen },
  ],

  ENSEIGNANT: [
    { label: 'Accueil',      to: '/',            icon: Home,          exact: true },
    { label: 'Évaluations',  to: '/evaluations', icon: ClipboardList },
    { label: 'Notes',        to: '/notes',       icon: PenLine },
    {
      label: 'Cours IA',
      icon: Sparkles,
      children: [
        { label: 'Situations pro', to: '/ia'         },
        { label: 'Séquences',      to: '/sequences'  },
      ],
    },
    {
      label: 'Bilans',
      icon: ScrollText,
      children: [
        { label: 'Bulletins',     to: '/bulletins'    },
        { label: 'Certification', to: '/certification' },
      ],
    },
    {
      label: 'Suivi élèves',
      icon: ClipboardCheck,
      children: [
        { label: 'PFMP',      to: '/pfmps'    },
        { label: 'CCF',       to: '/ccf'      },
        { label: 'Absences',  to: '/absences' },
      ],
    },
    {
      label: 'Paramètres',
      icon: Settings,
      children: [
        { label: 'Référentiel', to: '/import-referentiel' },
        { label: 'Classes',     to: '/classes'            },
        { label: 'Compétences', to: '/competences'        },
      ],
    },
    { label: 'Documentation', to: '/documentation', icon: BookOpen },
  ],

  ADMIN: [
    { label: 'Accueil',       to: '/',     icon: Home,  exact: true },
    { label: 'Utilisateurs',  to: '/users', icon: Users },
    {
      label: 'Bilans',
      icon: ScrollText,
      children: [
        { label: 'Bulletins',     to: '/bulletins'     },
        { label: 'Certification', to: '/certification' },
      ],
    },
    {
      label: 'Suivi élèves',
      icon: ClipboardCheck,
      children: [
        { label: 'PFMP',      to: '/pfmps'    },
        { label: 'CCF',       to: '/ccf'      },
        { label: 'Absences',  to: '/absences' },
      ],
    },
    {
      label: 'Paramètres',
      icon: Settings,
      children: [
        { label: 'Classes',          to: '/classes'     },
        { label: 'Compétences',      to: '/competences' },
        { label: 'Années scolaires', to: '/annees'      },
      ],
    },
    { label: 'Documentation', to: '/documentation', icon: BookOpen },
  ],
};

/* ─── Lien simple ─── */
function NavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center rounded-lg text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
        )
      }
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

/* ─── Groupe dépliable ─── */
function NavGroup({ group, collapsed, onExpand }) {
  const location = useLocation();

  const isChildActive = group.children.some((c) =>
    location.pathname === c.to || location.pathname.startsWith(c.to + '/')
  );

  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mode réduit : icône + flyout au survol */
  if (collapsed) {
    return (
      <div className="relative group/nav">
        <button
          onClick={onExpand}
          title={group.label}
          className={clsx(
            'flex items-center justify-center w-full px-0 py-2 rounded-lg text-sm font-medium transition-colors',
            isChildActive
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
          )}
        >
          <group.icon className="w-4 h-4" />
        </button>

        {/* Flyout */}
        <div className="absolute left-full top-0 ml-2 z-50 hidden group-hover/nav:block min-w-44">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-700">
              {group.label}
            </p>
            {group.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'text-white bg-indigo-600'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Mode développé */
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isChildActive
            ? 'text-indigo-400'
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
        )}
      >
        <group.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/60 pl-3">
          {group.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center py-1.5 px-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'text-white bg-indigo-600/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar principale ─── */
export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }) {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/login');
  };

  const role = utilisateur?.role;
  const items = NAV[role] ?? NAV.ENSEIGNANT;

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-slate-900 flex flex-col overflow-x-hidden',
          'transition-all duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:z-auto',
          'w-64',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ─── Logo ─── */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50 flex-shrink-0">
          {/* Toute la zone (icône logo → chevron) replie/déploie la barre, en desktop uniquement */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Développer la barre' : 'Réduire la barre'}
            className="hidden lg:flex items-center justify-between flex-1 gap-2 overflow-hidden cursor-pointer"
          >
            <div className={clsx('flex items-center gap-2 overflow-hidden', collapsed && 'lg:hidden')}>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg whitespace-nowrap">EvalPro</span>
            </div>

            <div className={clsx('hidden', collapsed && 'lg:flex items-center justify-center flex-1')}>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            </div>

            <span className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors flex-shrink-0">
              {collapsed
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft  className="w-4 h-4" />}
            </span>
          </button>

          {/* Mobile : logo simple, pas de repli (le collapse n'existe qu'en desktop) */}
          <div className="flex lg:hidden items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg whitespace-nowrap">EvalPro</span>
          </div>

          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Navigation ─── */}
        <nav className={clsx(
          'flex-1 overflow-y-auto py-4 space-y-0.5',
          collapsed ? 'lg:px-2 px-3' : 'px-3'
        )}>
          {items.map((item, i) =>
            item.children ? (
              <NavGroup
                key={i}
                group={item}
                collapsed={collapsed}
                onExpand={onToggleCollapsed}
              />
            ) : (
              <NavItem key={i} item={item} collapsed={collapsed} />
            )
          )}
        </nav>

        {/* ─── Profil ─── */}
        <div className="border-t border-slate-700/50 flex-shrink-0">
          <div className={clsx(
            'flex items-center px-3 py-3',
            collapsed ? 'lg:flex-col lg:gap-2' : 'gap-3'
          )}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {utilisateur?.prenom?.[0]}{utilisateur?.nom?.[0]}
              </span>
            </div>

            <div className={clsx('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="text-sm font-medium text-white truncate">
                {utilisateur?.prenom} {utilisateur?.nom}
              </p>
              <p className="text-xs text-slate-400 truncate">{utilisateur?.role}</p>
            </div>

            <button
              onClick={handleDeconnexion}
              title="Se déconnecter"
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
