import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, GraduationCap, ClipboardList, BookOpen,
  Target, Upload, ScrollText, FileBarChart2,
  TrendingUp, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import StatCard from '../components/ui/StatCard.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const COULEURS_NIVEAUX = {
  NON_ACQUIS: '#ef4444',
  EN_COURS:   '#f59e0b',
  ACQUIS:     '#10b981',
  DEPASSE:    '#6366f1',
};
const LABELS_NIVEAUX = {
  NON_ACQUIS: 'Non acquis',
  EN_COURS:   'En cours',
  ACQUIS:     'Acquis',
  DEPASSE:    'Dépassé',
};
const LABELS_TYPE = {
  DEVOIR_SURVEILLE: 'DS',
  TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral',
  PROJET: 'Projet',
  CCF: 'CCF',
};

const ACTIONS_ADMIN = [
  { label: 'Utilisateurs',       to: '/users',               icon: Users,         couleur: 'bg-slate-700 hover:bg-slate-600' },
  { label: 'Import référentiel', to: '/import-referentiel',  icon: Upload,        couleur: 'bg-indigo-600 hover:bg-indigo-700' },
  { label: 'Bulletins',          to: '/bulletins',           icon: ScrollText,    couleur: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Certification',      to: '/certification',       icon: FileBarChart2, couleur: 'bg-amber-600 hover:bg-amber-700' },
  { label: 'Années scolaires',   to: '/annees',              icon: ClipboardList, couleur: 'bg-rose-600 hover:bg-rose-700' },
];

// ─── Tooltip personnalisé BarChart ────────────────────────────────────────────

function TooltipNotes({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium text-gray-800">{label}</p>
      <p className="text-indigo-600">{payload[0].value} note{payload[0].value !== 1 ? 's' : ''} saisie{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Label PieChart ───────────────────────────────────────────────────────────

function LabelPie({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Formater mois YYYY-MM ────────────────────────────────────────────────────

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const formatMois = (str) => {
  const [, m] = str.split('-');
  return MOIS_FR[parseInt(m, 10) - 1] ?? str;
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DashboardAdmin() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: () => api.get('/stats').then((r) => r.data),
  });

  const statCards = [
    { titre: 'Élèves',       valeur: stats?.totaux.eleves,      sousTitre: 'actifs',      icone: Users,        couleur: 'bg-indigo-500' },
    { titre: 'Enseignants',  valeur: stats?.totaux.enseignants,  sousTitre: 'actifs',      icone: ShieldCheck,  couleur: 'bg-purple-500' },
    { titre: 'Classes',      valeur: stats?.totaux.classes,      sousTitre: 'actives',     icone: GraduationCap,couleur: 'bg-emerald-500' },
    { titre: 'Évaluations',  valeur: stats?.totaux.evaluations,  sousTitre: 'créées',      icone: ClipboardList,couleur: 'bg-amber-500'  },
    { titre: 'Notes saisies',valeur: stats?.totaux.notes,        sousTitre: 'avec palier', icone: BookOpen,     couleur: 'bg-rose-500'   },
    { titre: 'Compétences',  valeur: stats?.totaux.competences,  sousTitre: 'au référentiel',icone: Target,     couleur: 'bg-cyan-500'   },
  ];

  const donneesNiveaux = (stats?.distributionNiveaux ?? []).map((d) => ({
    name: LABELS_NIVEAUX[d.niveau] ?? d.niveau,
    value: d.count,
    couleur: COULEURS_NIVEAUX[d.niveau] ?? '#94a3b8',
  }));

  const donneesBarres = (stats?.notesParMois ?? []).map((m) => ({
    mois: formatMois(m.mois),
    notes: m.total,
  }));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tableau de bord admin
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Bonjour, {utilisateur?.prenom} — vue globale de l'établissement
          </p>
        </div>
        {stats?.moyenneGenerale && (
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-700">{stats.moyenneGenerale}<span className="text-base font-normal text-gray-400">/4</span></p>
            <p className="text-xs text-gray-500 mt-0.5">palier moyen global</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <StatCard key={s.titre} {...s} loading={isLoading} />
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* BarChart notes par mois */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Notes saisies par mois"
            subtitle="6 derniers mois"
          />
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : donneesBarres.every((d) => d.notes === 0) ? (
            <p className="text-sm text-center text-gray-400 py-10">Aucune note saisie sur cette période</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={donneesBarres} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipNotes />} />
                <Bar dataKey="notes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* PieChart distribution compétences */}
        <Card className="lg:col-span-2">
          <CardHeader title="Niveaux de compétences" subtitle="Tous les élèves" />
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : donneesNiveaux.length === 0 ? (
            <p className="text-sm text-center text-gray-400 py-10">Aucune compétence évaluée</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donneesNiveaux}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={<LabelPie />}
                >
                  {donneesNiveaux.map((entry, i) => (
                    <Cell key={i} fill={entry.couleur} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>}
                  iconSize={10}
                />
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top classes + Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top classes */}
        <Card padding={false} className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Top classes — activité</h2>
            <p className="text-sm text-gray-500 mt-0.5">Classées par nombre d'évaluations</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !stats?.topClasses?.length ? (
            <p className="text-sm text-center text-gray-400 py-8">Aucune classe</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Classe</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Élèves</th>
                  <th className="text-right px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Évals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.topClasses.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/classes/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.nom}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{c._count.eleves}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-bold">
                        {c._count.evaluations}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Actions rapides admin */}
        <Card>
          <CardHeader title="Administration" />
          <div className="space-y-2">
            {ACTIONS_ADMIN.map(({ label, to, icon: Icon, couleur }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${couleur}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Évaluations par type */}
      {stats?.evalsParType?.length > 0 && (
        <Card>
          <CardHeader title="Répartition des évaluations par type" />
          <div className="flex flex-wrap gap-3">
            {stats.evalsParType.map((e) => (
              <div key={e.type} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{LABELS_TYPE[e.type] ?? e.type}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{e.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
