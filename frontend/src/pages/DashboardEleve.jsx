import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Award, AlertTriangle, TrendingUp, BookOpen,
  ArrowRight, ClipboardList, Target, Upload, CheckCircle2, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Badge from '../components/ui/Badge.jsx';

const NIVEAU_CONFIG = {
  DEPASSE:    { label: 'Dépassé',    couleur: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  ACQUIS:     { label: 'Acquis',     couleur: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  EN_COURS:   { label: 'En cours',   couleur: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  NON_ACQUIS: { label: 'Non acquis', couleur: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'DS', TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

function BadgeNiveau({ niveau }) {
  const cfg = NIVEAU_CONFIG[niveau] ?? { label: niveau, couleur: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.couleur}`}>
      {cfg.label}
    </span>
  );
}

export default function DashboardEleve() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const aujourd_hui = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['mon-portfolio'],
    queryFn: () => api.get('/portfolio/mon-portfolio').then((r) => r.data),
  });

  const { data: notifsData } = useQuery({
    queryKey: ['notifs'],
    queryFn: () => api.get('/notifications', { params: { lue: 'false', limite: 5 } }).then((r) => r.data),
  });

  const classeId = portfolio?.eleve?.classe?.id;

  const { data: devoirsData } = useQuery({
    queryKey: ['devoirs-eleve', classeId],
    queryFn: () => api.get('/evaluations', {
      params: { classeId, statut: 'PUBLIEE', limite: 5 },
    }).then((r) => r.data),
    enabled: !!classeId,
  });

  const stats = portfolio?.stats;
  const fragiles = portfolio?.competencesFragiles ?? [];
  const notesRecentes = portfolio?.notesRecentes ?? [];
  const notifs = notifsData?.notifications ?? [];
  const devoirs = devoirsData?.evaluations ?? [];

  const statCards = [
    {
      titre: 'Progression',
      valeur: stats ? `${stats.pourcentage}%` : '—',
      sousTitre: 'vers le diplôme',
      icone: Award,
      couleur: 'bg-indigo-500',
      loading: portfolioLoading,
    },
    {
      titre: 'Compétences acquises',
      valeur: stats?.acquises ?? '—',
      sousTitre: `sur ${stats?.total ?? '—'} au total`,
      icone: Target,
      couleur: 'bg-green-500',
      loading: portfolioLoading,
    },
    {
      titre: 'À renforcer',
      valeur: fragiles.length || '—',
      sousTitre: 'compétences fragiles',
      icone: AlertTriangle,
      couleur: fragiles.length > 0 ? 'bg-amber-500' : 'bg-gray-400',
      loading: portfolioLoading,
    },
    {
      titre: 'Notes reçues',
      valeur: stats?.totalNotes ?? '—',
      sousTitre: 'au total',
      icone: ClipboardList,
      couleur: 'bg-purple-500',
      loading: portfolioLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {utilisateur?.prenom} !
          </h1>
          <p className="text-gray-500 mt-0.5 capitalize">{aujourd_hui}</p>
          {portfolio?.eleve?.classe && (
            <p className="text-sm text-indigo-600 font-medium mt-1">{portfolio.eleve.classe.nom}</p>
          )}
        </div>
        <button
          onClick={() => navigate('/competences')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Target className="w-4 h-4" />
          Mes compétences
        </button>
      </div>

      {/* Accès rapide dépôt de devoir */}
      <button
        onClick={() => navigate('/evaluations')}
        className="w-full flex items-center gap-3 px-5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Upload className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Déposer un devoir</p>
          <p className="text-xs text-indigo-200 mt-0.5">Accéder à vos évaluations et déposer vos fichiers Word / Excel</p>
        </div>
        <ArrowRight className="w-5 h-5 text-indigo-300 flex-shrink-0" />
      </button>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.titre} {...s} />
        ))}
      </div>

      {/* Barre de progression */}
      {stats && stats.total > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              Progression vers le diplôme
            </h2>
            <span className="text-2xl font-bold text-indigo-600">{stats.pourcentage}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5 mb-3">
            {stats.acquises > 0 && (
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(stats.acquises / stats.total) * 100}%` }} />
            )}
            {stats.enCours > 0 && (
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${(stats.enCours / stats.total) * 100}%` }} />
            )}
            {stats.nonAcquises > 0 && (
              <div className="h-full bg-red-400 transition-all" style={{ width: `${(stats.nonAcquises / stats.total) * 100}%` }} />
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Acquis : <strong>{stats.acquises}</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />En cours : <strong>{stats.enCours}</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Non acquis : <strong>{stats.nonAcquises}</strong></span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devoirs à rendre */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding={false}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Devoirs à rendre</h2>
                <p className="text-sm text-gray-500 mt-0.5">Évaluations publiées pour votre classe</p>
              </div>
              <button
                onClick={() => navigate('/evaluations')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {devoirs.length === 0 ? (
              <div className="px-6 pb-6 text-center py-10 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun devoir en cours</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {devoirs.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/evaluations/${ev.id}`)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.titre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{TYPE_LABELS[ev.type] ?? ev.type}</span>
                        {ev.datePassage && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(ev.datePassage), 'd MMM', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge value={ev.statut} />
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 ml-3 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Notes récentes */}
          <Card padding={false}>
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-base font-semibold text-gray-900">Mes dernières notes</h2>
            </div>
            {portfolioLoading ? (
              <div className="px-6 pb-6 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : notesRecentes.length === 0 ? (
              <div className="px-6 pb-6 text-center py-10 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune note pour l'instant</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100">
                      <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Évaluation</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {notesRecentes.map((n) => {
                      const estPalier = Number.isInteger(n.valeur) && n.valeur >= 1 && n.valeur <= 4 && n.evaluation.noteMax > 4;
                      const pct = n.valeur !== null ? (estPalier ? (n.valeur / 4) * 100 : (n.valeur / n.evaluation.noteMax) * 100) : null;
                      const affichage = estPalier ? `${n.valeur}/4` : `${n.valeur}/${n.evaluation.noteMax}`;
                      return (
                        <tr key={n.id}>
                          <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[180px]">{n.evaluation.titre}</td>
                          <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[n.evaluation.type] ?? n.evaluation.type}</td>
                          <td className="px-4 py-3 text-right">
                            {n.valeur !== null ? (
                              <span className={`font-semibold ${pct >= 50 ? 'text-green-600' : 'text-red-500'}`}>{affichage}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Compétences fragiles */}
          {fragiles.length > 0 && (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    À renforcer
                  </span>
                }
                action={
                  <button
                    onClick={() => navigate('/competences')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    Voir tout <ArrowRight className="w-3 h-3" />
                  </button>
                }
              />
              <ul className="space-y-2">
                {fragiles.slice(0, 5).map((ce) => (
                  <li key={ce.id} className="flex items-start gap-2">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${ce.niveau === 'NON_ACQUIS' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700">{ce.competence.code}</p>
                      <p className="text-xs text-gray-500 truncate">{ce.competence.description}</p>
                    </div>
                    <BadgeNiveau niveau={ce.niveau} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Notifications récentes */}
          {notifs.length > 0 && (
            <Card>
              <CardHeader title="Nouveaux messages" />
              <ul className="space-y-2">
                {notifs.map((n) => (
                  <li key={n.id} className="flex gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{n.titre}</p>
                      <p className="text-xs text-gray-500">{n.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Moyennes par matière */}
          {(portfolio?.moyennesParMatiere ?? []).length > 0 && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Mes moyennes</span>} />
              <ul className="space-y-3">
                {portfolio.moyennesParMatiere.slice(0, 4).map(({ matiere, moyenne }) => (
                  <li key={matiere.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate max-w-[130px]">{matiere.nom}</span>
                      <span className={`font-semibold text-xs ${moyenne >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                        {moyenne !== null ? `${moyenne}/20` : '—'}
                      </span>
                    </div>
                    {moyenne !== null && (
                      <ProgressBar valeur={(moyenne / 20) * 100} couleur={moyenne >= 10 ? 'bg-green-500' : 'bg-red-400'} />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
