import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import api from '../services/api.js';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { Download, FileText, ChevronDown, ChevronUp, User, Target, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

const NIVEAU_COULEUR = {
  NON_ACQUIS: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  EN_COURS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ACQUIS: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  DEPASSE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};
const NIVEAU_LABEL = {
  NON_ACQUIS: 'Non acquis',
  EN_COURS: 'En cours',
  ACQUIS: 'Acquis',
  DEPASSE: 'Dépassé',
};

// ─── Bouton téléchargement PDF ────────────────────────────────────────────────

function BoutonPdf({ eleveId, trimestre }) {
  const [chargement, setChargement] = useState(false);

  const telecharger = async () => {
    setChargement(true);
    try {
      const resp = await api.get(`/bulletins/${eleveId}/pdf?trimestre=${trimestre}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_trimestre${trimestre}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setChargement(false);
    }
  };

  return (
    <button
      onClick={telecharger}
      disabled={chargement}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
    >
      {chargement ? (
        <Spinner className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {chargement ? 'Génération…' : 'Télécharger PDF'}
    </button>
  );
}

// ─── Radar de certification (bilan de fin de période) ────────────────────────

const NIVEAU_SCORE = { NON_ACQUIS: 0, EN_COURS: 33, ACQUIS: 66, DEPASSE: 100 };

function RadarBilan({ competencesParMatiere, eleve }) {
  const radarData = competencesParMatiere.map((pm) => ({
    matiere: pm.matiere.code,
    nomComplet: pm.matiere.nom,
    score: pm.competences.length > 0
      ? Math.round(pm.competences.reduce((s, c) => s + (NIVEAU_SCORE[c.niveau] ?? 0), 0) / pm.competences.length)
      : 0,
    acquises: (pm.stats.ACQUIS ?? 0) + (pm.stats.DEPASSE ?? 0),
    total: pm.competences.length,
  }));

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-indigo-600" />
        Radar de positionnement — Bilan fin de période
      </h3>
      <div className="rounded-xl border border-slate-200 p-4 bg-white">
        <p className="text-xs text-slate-500 text-center mb-2">0 = Non acquis → 100 = Dépassé</p>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="matiere" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickCount={4} />
            <Radar
              name={`${eleve.prenom} ${eleve.nom}`}
              dataKey="score"
              stroke="#4f46e5"
              fill="#4f46e5"
              fillOpacity={0.25}
              dot={{ r: 4, fill: '#4f46e5' }}
            />
            <Tooltip
              formatter={(value, _, props) => [
                `${value}/100 — ${props.payload.acquises}/${props.payload.total} acquises`,
                props.payload.nomComplet,
              ]}
              contentStyle={{ fontSize: 11 }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Tableau récap */}
        <table className="w-full text-xs mt-3 border-t border-slate-100 pt-3">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left py-1.5 px-2">Pôle</th>
              <th className="text-right py-1.5 px-2">Score</th>
              <th className="text-right py-1.5 px-2">Acquises</th>
              <th className="text-right py-1.5 px-2 hidden sm:table-cell">Barre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {radarData.map((row) => (
              <tr key={row.matiere} className="hover:bg-slate-50">
                <td className="py-1.5 px-2">
                  <span className="font-mono font-bold text-indigo-600 mr-1">{row.matiere}</span>
                  <span className="text-slate-600">{row.nomComplet}</span>
                </td>
                <td className="py-1.5 px-2 text-right font-bold text-indigo-700">{row.score}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{row.acquises}/{row.total}</td>
                <td className="py-1.5 px-2 hidden sm:table-cell">
                  <div className="w-20 bg-slate-200 rounded-full h-1.5 ml-auto">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${row.score}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bloc synthèse IA ─────────────────────────────────────────────────────────

function SyntheseIA({ eleveId, trimestre }) {
  const [tonalite, setTonalite] = useState('bienveillant');
  const [comportement, setComportement] = useState('');

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/commentaire-bulletin', { eleveId, trimestre, tonalite, comportement }).then((r) => r.data),
  });

  const resultat = data?.resultat;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-indigo-100 bg-indigo-50">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-800">Commentaire IA pour le conseil de classe</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Tonalité</label>
            <select value={tonalite} onChange={(e) => setTonalite(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="bienveillant">Bienveillant</option>
              <option value="neutre">Neutre</option>
              <option value="exigeant">Exigeant</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">Comportement / Assiduité (facultatif)</label>
            <input
              value={comportement}
              onChange={(e) => setComportement(e.target.value)}
              placeholder="Ex : Élève sérieux, quelques absences…"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error?.response?.data?.message ?? 'Erreur lors de la génération'}
          </div>
        )}

        <button
          onClick={() => { reset(); mutate(); }}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
          {isPending ? 'Génération…' : 'Générer le commentaire'}
        </button>

        {resultat && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Commentaire généré</span>
              {resultat.alertePedagogique && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 ml-2">
                  ⚠ Suivi pédagogique recommandé
                </span>
              )}
            </div>

            <div className="bg-white border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-900 leading-relaxed font-medium">{resultat.commentaire}</p>
            </div>

            {(resultat.pointsForts?.length > 0 || resultat.axesProgres?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resultat.pointsForts?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Points forts</p>
                    <ul className="space-y-0.5">
                      {resultat.pointsForts.map((p, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                          <span className="text-emerald-500 font-bold">·</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {resultat.axesProgres?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1">Axes de progrès</p>
                    <ul className="space-y-0.5">
                      {resultat.axesProgres.map((p, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                          <span className="text-amber-500 font-bold">·</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {resultat.objectifProchainTrimestre && (
              <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                Objectif T{trimestre + 1} : <strong>{resultat.objectifProchainTrimestre}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vue bulletin d'un élève ──────────────────────────────────────────────────

function BulletinEleve({ eleveId, peutGenererCommentaire = false }) {
  const [trimestre, setTrimestre] = useState(1);
  const [polesOuverts, setPolesOuverts] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['bulletin', eleveId, trimestre],
    queryFn: async () => {
      const { data } = await api.get(`/bulletins/${eleveId}?trimestre=${trimestre}`);
      return data;
    },
  });

  const togglePole = (id) => setPolesOuverts((p) => ({ ...p, [id]: !p[id] }));

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return null;

  const { eleve, stats, moyennesParMatiere, competencesParMatiere, periodeFiltre } = data;

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur trimestre */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {eleve.prenom[0]}{eleve.nom[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{eleve.prenom} {eleve.nom}</h2>
            <p className="text-sm text-slate-500">
              {eleve.classe?.nom ?? 'Classe N/A'}
              {eleve.filiere && ` — ${eleve.filiere.nom}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                onClick={() => setTrimestre(t)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  trimestre === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                T{t}
              </button>
            ))}
          </div>
          <BoutonPdf eleveId={eleveId} trimestre={trimestre} />
        </div>
      </div>

      {/* Période du trimestre affiché */}
      {periodeFiltre ? (
        <p className="text-xs text-slate-400">
          Notes du {format(new Date(periodeFiltre.debut), 'd MMM yyyy', { locale: fr })} au {format(new Date(periodeFiltre.fin), 'd MMM yyyy', { locale: fr })}
        </p>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          Aucune année scolaire active configurée — les notes affichées ne sont pas filtrées par trimestre (historique complet).
        </p>
      )}

      {/* Progression */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Progression vers le diplôme</span>
          <span className="text-2xl font-bold text-indigo-700">{stats.pourcentage}%</span>
        </div>
        <p className="text-xs text-slate-400 -mt-1 mb-2">État actuel des compétences, toutes périodes confondues</p>
        <ProgressBar value={stats.pourcentage} max={100} />
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="text-green-600 font-medium">{stats.acquises} acquises</span>
          <span className="text-yellow-600 font-medium">{stats.enCours} en cours</span>
          <span className="text-red-500 font-medium">{stats.nonAcquises} non acquises</span>
          <span className="ml-auto">{stats.total} total</span>
        </div>
      </div>

      {/* Moyennes */}
      {moyennesParMatiere.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Moyennes par matière
          </h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Matière</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Moyenne</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moyennesParMatiere.map((m) => (
                  <tr key={m.matiere.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{m.matiere.nom}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {m.moyenne !== null ? `${m.moyenne}/20` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{m.nombreNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compétences */}
      {competencesParMatiere.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Compétences par matière</h3>
          <div className="space-y-2">
            {competencesParMatiere.map((pm) => {
              const ouvert = polesOuverts[pm.matiere.id] ?? true;
              return (
                <div key={pm.matiere.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={() => togglePole(pm.matiere.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{pm.matiere.code}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{pm.matiere.nom}</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {pm.stats.ACQUIS + pm.stats.DEPASSE}/{pm.competences.length}
                      </span>
                    </div>
                    {ouvert ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {ouvert && (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                      {pm.competences.map((ce) => (
                        <li key={ce.id} className="flex items-start gap-3 px-4 py-2.5">
                          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex-shrink-0 min-w-16">
                            {ce.competence.code}
                          </span>
                          <p className="flex-1 text-sm text-slate-700 dark:text-slate-300 min-w-0">
                            {ce.competence.description}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${NIVEAU_COULEUR[ce.niveau]}`}>
                            {NIVEAU_LABEL[ce.niveau]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Radar par pôle */}
      {competencesParMatiere.length >= 3 && (
        <RadarBilan competencesParMatiere={competencesParMatiere} eleve={eleve} />
      )}

      {/* Synthèse IA (enseignant/admin uniquement) */}
      {peutGenererCommentaire && <SyntheseIA eleveId={eleveId} trimestre={trimestre} />}
    </div>
  );
}

// ─── Liste des élèves (enseignant/admin) ─────────────────────────────────────

function ListeEleves({ onSelect }) {
  const { data: eleves = [], isLoading } = useQuery({
    queryKey: ['eleves-bulletins'],
    queryFn: async () => {
      const { data } = await api.get('/bulletins');
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!eleves.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        Aucun élève trouvé dans la base de données.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {eleves.map((el) => (
        <button
          key={el.id}
          onClick={() => onSelect(el)}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all text-left"
        >
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{el.nom} {el.prenom}</p>
            <p className="text-xs text-slate-500 truncate">{el.classe?.nom ?? 'Sans classe'}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {el.totalNotes} note(s) · {el.totalCompetences} compétence(s)
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Bulletins() {
  const { utilisateur } = useAuth();
  const estEleve = utilisateur?.role === 'ELEVE';
  const [eleveSelectionne, setEleveSelectionne] = useState(null);

  const eleveId = estEleve ? utilisateur.id : eleveSelectionne?.id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulletins de compétences</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {estEleve ? 'Consultez votre bulletin et téléchargez-le en PDF.' : 'Sélectionnez un élève pour consulter ou exporter son bulletin.'}
          </p>
        </div>
        {eleveSelectionne && !estEleve && (
          <button
            onClick={() => setEleveSelectionne(null)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ← Retour à la liste
          </button>
        )}
      </div>

      {estEleve || eleveId ? (
        <BulletinEleve eleveId={eleveId} peutGenererCommentaire={!estEleve} />
      ) : (
        <ListeEleves onSelect={setEleveSelectionne} />
      )}
    </div>
  );
}
