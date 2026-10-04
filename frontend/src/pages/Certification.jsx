import { useState, useCallback, useRef, useLayoutEffect, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  Award, Download, Sparkles, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const NIVEAUX = ['NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE'];
const NIVEAU_CFG = {
  NON_ACQUIS: { label: 'Non acquis', court: 'NA', bg: 'bg-red-200 dark:bg-red-900/60',       text: 'text-red-800 dark:text-red-200',       score: 0   },
  EN_COURS:   { label: 'En cours',   court: 'EC', bg: 'bg-orange-200 dark:bg-orange-900/60', text: 'text-orange-800 dark:text-orange-200', score: 33  },
  ACQUIS:     { label: 'Acquis',     court: 'A',  bg: 'bg-yellow-200 dark:bg-yellow-900/60', text: 'text-yellow-800 dark:text-yellow-200', score: 66  },
  DEPASSE:    { label: 'Dépassé',    court: 'D',  bg: 'bg-green-200 dark:bg-green-900/60',   text: 'text-green-800 dark:text-green-200',   score: 100 },
};
const NON_EVALUE = { label: 'Non évalué', court: '—', bg: 'bg-white dark:bg-slate-800', text: 'text-gray-300 dark:text-slate-500', score: 0 };

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

function SelectClasse({ value, onChange, compact = false }) {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-200 rounded-lg px-3 ${compact ? 'py-1 text-xs' : 'py-2 text-sm'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
    >
      <option value="">— Classe —</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
    </select>
  );
}

function SelectMatiere({ value, onChange, compact = false }) {
  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then((r) => r.data),
  });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-200 rounded-lg px-3 ${compact ? 'py-1 text-xs' : 'py-2 text-sm'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
    >
      <option value="">— Toutes les matières —</option>
      {matieres.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
    </select>
  );
}

function SelectEleve({ classeId, value, onChange, compact = false }) {
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
      className={`border border-gray-200 rounded-lg px-3 ${compact ? 'py-1 text-xs' : 'py-2 text-sm'} focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
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
    <div className="space-y-3">
      {/* Barre de filtres compacte, identique à celle de la grille de synthèse */}
      {!estEleve && (
        <div className="flex flex-wrap gap-2 items-center">
          <SelectClasse compact value={classeId} onChange={(v) => { setClasseId(v); setEleveId(''); }} />
          <SelectEleve compact classeId={classeId} value={eleveId} onChange={setEleveId} />
        </div>
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

// Couleurs des en-têtes de pôle (fond du groupe + fond léger des sous-colonnes), en boucle
const COULEURS_POLES = [
  { entete: 'bg-indigo-600 text-white',  sous: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  { entete: 'bg-sky-600 text-white',     sous: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' },
  { entete: 'bg-emerald-600 text-white', sous: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  { entete: 'bg-amber-600 text-white',   sous: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { entete: 'bg-rose-600 text-white',    sous: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
  { entete: 'bg-violet-600 text-white',  sous: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
];

// Dimensions de la grille (px) : tient à l'écran à 100 % en 1366x768 comme en 1920x1080
const LARGEUR_COL = 40;
const LARGEUR_ELEVE = 140;
const LARGEUR_IA = 36;
const HAUTEUR_LIGNE_POLES = 28;
const HAUTEUR_LIGNE_ELEVE = 24;
// Marge sous la grille (espacement + marge basse du contenu) et hauteur minimale de la zone
const MARGE_BAS_PAGE = 40;
const HAUTEUR_ZONE_MIN = 240;
const HAUTEUR_MAX_ENTETE = 100; // texte vertical des compétences, coupé par « … » au-delà
// Superposition des éléments fixes : angle > en-têtes > colonnes Élève/IA
const Z_COLONNES = 20;
const Z_ENTETE = 30;
const Z_ANGLE = 40;

const triNaturel = (a = '', b = '') => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
const numero = (texte) => Number(texte?.match(/\d+/)?.[0] ?? Infinity);

// Libellé court : 3 mots significatifs du libellé complet (verbe d'action + 2 mots suivants),
// en sautant mots vides, « Pôle », numéros et codes ; 28 caractères maximum.
// « Participer aux opérations de réception » → « Participer opérations réception »
const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'à', 'au', 'aux', 'en', 'et', 'un', 'une', 'pour', 'sur', 'avec',
  'pôle', 'pole', 'compétence', 'competence', 'bloc',
]);
const LONGUEUR_MAX_LIBELLE = 28;

const tronquer = (texte, max = LONGUEUR_MAX_LIBELLE) =>
  texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte;

const genererLibelleCourt = (texte = '', nbMots = 3) => {
  const mots = [];
  for (const brut of texte.split(/[\s'’:;,.–—()/]+|\s-\s/)) {
    const mot = brut.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (!mot || /\d/.test(brut) || MOTS_VIDES.has(mot.toLowerCase())) continue;
    mots.push(mots.length ? mot : mot.charAt(0).toUpperCase() + mot.slice(1));
    if (mots.length === nbMots) break;
  }
  return tronquer(mots.join(' '));
};

// Libellé court enregistré en base en priorité, sinon généré depuis le libellé complet
const libelleCourt = (enregistre, complet) => tronquer(enregistre?.trim() || genererLibelleCourt(complet));

// Pôle d'une compétence : celui du référentiel s'il existe, sinon le préfixe du code (« C1.2 » → « C1 »)
const poleDe = (c) => {
  const code = c.pole?.code ?? pole(c.codeCourt ?? c.code);
  const n = numero(code);
  const libelle = Number.isFinite(n) ? `P${n}` : code;
  const court = libelleCourt(c.pole?.libelleCourt, c.pole?.titre);
  return {
    cle: c.pole?.id ?? `code:${code}`,
    libelle: court ? `${libelle} · ${court}` : libelle,
    titre: c.pole?.titre || libelle,
    ordre: Number.isFinite(n) ? n : (c.pole?.ordre ?? Infinity),
  };
};

function CelluleNiveau({ niveau, eleveId, competenceId, onChange, readOnly }) {
  const c = cfg(niveau);
  if (readOnly) {
    return (
      <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${c.bg} ${c.text}`}>
        {c.court}
      </span>
    );
  }
  // Cycle : non évalué → NA → EC → A → D → non évalué
  const suivant = () => {
    const idx = NIVEAUX.indexOf(niveau);
    onChange(eleveId, competenceId, idx === NIVEAUX.length - 1 ? null : NIVEAUX[idx + 1]);
  };
  // Clic droit : retour direct à « non évalué »
  const reinitialiser = (e) => {
    e.preventDefault();
    if (niveau) onChange(eleveId, competenceId, null);
  };
  return (
    <button
      onClick={suivant}
      onContextMenu={reinitialiser}
      title={`${c.label} — clic : niveau suivant · clic droit : non évalué`}
      className={`inline-flex items-center justify-center w-8 h-5 rounded text-[10px] font-bold transition-transform hover:scale-110 ${c.bg} ${c.text} ${niveau ? '' : 'border border-gray-200 dark:border-slate-600'}`}
    >
      {niveau ? c.court : ''}
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

  // Lignes triées par nom puis prénom
  const eleves = [...(data?.eleves ?? [])].sort((a, b) => triNaturel(a.nom, b.nom) || triNaturel(a.prenom, b.prenom));

  // Colonnes groupées par pôle, triées par numéro de pôle puis par code de compétence (C1.2 < C1.10)
  const polesMap = new Map();
  for (const c of data?.competences ?? []) {
    const p = poleDe(c);
    if (!polesMap.has(p.cle)) polesMap.set(p.cle, { ...p, competences: [] });
    polesMap.get(p.cle).competences.push(c);
  }
  const polesArr = [...polesMap.values()]
    .sort((a, b) => a.ordre - b.ordre || triNaturel(a.libelle, b.libelle))
    .map((p, i) => ({
      ...p,
      couleur: COULEURS_POLES[i % COULEURS_POLES.length],
      competences: p.competences.sort((a, b) => triNaturel(a.codeCourt ?? a.code, b.codeCourt ?? b.code)),
    }));
  const competences = polesArr.flatMap((p) => p.competences.map((c) => ({
    ...c, couleur: p.couleur, libelleAffiche: libelleCourt(c.libelleCourt, c.description),
  })));
  // Première compétence de chaque pôle : bordure gauche marquée pour séparer les groupes
  const debutsPole = new Set(polesArr.map((p) => p.competences[0]?.id));

  // Une modification locale à null (retour à « non évalué ») prime sur la valeur enregistrée
  const niveauEffectif = (eleveId, competenceId) =>
    niveauxLocaux[eleveId] && competenceId in niveauxLocaux[eleveId]
      ? niveauxLocaux[eleveId][competenceId]
      : data?.niveaux?.[eleveId]?.[competenceId] ?? null;

  // Hauteur max de la zone de défilement : de son bord haut jusqu'au bas de l'écran,
  // moins la légende et la marge basse de la page
  const refZone = useRef(null);
  const refLegende = useRef(null);
  const [hauteurZone, setHauteurZone] = useState(null);
  const grilleAffichee = !!classeId && !isLoading && competences.length > 0;
  useLayoutEffect(() => {
    if (!grilleAffichee) return undefined;
    const calculer = () => {
      if (!refZone.current) return;
      const haut = refZone.current.getBoundingClientRect().top;
      const legende = refLegende.current?.offsetHeight ?? 0;
      setHauteurZone(Math.max(HAUTEUR_ZONE_MIN, Math.floor(window.innerHeight - haut - legende - MARGE_BAS_PAGE)));
    };
    calculer();
    window.addEventListener('resize', calculer);
    return () => window.removeEventListener('resize', calculer);
  }, [grilleAffichee]);

  return (
    <div className="space-y-2">
      {/* Barre de filtres compacte (remplace la carte, pour gagner de la hauteur) */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SelectClasse compact value={classeId} onChange={(v) => { setClasseId(v); setNiveauxLocaux({}); setModifie(false); }} />
          <SelectMatiere compact value={matiereId} onChange={(v) => { setMatiereId(v); setNiveauxLocaux({}); setModifie(false); }} />
        </div>

        {modifie && (
          <button
            onClick={() => sauvegarder.mutate()}
            disabled={sauvegarder.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {sauvegarder.isPending ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
            Sauvegarder les modifications
          </button>
        )}
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
        <div className="space-y-2">
        {/* Zone de défilement ajustée à la largeur du tableau et à la hauteur restante de l'écran ;
            en-têtes et colonnes Élève/IA fixes */}
        <div
          ref={refZone}
          className="w-fit max-w-full overflow-auto rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800"
          style={{ maxHeight: hauteurZone ?? 'calc(100vh - 220px)' }}
        >
          {/* border-separate : en border-collapse, les bordures des cellules sticky ne suivent pas le défilement */}
          <table className="text-xs min-w-max" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              {/* Ligne pôles : un en-tête coloré sur toute la largeur du pôle */}
              <tr>
                {/* Cellules d'angle : fixes en haut ET à gauche, au-dessus de tout */}
                <th
                  rowSpan={2}
                  style={{ top: 0, left: 0, zIndex: Z_ANGLE, width: LARGEUR_ELEVE, minWidth: LARGEUR_ELEVE, maxWidth: LARGEUR_ELEVE }}
                  className="sticky bg-gray-50 dark:bg-slate-700 text-left align-bottom px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 border-b border-r border-gray-200 dark:border-slate-600"
                >
                  Élève
                </th>
                <th
                  rowSpan={2}
                  style={{ top: 0, left: LARGEUR_ELEVE, zIndex: Z_ANGLE, width: LARGEUR_IA, minWidth: LARGEUR_IA, maxWidth: LARGEUR_IA }}
                  className="sticky bg-gray-50 dark:bg-slate-700 px-1 py-2 align-bottom text-gray-400 font-medium whitespace-nowrap border-b border-r border-gray-200 dark:border-slate-600"
                >
                  IA
                </th>
                {polesArr.map((p) => (
                  <th
                    key={p.cle}
                    colSpan={p.competences.length}
                    title={p.titre}
                    style={{ top: 0, zIndex: Z_ENTETE, height: HAUTEUR_LIGNE_POLES, maxWidth: LARGEUR_COL * p.competences.length }}
                    className={`sticky px-1 text-[11px] font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis border-l-2 border-white dark:border-slate-800 ${p.couleur.entete}`}
                  >
                    {p.libelle}
                  </th>
                ))}
              </tr>
              {/* Ligne compétences : code + libellé court en vertical, libellé complet en info-bulle.
                  Hauteur ajustée au texte le plus long */}
              <tr>
                {competences.map((c) => (
                  <th
                    key={c.id}
                    title={c.description}
                    style={{
                      top: HAUTEUR_LIGNE_POLES, zIndex: Z_ENTETE,
                      width: LARGEUR_COL, minWidth: LARGEUR_COL, maxWidth: LARGEUR_COL,
                      height: 'auto', padding: 4, overflow: 'hidden', lineHeight: 1,
                    }}
                    className={`sticky align-bottom text-center cursor-help border-b border-gray-200 dark:border-slate-600 ${c.couleur.sous} ${debutsPole.has(c.id) ? 'border-l-2 border-l-gray-300 dark:border-l-slate-500' : 'border-l border-l-gray-100 dark:border-l-slate-700'}`}
                  >
                    {/* Texte vertical isolé dans le span (bloc, sans ligne de base) : le writing-mode ne s'applique qu'à lui */}
                    <span
                      style={{
                        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxHeight: HAUTEUR_MAX_ENTETE, fontSize: 10, display: 'block', margin: '0 auto',
                      }}
                    >
                      <span className="font-mono font-bold">{c.codeCourt}</span>
                      {c.libelleAffiche && <span className="font-normal"> {c.libelleAffiche}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eleves.map((eleve) => (
                <Fragment key={eleve.id}>
                  <tr style={{ height: HAUTEUR_LIGNE_ELEVE }} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/40">
                    <td
                      title={`${eleve.nom} ${eleve.prenom}`}
                      style={{ left: 0, zIndex: Z_COLONNES, width: LARGEUR_ELEVE, minWidth: LARGEUR_ELEVE, maxWidth: LARGEUR_ELEVE }}
                      className="sticky bg-white dark:bg-slate-800 px-3 py-0 text-[11px] leading-tight font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis border-b border-b-gray-100 dark:border-b-slate-700 border-r border-gray-200 dark:border-slate-600"
                    >
                      {eleve.nom} {eleve.prenom}
                    </td>
                    <td
                      style={{ left: LARGEUR_ELEVE, zIndex: Z_COLONNES, width: LARGEUR_IA, minWidth: LARGEUR_IA, maxWidth: LARGEUR_IA }}
                      className="sticky bg-white dark:bg-slate-800 px-1 py-0 text-center border-b border-b-gray-100 dark:border-b-slate-700 border-r border-gray-200 dark:border-slate-600"
                    >
                      <button
                        onClick={() => toggleSuggestions(eleve.id)}
                        title="Suggérer niveaux depuis les notes"
                        className={`p-0.5 rounded-lg transition-colors ${lignesSug[eleve.id] ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    {competences.map((c) => (
                      <td
                        key={c.id}
                        style={{ width: LARGEUR_COL, minWidth: LARGEUR_COL, maxWidth: LARGEUR_COL, writingMode: 'horizontal-tb', overflow: 'hidden' }}
                        className={`px-0 py-0 text-center border-b border-b-gray-100 dark:border-b-slate-700 ${debutsPole.has(c.id) ? 'border-l-2 border-l-gray-300 dark:border-l-slate-500' : 'border-l border-l-gray-100 dark:border-l-slate-700'}`}
                      >
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
                      <td style={{ zIndex: Z_COLONNES }} className="sticky left-0 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1 text-xs text-indigo-600 dark:text-indigo-300 font-medium whitespace-nowrap">
                        Suggestions notes
                      </td>
                      <LigneSuggestions
                        eleveId={eleve.id}
                        onAppliquer={(ch) => appliquerSuggestions(eleve.id, ch)}
                        onFermer={() => toggleSuggestions(eleve.id)}
                      />
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende des niveaux, sous le tableau */}
        <div ref={refLegende} className="flex flex-wrap items-center gap-1.5">
          {NIVEAUX.map((n) => {
            const c = cfg(n);
            return (
              <span key={n} className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${c.bg} ${c.text}`}>
                {c.court} — {c.label}
              </span>
            );
          })}
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-600">
            Vide — Non évalué
          </span>
          <span className="text-[11px] text-gray-400 ml-1">Clic : niveau suivant · clic droit : non évalué · survol d'un code : libellé complet</span>
        </div>
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
    <div className="space-y-3 max-w-xl">
      {/* Barre de filtres compacte, identique à celle de la grille de synthèse */}
      {!estEleve ? (
        <div className="flex flex-wrap gap-2 items-center">
          <SelectClasse compact value={classeId} onChange={(v) => { setClasseId(v); setEleveId(''); }} />
          <SelectEleve compact classeId={classeId} value={eleveId} onChange={setEleveId} />
          {!eleveId && <span className="text-xs text-gray-400">Choisissez l'élève dont vous souhaitez exporter les documents</span>}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Vous exporterez votre propre profil de certification.</p>
      )}

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
              Bulletin trimestriel avec appréciation personnalisée
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
    <div className="space-y-3">
      {/* En-tête compact : titre et onglets sur une seule ligne, pour laisser la hauteur à la grille */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Certification finale</h1>
        </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 w-fit">
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
      </div>

      {onglet === 'radar'  && <OngletRadar  estEleve={estEleve} monId={utilisateur?.id} />}
      {onglet === 'grille' && estEnseignant && <OngletGrille />}
      {onglet === 'export' && <OngletExport estEleve={estEleve} monId={utilisateur?.id} />}
    </div>
  );
}
