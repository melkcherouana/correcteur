import { useQuery } from '@tanstack/react-query';
import {
  Target, TrendingUp, AlertTriangle, BookOpen, Award,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const NIVEAU_CONFIG = {
  DEPASSE:    { label: 'Dépassé',     couleur: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',  barre: 'bg-violet-500', ordre: 4 },
  ACQUIS:     { label: 'Acquis',      couleur: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',    barre: 'bg-green-500',  ordre: 3 },
  EN_COURS:   { label: 'En cours',    couleur: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',    barre: 'bg-amber-400',  ordre: 2 },
  NON_ACQUIS: { label: 'Non acquis',  couleur: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',        barre: 'bg-red-400',    ordre: 1 },
};

function BadgeNiveau({ niveau }) {
  const cfg = NIVEAU_CONFIG[niveau] ?? { label: niveau, couleur: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.couleur}`}>
      {cfg.label}
    </span>
  );
}

function SectionMatiere({ groupe }) {
  const [ouvert, setOuvert] = useState(true);
  // Dénominateur = total du référentiel pour cette matière (pas seulement les évaluées)
  const total = groupe.totalCompetences > 0 ? groupe.totalCompetences : groupe.competences.length;
  const acquises = (groupe.stats.ACQUIS ?? 0) + (groupe.stats.DEPASSE ?? 0);
  const pct = total > 0 ? Math.round((acquises / total) * 100) : 0;

  return (
    <Card padding={false} className="overflow-hidden">
      <button
        onClick={() => setOuvert((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">{groupe.matiere.nom}</p>
            <p className="text-xs text-gray-400">{acquises}/{total} compétence{total > 1 ? 's' : ''} acquises ou dépassées</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block w-32">
            <ProgressBar valeur={pct} />
          </div>
          <span className="text-sm font-semibold text-gray-700 w-10 text-right">{pct}%</span>
          {ouvert ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {ouvert && (
        <ul className="border-t border-gray-100 divide-y divide-gray-50">
          {groupe.competences.map((ce) => (
            <li key={ce.id} className="flex items-start justify-between px-5 py-3 gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                  {ce.competence.code}
                </span>
                <p className="text-sm text-gray-700 leading-snug">{ce.competence.description}</p>
              </div>
              <BadgeNiveau niveau={ce.niveau} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function MonPortfolio() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mon-portfolio'],
    queryFn: () => api.get('/portfolio/mon-portfolio').then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <p className="text-red-500 text-center py-10">Impossible de charger le portfolio.</p>;

  const { eleve, stats, moyennesParMatiere, competencesParMatiere, competencesFragiles } = data;

  const barreProgression = [
    { label: 'Acquis', count: stats.acquises, couleur: 'bg-green-500' },
    { label: 'En cours', count: stats.enCours, couleur: 'bg-amber-400' },
    { label: 'Non acquis', count: stats.nonAcquises, couleur: 'bg-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Progression globale */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Progression vers le diplôme
            </h2>
            {eleve.filiere && (
              <p className="text-xs text-gray-400 mt-0.5">{eleve.filiere.nom} — {eleve.classe?.nom}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-indigo-600">{stats.pourcentage}%</span>
            <p className="text-xs text-gray-400">{stats.acquises}/{stats.total} compétences acquises</p>
          </div>
        </div>

        {/* Barre multi-couleur */}
        {stats.total > 0 && (
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
            {barreProgression.map(({ count, couleur }) =>
              count > 0 ? (
                <div
                  key={couleur}
                  className={`h-full ${couleur} transition-all duration-500`}
                  style={{ width: `${(count / stats.total) * 100}%` }}
                />
              ) : null
            )}
          </div>
        )}

        {/* Légende */}
        <div className="flex flex-wrap gap-4 mt-3">
          {barreProgression.map(({ label, count, couleur }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${couleur}`} />
              <span className="text-xs text-gray-500">{label} : <strong>{count}</strong></span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compétences fragiles */}
        <div className="lg:col-span-1 space-y-4">
          {competencesFragiles.length > 0 && (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    Compétences à renforcer
                  </span>
                }
              />
              <p className="text-xs text-gray-400 -mt-2 mb-3">{competencesFragiles.length} compétence{competencesFragiles.length > 1 ? 's' : ''} à travailler en priorité</p>
              <ul className="space-y-2">
                {competencesFragiles.slice(0, 8).map((ce) => (
                  <li key={ce.id} className="flex items-start gap-2">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${ce.niveau === 'NON_ACQUIS' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{ce.competence.code}</p>
                      <p className="text-xs text-gray-500 truncate">{ce.competence.description}</p>
                    </div>
                    <BadgeNiveau niveau={ce.niveau} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Moyennes par matière */}
          {moyennesParMatiere.length > 0 && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Moyennes</span>} />
              <ul className="space-y-3">
                {moyennesParMatiere.map(({ matiere, moyenne, nombreNotes }) => (
                  <li key={matiere.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium truncate max-w-[130px]">{matiere.nom}</span>
                      <span className={`font-semibold ${moyenne >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                        {moyenne !== null ? `${moyenne}/20` : '—'}
                      </span>
                    </div>
                    {moyenne !== null && (
                      <ProgressBar
                        valeur={(moyenne / 20) * 100}
                        couleur={moyenne >= 10 ? 'bg-green-500' : 'bg-red-400'}
                      />
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{nombreNotes} note{nombreNotes > 1 ? 's' : ''}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Compétences par matière */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Détail par matière
          </h2>
          {competencesParMatiere.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-400 text-center py-8">
                Aucune compétence enregistrée pour l'instant.
              </p>
            </Card>
          ) : (
            competencesParMatiere.map((groupe) => (
              <SectionMatiere key={groupe.matiere.id} groupe={groupe} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
