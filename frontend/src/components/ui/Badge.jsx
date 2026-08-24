import clsx from 'clsx';

const STATUT_VARIANTS = {
  BROUILLON:  'bg-gray-100 text-gray-600',
  PUBLIEE:    'bg-blue-100 text-blue-700',
  CORRIGEE:   'bg-emerald-100 text-emerald-700',
  ARCHIVEE:   'bg-slate-100 text-slate-500',
};

const ROLE_VARIANTS = {
  ADMIN:      'bg-red-100 text-red-700',
  ENSEIGNANT: 'bg-indigo-100 text-indigo-700',
  ELEVE:      'bg-sky-100 text-sky-700',
};

const NIVEAU_VARIANTS = {
  NON_ACQUIS: 'bg-red-100 text-red-700',
  EN_COURS:   'bg-amber-100 text-amber-700',
  ACQUIS:     'bg-emerald-100 text-emerald-700',
  DEPASSE:    'bg-violet-100 text-violet-700',
};

const LABELS = {
  BROUILLON:  'Brouillon',
  PUBLIEE:    'Publiée',
  CORRIGEE:   'Corrigée',
  ARCHIVEE:   'Archivée',
  ADMIN:      'Admin',
  ENSEIGNANT: 'Enseignant',
  ELEVE:      'Élève',
  NON_ACQUIS: 'Non acquis',
  EN_COURS:   'En cours',
  ACQUIS:     'Acquis',
  DEPASSE:    'Dépassé',
  DEVOIR_SURVEILLE: 'DS',
  TRAVAUX_PRATIQUES: 'TP',
  ORAL:       'Oral',
  PROJET:     'Projet',
  CCF:        'CCF',
};

const ALL_VARIANTS = { ...STATUT_VARIANTS, ...ROLE_VARIANTS, ...NIVEAU_VARIANTS };

export default function Badge({ value, label, className }) {
  const variant = ALL_VARIANTS[value] ?? 'bg-gray-100 text-gray-600';
  const text = label ?? LABELS[value] ?? value;
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variant, className)}>
      {text}
    </span>
  );
}
