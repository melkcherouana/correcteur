import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const NIVEAUX_CYCLE = ['NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE'];

const NIVEAU_INFOS = {
  NON_ACQUIS: { label: 'NA', bg: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600', full: 'Non acquis' },
  EN_COURS:   { label: 'EC', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', full: 'En cours' },
  ACQUIS:     { label: 'A',  bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', full: 'Acquis' },
  DEPASSE:    { label: 'D+', bg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800', full: 'Dépassé' },
};

function CelluleNiveau({ eleveId, competenceId, niveau, onModifier }) {
  const info = NIVEAU_INFOS[niveau ?? 'NON_ACQUIS'];
  const idxActuel = NIVEAUX_CYCLE.indexOf(niveau ?? 'NON_ACQUIS');
  const suivant = NIVEAUX_CYCLE[(idxActuel + 1) % 4];

  return (
    <button
      onClick={() => onModifier(eleveId, competenceId, suivant)}
      title={`${info.full} → cliquer pour passer à ${NIVEAU_INFOS[suivant].full}`}
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold border transition-all hover:opacity-75 hover:scale-105 active:scale-95 ${info.bg}`}
    >
      {info.label}
    </button>
  );
}

// Regroupe une liste de compétences déjà triées par pôle en blocs contigus
// (l'ordre backend garantit que les compétences d'un même pôle se suivent) —
// { poleId: null } sert de bloc « Hors pôle » pour les compétences sans pôle.
function grouperParPole(competences) {
  const groupes = [];
  for (const c of competences) {
    const poleId = c.pole?.id ?? null;
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.poleId === poleId) {
      dernier.competences.push(c);
    } else {
      groupes.push({ poleId, titre: c.pole?.titre ?? 'Hors pôle', competences: [c] });
    }
  }
  return groupes;
}

// ─── Vue élève : ses propres compétences ─────────────────────────────────────

function VueEleve({ eleveId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['competences-eleve', eleveId],
    queryFn: () => api.get(`/competences/eleve/${eleveId}`).then((r) => r.data),
    enabled: !!eleveId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const niveaux = data?.niveaux ?? [];
  const totalReferentiel = data?.totalReferentiel ?? 0;

  const parMatiere = {};
  for (const ce of niveaux) {
    const matId = ce.competence.matiere.id;
    if (!parMatiere[matId]) parMatiere[matId] = { matiere: ce.competence.matiere, items: [] };
    parMatiere[matId].items.push(ce);
  }

  if (Object.keys(parMatiere).length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucune compétence enregistrée pour le moment.</p>
      </div>
    );
  }

  const totalAcquis = niveaux.filter((n) => ['ACQUIS', 'DEPASSE'].includes(n.niveau)).length;
  // Dénominateur = total du référentiel ; repli sur évaluées si non disponible
  const denomGlobal = totalReferentiel > 0 ? totalReferentiel : niveaux.length;
  const pctGlobal = denomGlobal > 0 ? Math.round((totalAcquis / denomGlobal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progression globale */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Progression globale vers le diplôme
          </h2>
          <span className="text-2xl font-bold text-indigo-600">{pctGlobal}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pctGlobal}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {totalAcquis} compétence{totalAcquis !== 1 ? 's' : ''} acquise{totalAcquis !== 1 ? 's' : ''} ou dépassée{totalAcquis !== 1 ? 's' : ''} sur {denomGlobal} au référentiel
        </p>
      </Card>
      {Object.values(parMatiere).map(({ matiere, items }) => {
        const acquis = items.filter((i) => ['ACQUIS', 'DEPASSE'].includes(i.niveau)).length;
        // Par matière : dénominateur = nb évaluées dans cette matière (contexte partiel normal)
        const pct = items.length > 0 ? Math.round((acquis / items.length) * 100) : 0;

        return (
          <Card key={matiere.id}>
            <CardHeader
              title={`${matiere.nom} (${matiere.code})`}
              subtitle={`${acquis}/${items.length} compétences acquises ou dépassées`}
            />
            <div className="mb-5 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="space-y-2">
              {items.map((ce) => (
                <div key={ce.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-400 mr-2">{ce.competence.code}</span>
                    <span className="text-sm text-gray-700">{ce.competence.description}</span>
                  </div>
                  <Badge value={ce.niveau} className="ml-4 flex-shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Vue enseignant : tableau croisé classe × compétences ────────────────────

function VueEnseignant() {
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [copie, setCopie] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then((r) => r.data),
  });

  const { data: tableau, isLoading: chargement } = useQuery({
    queryKey: ['competences-tableau', classeId, matiereId],
    queryFn: () =>
      api.get('/competences/tableau-bord', { params: { classeId, matiereId } }).then((r) => r.data),
    enabled: !!(classeId && matiereId),
  });

  const groupes = tableau ? grouperParPole(tableau.competences) : [];

  const majNiveau = useMutation({
    mutationFn: ({ eleveId, competenceId, niveau }) =>
      api.put(`/competences/eleve/${eleveId}/${competenceId}`, { niveau }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['competences-tableau', classeId, matiereId] }),
  });

  // Grille TSV : coller directement dans Pronote (ou Excel) en respectant l'ordre
  // élèves/compétences affiché. Case vide = compétence jamais évaluée (distinct
  // d'un niveau explicitement « Non acquis »), pour ne pas fausser un import.
  const copierPourPronote = async () => {
    if (!tableau) return;
    const lignes = [
      ['Élève', ...tableau.competences.map((c) => c.code)].join('\t'),
      ...tableau.eleves.map((eleve) => {
        const valeurs = tableau.competences.map((c) => {
          const niveau = tableau.niveaux[eleve.id]?.[c.id];
          return niveau ? NIVEAU_INFOS[niveau].label : '';
        });
        return [`${eleve.nom} ${eleve.prenom}`, ...valeurs].join('\t');
      }),
    ];
    try {
      await navigator.clipboard.writeText(lignes.join('\n'));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      alert('Impossible de copier automatiquement — sélectionnez et copiez le tableau manuellement.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Classe</label>
            <select
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sélectionner —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Matière</label>
            <select
              value={matiereId}
              onChange={(e) => setMatiereId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sélectionner —</option>
              {matieres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {!(classeId && matiereId) && (
        <div className="text-center py-16 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez une classe et une matière pour afficher le tableau de bord</p>
        </div>
      )}

      {chargement && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {tableau && !chargement && tableau.competences.length === 0 && (
        <Card>
          <p className="text-sm text-center text-gray-400 py-4">
            Aucune compétence définie pour cette matière.
          </p>
        </Card>
      )}

      {tableau && !chargement && tableau.competences.length > 0 && (
        <Card padding={false}>
          <div className="px-6 pt-6 pb-4">
            <CardHeader
              title="Tableau de bord des compétences"
              subtitle={`${tableau.eleves.length} élève${tableau.eleves.length !== 1 ? 's' : ''} · ${tableau.competences.length} compétence${tableau.competences.length !== 1 ? 's' : ''} — cliquer sur un niveau pour le faire évoluer`}
              action={
                <button
                  onClick={copierPourPronote}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    copie
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Copie une grille (élèves × compétences) au format tableur, à coller directement dans Pronote ou Excel"
                >
                  {copie ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copie ? 'Copié !' : 'Copier pour Pronote'}
                </button>
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Regroupement par pôle — une seule ligne si tout est « Hors pôle » */}
                {!(groupes.length === 1 && groupes[0].poleId === null) && (
                  <tr className="border-t border-gray-50">
                    <th className="sticky left-0 bg-white" />
                    {groupes.map((g) => (
                      <th
                        key={g.poleId ?? 'hors-pole'}
                        colSpan={g.competences.length}
                        title={g.titre}
                        className={`px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide border-b truncate max-w-0 cursor-help ${
                          g.poleId ? 'text-indigo-600 border-indigo-100 bg-indigo-50/50' : 'text-gray-400 border-gray-100'
                        }`}
                      >
                        {g.titre}
                      </th>
                    ))}
                  </tr>
                )}
                <tr className="border-t border-gray-50">
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase min-w-[130px] sticky left-0 bg-white">
                    Élève
                  </th>
                  {tableau.competences.map((c) => (
                    <th
                      key={c.id}
                      className="px-1 py-2 text-center text-[11px] font-bold text-gray-700 cursor-help"
                      title={c.description}
                    >
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {tableau.eleves.map((eleve) => (
                  <tr key={eleve.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white">
                      {eleve.nom} {eleve.prenom}
                    </td>
                    {tableau.competences.map((c) => (
                      <td key={c.id} className="px-1 py-2 text-center">
                        <CelluleNiveau
                          eleveId={eleve.id}
                          competenceId={c.id}
                          niveau={tableau.niveaux[eleve.id]?.[c.id] ?? null}
                          onModifier={(eId, cId, niveau) =>
                            majNiveau.mutate({ eleveId: eId, competenceId: cId, niveau })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Ligne statistiques */}
                <tr className="border-t-2 border-gray-100 bg-gray-50/60">
                  <td className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase sticky left-0 bg-gray-50/60">% Acq.+</td>
                  {tableau.competences.map((c) => {
                    const total = tableau.eleves.length;
                    const acquis = tableau.eleves.filter((e) =>
                      ['ACQUIS', 'DEPASSE'].includes(tableau.niveaux[e.id]?.[c.id])
                    ).length;
                    const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
                    return (
                      <td key={c.id} className="px-1 py-2 text-center">
                        <span
                          className={`text-[11px] font-bold ${
                            pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="px-6 py-4 border-t border-gray-50 flex flex-wrap gap-3">
            {Object.entries(NIVEAU_INFOS).map(([k, v]) => (
              <span key={k} className={`text-xs px-2 py-0.5 rounded border font-medium ${v.bg}`}>
                {v.label} = {v.full}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Competences() {
  const { utilisateur } = useAuth();
  const estEleve = utilisateur?.role === 'ELEVE';
  const estEnseignant = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compétences</h1>
        <p className="text-sm text-gray-500 mt-1">
          {estEleve
            ? 'Mes niveaux de compétences par matière'
            : 'Tableau de bord des compétences par classe et matière'}
        </p>
      </div>

      {estEleve && <VueEleve eleveId={utilisateur.id} />}
      {estEnseignant && <VueEnseignant />}
    </div>
  );
}
