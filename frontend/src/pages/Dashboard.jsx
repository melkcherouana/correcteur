import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, ClipboardList, CheckCircle2,
  Plus, PenLine, Sparkles, FileText, ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import StatCard from '../components/ui/StatCard.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import DashboardEleve from './DashboardEleve.jsx';
import DashboardAdmin from './DashboardAdmin.jsx';

const ACTIONS_RAPIDES = [
  { label: 'Nouvelle évaluation',  icone: Plus,     couleur: 'bg-indigo-600 hover:bg-indigo-700', to: '/evaluations/nouvelle' },
  { label: 'Saisir des notes',     icone: PenLine,  couleur: 'bg-emerald-600 hover:bg-emerald-700', to: '/notes' },
  { label: 'Commentaire IA',       icone: Sparkles, couleur: 'bg-purple-600 hover:bg-purple-700', to: '/ia' },
  { label: 'Extraire compétences', icone: FileText, couleur: 'bg-amber-600 hover:bg-amber-700', to: '/ia' },
];

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'DS',
  TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral',
  PROJET: 'Projet',
  CCF: 'CCF',
};

function DashboardEnseignant() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const aujourd_hui = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const [elevesQ, classesQ, evalsQ, evalsCorrigeesQ] = useQueries({
    queries: [
      {
        queryKey: ['stats-eleves'],
        queryFn: () => api.get('/users', { params: { role: 'ELEVE', limite: 1 } }).then(r => r.data),
      },
      {
        queryKey: ['stats-classes'],
        queryFn: () => api.get('/classes', { params: { actif: true } }).then(r => r.data),
      },
      {
        queryKey: ['stats-evals'],
        queryFn: () => api.get('/evaluations', { params: { limite: 5 } }).then(r => r.data),
      },
      {
        queryKey: ['stats-evals-corrigees'],
        queryFn: () => api.get('/evaluations', { params: { statut: 'CORRIGEE', limite: 1 } }).then(r => r.data),
      },
    ],
  });

  const stats = [
    {
      titre: 'Élèves',
      valeur: elevesQ.data?.total ?? '—',
      sousTitre: 'comptes actifs',
      icone: Users,
      couleur: 'bg-indigo-500',
      loading: elevesQ.isLoading,
    },
    {
      titre: 'Classes actives',
      valeur: classesQ.data?.length ?? '—',
      sousTitre: 'cette année',
      icone: GraduationCap,
      couleur: 'bg-emerald-500',
      loading: classesQ.isLoading,
    },
    {
      titre: 'Mes évaluations',
      valeur: evalsQ.data?.total ?? '—',
      sousTitre: 'créées par vous',
      icone: ClipboardList,
      couleur: 'bg-amber-500',
      loading: evalsQ.isLoading,
    },
    {
      titre: 'Mes évals corrigées',
      valeur: evalsCorrigeesQ.data?.total ?? '—',
      sousTitre: 'notes saisies',
      icone: CheckCircle2,
      couleur: 'bg-purple-500',
      loading: evalsCorrigeesQ.isLoading,
    },
  ];

  const evaluationsRecentes = evalsQ.data?.evaluations ?? [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {utilisateur?.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-0.5 capitalize">{aujourd_hui}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.titre} {...s} />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évaluations récentes */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Évaluations récentes</h2>
                <p className="text-sm text-gray-500 mt-0.5">Les 5 dernières créées</p>
              </div>
              <button
                onClick={() => navigate('/evaluations')}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {evalsQ.isLoading ? (
              <div className="px-6 pb-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : evaluationsRecentes.length === 0 ? (
              <div className="px-6 pb-6 text-center py-10 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune évaluation créée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100">
                      <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Titre</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Classe</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {evaluationsRecentes.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => navigate(`/evaluations/${ev.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[200px]">
                          {ev.titre}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ev.classe?.nom}</td>
                        <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[ev.type] ?? ev.type}</td>
                        <td className="px-4 py-3">
                          <Badge value={ev.statut} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Actions rapides + Classes */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <Card>
            <CardHeader title="Actions rapides" />
            <div className="space-y-2">
              {ACTIONS_RAPIDES.map(({ label, icone: Icon, couleur, to }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${couleur}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* Classes rapides */}
          <Card>
            <CardHeader
              title="Mes classes"
              action={
                <button
                  onClick={() => navigate('/classes')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              }
            />
            {classesQ.isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (classesQ.data ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune classe</p>
            ) : (
              <div className="space-y-1">
                {(classesQ.data ?? []).slice(0, 5).map((classe) => (
                  <button
                    key={classe.id}
                    onClick={() => navigate(`/classes/${classe.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-gray-700">{classe.nom}</span>
                    <span className="text-xs text-gray-400">{classe._count?.eleves ?? 0} élèves</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { utilisateur } = useAuth();
  if (utilisateur?.role === 'ELEVE') return <DashboardEleve />;
  if (utilisateur?.role === 'ADMIN') return <DashboardAdmin />;
  return <DashboardEnseignant />;
}
