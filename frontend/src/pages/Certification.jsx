import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  Award, Download, Sparkles, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const NIVEAUX = ['NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE'];
const NIVEAU_CFG = {
  NON_ACQUIS: { label: 'Non acquis', court: 'NA', bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',       score: 0   },
  EN_COURS:   { label: 'En cours',   court: 'EC', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', score: 33  },
  ACQUIS:     { label: 'Acquis',     court: 'A',  bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',   score: 66  },
  DEPASSE:    { label: 'Dépassé',    court: 'D',  bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', score: 100 },
};
const NON_EVALUE = { label: 'Non évalué', court: '—', bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-400 dark:text-slate-400', score: 0 };

const cfg  = (niveau) => NIVEAU_CFG[niveau] ?? NON_EVALUE;
const pole = (code)   => code?.split('.')[0] ?? code;

const scoreParPole = (competences, niveaux = {}) => {
  const poles = {};
  for (const c of competences) {
    const p = pole(c.code);
    const n = niveaux[c.id];
    (poles[p] ??= { scores: [], noms: [] }).scores.push(NIVEAU_CFG[n]?.score ?? 0);
    poles[p].noms.push(c.code);
  }
  return Object.entries(poles).map(([nom, { scores }]) => ({
    pole: nom,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
};

// ─── Sélecteurs communs ───────────────────────────────────────────────────────

function SelectClasse({ value, onChange }) {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">— Classe —</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
    </select>
  );
}

function SelectMatiere({ value, onChange }) {
  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then((r) => r.data),
  });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">— Toutes les matières —</option>
      {matieres.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
    </select>
  );
}

function SelectEleve({ classeId, value, onChange }) {
  const { data: detail } = useQuery({
    queryKey: ['classe', classeId],
    queryFn: () => api.get(`/classes/${classeId}`).then((r) => r.data),
    enabled: !!classeId,
  });
  const eleves = detail?.eleves?.map((e) => e.eleve) ?? [];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      disabled={!classeId}
    >
      <option value="">— Élève —</option>
      {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
    </select>
  );
}

// ─── Onglet 1 : Radar par pôle ────────────────────────────────────────────────

function OngletRadar({ estEleve, monId }) {
  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId]   = useState('');

  const idCible = estEleve ? monId : eleveId;

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-certif', idCible],
    queryFn: () => api.get(idCible ? `/portfolio/${idCible}` : '/portfolio/mon-portfolio').then((r) => r.data),
    enabled: !!idCible,
  });

  const competences = data?.competencesParMatiere?.flatMap((pm) =>
    pm.competences.map((ce) => ({
      id:      ce.id,
      code:    ce.competence.code,
      niveau:  ce.niveau,
      matiere: pm.matiere.nom,
    }))
  ) ?? [];

  const niveauxIdx = Object.fromEntries(competences.map((c) => [c.id, c.niveau]));
  const radarData  = scoreParPole(competences, niveauxIdx);

  const eleve = data?.eleve;

  return (
    <div className="space-y-6">
      {!estEleve && (
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Classe</label>
              <SelectClasse value={classeId} onChange={(v) => { setClasseId(v); setEleveId(''); }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Élève</label>
              <SelectEleve classeId={classeId} value={eleveId} onChange={setEleveId} />
            </div>
          </div>
        </Card>
      )}

      {!idCible && (
        <div className="text-center py-16 text-gray-400">
          {estEleve ? 'Chargement…' : 'Sélectionnez un élève pour afficher son radar.'}
        </div>
      )}

      {idCible && isLoading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

      {idCible && !isLoading && data && (
        <>
          {/* Carte élève */}
          {eleve && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {eleve.prenom[0]}{eleve.nom[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{eleve.prenom} {eleve.nom}</p>
                  <p className="text-sm text-gray-500">{eleve.classe?.nom}{eleve.filiere && ` — ${eleve.filiere.nom}`}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-indigo-600">{data.stats?.pourcentage ?? 0}%</p>
                  <p className="text-xs text-gray-400">progression diplôme</p>
                </div>
              </div>
            </Card>
          )}

          {radarData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Aucune compétence évaluée.</div>
          ) : (
            <>
              {/* Graphique radar */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
                  Radar de certification — score par pôle (0 = non acquis → 100 = dépassé)
                </h3>
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="pole"
                      tick={{ fontSize: 12, fill: '#4f46e5', fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickCount={5}
                    />
                    <Radar
                      name={eleve ? `${eleve.prenom} ${eleve.nom}` : 'Élève'}
                      dataKey="score"
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.25}
                      dot={{ r: 5, fill: '#4f46e5' }}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}/100`, 'Score pôle']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* Tableau par pôle */}
              <Card padding={false}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Pôle</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                      <th className="px-5 py-3 w-40"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {radarData.map((row) => (
                      <tr key={row.pole} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-bold text-indigo-600">{row.pole}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{row.score}/100</td>
                        <td className="px-5 py-3">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-indigo-600"
                              style={{ width: `${row.score}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Onglet 2 : Grille de synthèse ───────────────────────────────────────────

function CelluleNiveau({ niveau, eleveId, competenceId, onChange, readOnly }) {
  const c = cfg(niveau);
  if (readOnly) {
    return (
      <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${c.bg} ${c.text}`}>
        {c.court}
      </span>
    );
  }
  const suivant = () => {
    const idx = NIVEAUX.indexOf(niveau);
    const proch = idx === -1 ? 0 : (idx + 1) % NIVEAUX.length;
    onChange(eleveId, competenceId, NIVEAUX[proch]);
  };
  return (
    <button
      onClick={suivant}
      title={`${c.label} — cliquer pour changer`}
      className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold transition-transform hover:scale-110 ${c.bg} ${c.text}`}
    >
      {c.court}
    </button>
  );
}

function LigneSuggestions({ eleveId, onAppliquer, onFermer }) {
  const { data, isLoading } = useQuery({
    queryKey: ['certif-suggestions', eleveId],
    queryFn: () => api.get(`/certification/suggerer/${eleveId}`).then((r) => r.data),
  });

  if (isLoading) return <td colSpan={100}><div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Calcul des suggestions…</div></td>;

  const sug = data?.suggestions ?? [];
  const changements = sug.filter((s) => s.niveauSuggere && s.niveauSuggere !== s.niveauActuel);

  return (
    <td colSpan={100} className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-t border-indigo-100 dark:border-indigo-800">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1">
          {changements.length === 0 ? (
            <p className="text-xs text-gray-500">Aucun changement suggéré — niveaux cohérents avec les notes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {changements.map((s) => {
                const avant = cfg(s.niveauActuel);
                const apres = cfg(s.niveauSuggere);
                return (
                  <span key={s.competenceId} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-full px-2 py-0.5">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.code}</span>
                    <span className={`font-bold ${avant.text}`}>{avant.court}</span>
                    →
                    <span className={`font-bold ${apres.text}`}>{apres.court}</span>
                    {s.palierMoyen !== null && (
                      <span className="text-gray-400">(moy. {s.palierMoyen}/4)</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {changements.length > 0 && (
            <button
              onClick={() => { onAppliquer(changements); onFermer(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Appliquer ({changements.length})
            </button>
          )}
          <button
            onClick={onFermer}
            className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </td>
  );
}

function OngletGrille() {
  const qc = useQueryClient();
  const [classeId, setClasseId]   = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [niveauxLocaux, setNiveauxLocaux] = useState({});
  const [lignesSug, setLignesSug] = useState({});
  const [modifie, setModifie]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['certif-synthese', classeId, matiereId],
    queryFn: () =>
      api.get('/certification/synthese', { params: { classeId, matiereId: matiereId || undefined } })
         .then((r) => r.data),
    enabled: !!classeId,
    onSuccess: () => { setNiveauxLocaux({}); setModifie(false); },
  });

  const sauvegarder = useMutation({
    mutationFn: () => {
      const updates = [];
      for (const [eleveId, comps] of Object.entries(niveauxLocaux)) {
        for (const [competenceId, niveau] of Object.entries(comps)) {
          updates.push({ eleveId, competenceId, niveau });
        }
      }
      return api.patch('/certification/niveaux-bulk', { updates }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certif-synthese', classeId, matiereId] });
      setNiveauxLocaux({});
      setModifie(false);
    },
  });

  const changerNiveau = useCallback((eleveId, competenceId, niveau) => {
    setNiveauxLocaux((prev) => ({
      ...prev,
      [eleveId]: { ...(prev[eleveId] ?? {}), [competenceId]: niveau },
    }));
    setModifie(true);
  }, []);

  const appliquerSuggestions = useCallback((eleveId, changements) => {
    setNiveauxLocaux((prev) => {
      const next = { ...prev, [eleveId]: { ...(prev[eleveId] ?? {}) } };
      for (const s of changements) next[eleveId][s.competenceId] = s.niveauSuggere;
      return next;
    });
    setModifie(true);
  }, []);

  const toggleSuggestions = (eleveId) =>
    setLignesSug((p) => ({ ...p, [eleveId]: !p[eleveId] }));

  const eleves      = data?.eleves      ?? [];
  const competences = data?.competences ?? [];

  // Grouper les compétences par pôle pour l'en-tête du tableau
  const polesMap = {};
  for (const c of competences) {
    const p = pole(c.code);
    (polesMap[p] ??= []).push(c);
  }
  const polesArr = Object.entries(polesMap);

  const niveauEffectif = (eleveId, competenceId) =>
    niveauxLocaux[eleveId]?.[competenceId]
    ?? data?.niveaux?.[eleveId]?.[competenceId]
    ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Classe *</label>
              <SelectClasse value={classeId} onChange={(v) => { setClasseId(v); setNiveauxLocaux({}); setModifie(false); }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Matière</label>
              <SelectMatiere value={matiereId} onChange={(v) => { setMatiereId(v); setNiveauxLocaux({}); setModifie(false); }} />
            </div>
          </div>

          {modifie && (
            <button
              onClick={() => sauvegarder.mutate()}
              disabled={sauvegarder.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {sauvegarder.isPending ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
              Sauvegarder les modifications
            </button>
          )}
        </div>
      </Card>

      {/* Légende */}
      <div className="flex flex-wrap gap-2">
        {NIVEAUX.map((n) => {
          const c = cfg(n);
          return (
            <span key={n} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.bg} ${c.text}`}>
              {c.court} — {c.label}
            </span>
          );
        })}
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-400">— Non évalué</span>
        <span className="text-xs text-gray-400 ml-2 self-center">Cliquer sur une cellule pour changer le niveau</span>
      </div>

      {!classeId && (
        <div className="text-center py-16 text-gray-400">Sélectionnez une classe pour afficher la grille.</div>
      )}

      {classeId && isLoading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

      {classeId && !isLoading && competences.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          Aucune compétence dans le référentiel pour cette sélection.
        </div>
      )}

      {classeId && !isLoading && competences.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="text-xs min-w-max">
            <thead>
              {/* Ligne pôles */}
              <tr className="bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800">
                <th className="sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 text-left px-4 py-2 font-semibold text-gray-600 min-w-[160px]">
                  Élève
                </th>
                <th className="px-2 py-2 text-gray-400 font-medium whitespace-nowrap">IA</th>
                {polesArr.map(([p, comps]) => (
                  <th
                    key={p}
                    colSpan={comps.length}
                    className="px-2 py-2 font-bold text-indigo-700 dark:text-indigo-300 text-center border-l border-indigo-200 dark:border-indigo-800"
                  >
                    Pôle {p} <span className="font-normal text-gray-400">({comps.length})</span>
                  </th>
                ))}
              </tr>
              {/* Ligne compétences */}
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-gray-50" />
                <th />
                {competences.map((c) => (
                  <th
                    key={c.id}
                    title={c.description}
                    className="px-2 py-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-center whitespace-nowrap border-l border-gray-100"
                  >
                    {c.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eleves.map((eleve) => (
                <>
                  <tr key={eleve.id} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {eleve.nom} {eleve.prenom}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleSuggestions(eleve.id)}
                        title="Suggérer niveaux depuis les notes"
                        className={`p-1 rounded-lg transition-colors ${lignesSug[eleve.id] ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    {competences.map((c) => (
                      <td key={c.id} className="px-2 py-2 text-center border-l border-gray-50">
                        <CelluleNiveau
                          niveau={niveauEffectif(eleve.id, c.id)}
                          eleveId={eleve.id}
                          competenceId={c.id}
                          onChange={changerNiveau}
                        />
                      </td>
                    ))}
                  </tr>
                  {lignesSug[eleve.id] && (
                    <tr key={`sug-${eleve.id}`} className="bg-indigo-50/60 dark:bg-indigo-900/20">
                      <td className="sticky left-0 z-10 bg-indigo-50/80 dark:bg-indigo-900/30 px-4 py-1 text-xs text-indigo-600 dark:text-indigo-300 font-medium whitespace-nowrap">
                        Suggestions notes
                      </td>
                      <LigneSuggestions
                        eleveId={eleve.id}
                        onAppliquer={(ch) => appliquerSuggestions(eleve.id, ch)}
                        onFermer={() => toggleSuggestions(eleve.id)}
                      />
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Onglet 3 : Export PDF ────────────────────────────────────────────────────

function OngletExport({ estEleve, monId }) {
  const [classeId, setClasseId]   = useState('');
  const [eleveId, setEleveId]     = useState(estEleve ? monId : '');
  const [trimestre, setTrimestre] = useState(1);
  const [telecharge, setTelecharge] = useState(null);

  const telecharger = async (type) => {
    if (!eleveId) return;
    setTelecharge(type);
    try {
      const url = type === 'certification'
        ? `/bulletins/${eleveId}/pdf-certification`
        : `/bulletins/${eleveId}/pdf?trimestre=${trimestre}`;
      const resp = await api.get(url, { responseType: 'blob' });
      const href = URL.createObjectURL(resp.data);
      const a    = document.createElement('a');
      a.href = href;
      a.download = type === 'certification' ? 'profil_certification.pdf' : `bulletin_T${trimestre}.pdf`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors du téléchargement');
    } finally {
      setTelecharge(null);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader
          title="Sélectionner un élève"
          subtitle="Choisissez l'élève dont vous souhaitez exporter les documents"
        />
        {!estEleve && (
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Classe</label>
              <SelectClasse value={classeId} onChange={(v) => { setClasseId(v); setEleveId(''); }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Élève</label>
              <SelectEleve classeId={classeId} value={eleveId} onChange={setEleveId} />
            </div>
          </div>
        )}
        {estEleve && (
          <p className="text-sm text-gray-600 mb-4">Vous exporterez votre propre profil de certification.</p>
        )}
      </Card>

      {/* PDF certification */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Profil de certification</h3>
            <p className="text-sm text-gray-500 mt-1">
              Document de certification par pôle — niveaux NON_ACQUIS / EN_COURS / ACQUIS / DÉPASSÉ
            </p>
          </div>
          <button
            onClick={() => telecharger('certification')}
            disabled={!eleveId || telecharge === 'certification'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
          >
            {telecharge === 'certification' ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
            {telecharge === 'certification' ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </Card>

      {/* PDF bulletin */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Bulletin de compétences</h3>
            <p className="text-sm text-gray-500 mt-1">
              Bulletin trimestriel avec commentaire IA automatique
            </p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mt-3 w-fit">
              {[1, 2, 3].map((t) => (
                <button
                  key={t}
                  onClick={() => setTrimestre(t)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${trimestre === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => telecharger('bulletin')}
            disabled={!eleveId || telecharge === 'bulletin'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 flex-shrink-0"
          >
            {telecharge === 'bulletin' ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
            {telecharge === 'bulletin' ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ONGLETS = [
  { id: 'radar',  label: 'Radar par pôle' },
  { id: 'grille', label: 'Grille de synthèse' },
  { id: 'export', label: 'Export PDF' },
];

export default function Certification() {
  const { utilisateur } = useAuth();
  const estEleve     = utilisateur?.role === 'ELEVE';
  const estEnseignant = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);
  const [onglet, setOnglet] = useState('radar');

  const ongletsFiltres = ONGLETS.filter((o) => o.id !== 'grille' || estEnseignant);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certification finale</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Radar par pôle · Grille de synthèse · Export PDF profil de certification
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {ongletsFiltres.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              onglet === o.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'radar'  && <OngletRadar  estEleve={estEleve} monId={utilisateur?.id} />}
      {onglet === 'grille' && estEnseignant && <OngletGrille />}
      {onglet === 'export' && <OngletExport estEleve={estEleve} monId={utilisateur?.id} />}
    </div>
  );
}
