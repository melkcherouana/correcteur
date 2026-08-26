import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Sparkles, BookOpen, Target, MessageSquare, Building2,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileText,
  GraduationCap, ClipboardCheck, Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Composants partagés ──────────────────────────────────────────────────────

function EleveSelector({ classeId, setClasseId, eleveId, setEleveId }) {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const { data: classeDetail } = useQuery({
    queryKey: ['classe', classeId],
    queryFn: () => api.get(`/classes/${classeId}`).then((r) => r.data),
    enabled: !!classeId,
  });
  const eleves = classeDetail?.eleves?.map((e) => e.eleve) ?? [];

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <label className="text-xs font-medium text-gray-600">Classe</label>
        <select
          value={classeId}
          onChange={(e) => { setClasseId(e.target.value); setEleveId(''); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Sélectionner —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>
      {classeId && (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Élève</label>
          <select
            value={eleveId}
            onChange={(e) => setEleveId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Sélectionner —</option>
            {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function ResultatSection({ titre, children }) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{titre}</span>
        {ouvert ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {ouvert && <div className="p-5">{children}</div>}
    </div>
  );
}

function ListeBullet({ items, couleur = 'text-indigo-600' }) {
  if (!items?.length) return <p className="text-sm text-gray-400">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <span className={`mt-0.5 font-bold flex-shrink-0 ${couleur}`}>·</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ErreurIA({ message }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}

function BoutonGenerer({ onClick, loading, disabled, label = 'Générer avec l\'IA' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
      {loading ? 'Génération…' : label}
    </button>
  );
}

// ─── 1. Commentaire de bulletin ───────────────────────────────────────────────

function OngletBulletin() {
  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [trimestre, setTrimestre] = useState(1);
  const [tonalite, setTonalite] = useState('bienveillant');
  const [comportement, setComportement] = useState('');

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/commentaire-bulletin', { eleveId, trimestre, tonalite, comportement }).then((r) => r.data),
  });

  const resultat = data?.resultat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Commentaire de bulletin"
          subtitle="Génère un commentaire personnalisé à partir des notes et compétences de l'élève"
        />
        <div className="space-y-4">
          <EleveSelector classeId={classeId} setClasseId={setClasseId} eleveId={eleveId} setEleveId={setEleveId} />

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Trimestre</label>
              <select
                value={trimestre}
                onChange={(e) => setTrimestre(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>1er trimestre</option>
                <option value={2}>2e trimestre</option>
                <option value={3}>3e trimestre</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Tonalité</label>
              <select
                value={tonalite}
                onChange={(e) => setTonalite(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="bienveillant">Bienveillant</option>
                <option value="neutre">Neutre</option>
                <option value="exigeant">Exigeant</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Comportement / Assiduité (facultatif)</label>
            <textarea
              value={comportement}
              onChange={(e) => setComportement(e.target.value)}
              rows={2}
              placeholder="Ex : Élève sérieux, participation active, quelques absences injustifiées…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <div className="flex items-center gap-3">
            <BoutonGenerer onClick={() => { reset(); mutate(); }} loading={isPending} disabled={!eleveId} />
            {resultat && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Commentaire généré
              </span>
            )}
          </div>
        </div>
      </Card>

      {resultat && (
        <div className="space-y-4">
          <ResultatSection titre="Commentaire à copier dans le bulletin">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <p className="text-sm text-indigo-900 leading-relaxed font-medium">{resultat.commentaire}</p>
            </div>
            {resultat.alertePedagogique && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Suivi pédagogique particulier recommandé pour cet élève.
              </div>
            )}
          </ResultatSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultatSection titre="Points forts">
              <ListeBullet items={resultat.pointsForts} couleur="text-emerald-600" />
            </ResultatSection>
            <ResultatSection titre="Axes de progrès">
              <ListeBullet items={resultat.axesProgres} couleur="text-amber-600" />
            </ResultatSection>
          </div>

          {resultat.objectifProchainTrimestre && (
            <ResultatSection titre="Objectif pour le prochain trimestre">
              <p className="text-sm text-gray-700">{resultat.objectifProchainTrimestre}</p>
            </ResultatSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. Compétences fragiles ──────────────────────────────────────────────────

const NIVEAU_GLOBAL_COULEURS = {
  en_difficulte: 'bg-red-100 text-red-700',
  fragile:       'bg-orange-100 text-orange-700',
  satisfaisant:  'bg-yellow-100 text-yellow-700',
  solide:        'bg-blue-100 text-blue-700',
  excellent:     'bg-green-100 text-green-700',
};

const SEVERITE_COULEURS = {
  leger:   'border-l-yellow-400 bg-yellow-50',
  modere:  'border-l-orange-400 bg-orange-50',
  severe:  'border-l-red-500 bg-red-50',
};

const PRIORITE_COULEURS = {
  aucune:  'bg-gray-100 text-gray-500',
  normale: 'bg-blue-100 text-blue-700',
  urgente: 'bg-red-100 text-red-700',
};

function OngletCompetencesFragiles() {
  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId] = useState('');

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/competences-fragiles', { eleveId }).then((r) => r.data),
  });

  const resultat = data?.resultat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Analyse des compétences fragiles"
          subtitle="Identifie les compétences à risque d'un élève avec des remédiations concrètes"
        />
        <div className="space-y-4">
          <EleveSelector classeId={classeId} setClasseId={setClasseId} eleveId={eleveId} setEleveId={setEleveId} />

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de l\'analyse'} />}

          <BoutonGenerer
            onClick={() => { reset(); mutate(); }}
            loading={isPending}
            disabled={!eleveId}
            label="Analyser le profil"
          />
        </div>
      </Card>

      {resultat && (
        <div className="space-y-4">
          {/* Synthèse */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${NIVEAU_GLOBAL_COULEURS[resultat.niveauGlobal] ?? 'bg-gray-100 text-gray-600'}`}>
                {resultat.niveauGlobal?.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITE_COULEURS[resultat.prioriteIntervention] ?? 'bg-gray-100 text-gray-500'}`}>
                Intervention : {resultat.prioriteIntervention}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{resultat.syntheseNarrative}</p>
            {resultat.dispositifSuiviRecommande && (
              <p className="mt-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                Dispositif recommandé : <strong>{resultat.dispositifSuiviRecommande}</strong>
              </p>
            )}
          </Card>

          {/* Compétences fragiles */}
          {resultat.competencesFragiles?.length > 0 && (
            <ResultatSection titre={`Compétences fragiles (${resultat.competencesFragiles.length})`}>
              <div className="space-y-4">
                {resultat.competencesFragiles.map((cf, i) => (
                  <div
                    key={i}
                    className={`border-l-4 rounded-r-lg p-4 ${SEVERITE_COULEURS[cf.severite] ?? 'border-l-gray-300 bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">{cf.code}</span>
                      <span className="text-sm font-semibold text-gray-800">{cf.description}</span>
                      <span className="ml-auto text-xs font-medium text-gray-500 capitalize">{cf.severite}</span>
                    </div>
                    {cf.signesObserves?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Signes observés</p>
                        <ListeBullet items={cf.signesObserves} />
                      </div>
                    )}
                    {cf.remediations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Remédiations</p>
                        <div className="space-y-1.5">
                          {cf.remediations.map((r, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs text-gray-700 bg-white rounded px-2.5 py-1.5 border border-gray-100">
                              <span className="font-semibold text-indigo-600 flex-shrink-0">{r.responsable}</span>
                              <span className="flex-1">{r.action}</span>
                              <span className="text-gray-400 flex-shrink-0">{r.delai}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ResultatSection>
          )}

          {/* Compétences appui */}
          {resultat.competencesAppui?.length > 0 && (
            <ResultatSection titre={`Compétences d'appui (${resultat.competencesAppui.length})`}>
              <div className="space-y-2">
                {resultat.competencesAppui.map((ca, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-bold text-emerald-600 mt-0.5 flex-shrink-0">{ca.code}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ca.description}</p>
                      {ca.commentaire && <p className="text-xs text-gray-500 mt-0.5">{ca.commentaire}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ResultatSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 3. Questions d'entretien ─────────────────────────────────────────────────

const BLOOM_COULEURS = {
  memorisation:       'bg-gray-100 text-gray-600',
  comprehension:      'bg-blue-100 text-blue-700',
  application:        'bg-indigo-100 text-indigo-700',
  analyse:            'bg-purple-100 text-purple-700',
  evaluation_creation:'bg-amber-100 text-amber-700',
};

const BLOOM_LABELS = {
  memorisation:       'Mémorisation',
  comprehension:      'Compréhension',
  application:        'Application',
  analyse:            'Analyse',
  evaluation_creation:'Évaluation/Création',
};

function OngletQuestionsEntretien() {
  const [contenu, setContenu] = useState('');
  const [filiere, setFiliere] = useState('');
  const [matiere, setMatiere] = useState('');
  const [niveau, setNiveau] = useState('');
  const [nbQuestions, setNbQuestions] = useState(8);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/questions-entretien', {
        contenuTravail: contenu,
        contexte: { filiere, matiere, niveau, nbQuestions },
      }).then((r) => r.data),
  });

  const resultat = data?.resultat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Questions d'entretien oral"
          subtitle="Génère des questions progressives (taxonomie de Bloom) à partir d'un travail rendu"
        />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Filière</label>
              <input
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
                placeholder="Ex : Électrotechnique"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Matière</label>
              <input
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                placeholder="Ex : Analyse de circuits"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-xs font-medium text-gray-600">Niveau</label>
              <input
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                placeholder="Ex : BAC PRO 2e année"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-24">
              <label className="text-xs font-medium text-gray-600">Nb questions</label>
              <input
                type="number"
                value={nbQuestions}
                onChange={(e) => setNbQuestions(parseInt(e.target.value) || 8)}
                min={3}
                max={12}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Contenu du travail rendu</label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={6}
              placeholder="Collez ici le résumé ou le contenu du devoir rendu par l'élève…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <BoutonGenerer
            onClick={() => { reset(); mutate(); }}
            loading={isPending}
            disabled={!contenu.trim()}
            label="Générer les questions"
          />
        </div>
      </Card>

      {resultat && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {resultat.dureeTotaleMinutes && (
              <span className="text-sm text-gray-500">
                Durée estimée : <strong>{resultat.dureeTotaleMinutes} min</strong>
              </span>
            )}
          </div>

          {resultat.alertes?.length > 0 && (
            <Card>
              <p className="text-xs font-semibold text-amber-700 mb-2">Points à approfondir en priorité</p>
              <ListeBullet items={resultat.alertes} couleur="text-amber-600" />
            </Card>
          )}

          <div className="space-y-3">
            {resultat.questions?.map((q) => (
              <Card key={q.numero}>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {q.numero}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BLOOM_COULEURS[q.niveauBloom] ?? 'bg-gray-100 text-gray-600'}`}>
                        {BLOOM_LABELS[q.niveauBloom] ?? q.niveauBloom}
                      </span>
                      {q.dureeEstimeeMinutes && (
                        <span className="text-xs text-gray-400">{q.dureeEstimeeMinutes} min</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-3">{q.question}</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Réponse attendue</p>
                        <p className="text-xs text-gray-700 bg-gray-50 rounded px-3 py-2">{q.elementsReponseAttendus}</p>
                      </div>
                      {q.indicateursReussitePartielle && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Réponse partielle acceptable</p>
                          <p className="text-xs text-gray-600 bg-blue-50 rounded px-3 py-2">{q.indicateursReussitePartielle}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {resultat.conseilsConduite && (
            <ResultatSection titre="Conseils pour conduire l'entretien">
              <p className="text-sm text-gray-700">{resultat.conseilsConduite}</p>
            </ResultatSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 4. Dossier situation professionnelle complet ─────────────────────────────

const TYPE_DOC_LABELS_LU = { catalogue: 'Catalogue / Tarif', bon_commande_client: 'Bon de commande', correspondance: 'Correspondance', fiche_client: 'Fiche client' };
const ANNEXE_COULEURS = { facture: 'bg-red-100 text-red-700', fiche_stock: 'bg-green-100 text-green-700', bon_livraison: 'bg-indigo-100 text-indigo-700' };

function OngletScenario() {
  const [filiere, setFiliere] = useState('');
  const [matiere, setMatiere] = useState('');
  const [niveau, setNiveau] = useState('BAC PRO');
  const [duree, setDuree] = useState(120);
  const [contexte, setContexte] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [competencesSelectionnees, setCompetencesSelectionnees] = useState([]);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then((r) => r.data),
  });

  const { data: arborescence } = useQuery({
    queryKey: ['matiere-arborescence', matiereId],
    queryFn: () => api.get(`/referentiel/matieres/${matiereId}/arborescence`).then((r) => r.data),
    enabled: !!matiereId,
  });

  const toggleCompetence = (id) => {
    setCompetencesSelectionnees((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toutSelectionnerPole = (poleCompetences) => {
    const ids = poleCompetences.map((c) => c.id);
    const tousSelectionnes = ids.every((id) => competencesSelectionnees.includes(id));
    if (tousSelectionnes) {
      setCompetencesSelectionnees((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setCompetencesSelectionnees((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/dossier-complet', {
        filiere, matiere, niveau,
        competenceIds: competencesSelectionnees,
        dureeMinutes: duree,
        contexteEntreprise: contexte,
      }).then((r) => r.data),
  });

  const dossier = data?.resultat;

  const telechargerPdf = async () => {
    if (!dossier) return;
    setPdfEnCours(true);
    try {
      const resp = await api.post('/ia/dossier-complet/docx', { dossier }, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      const titre = (dossier.titre ?? 'dossier').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${titre}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur génération Word');
    } finally {
      setPdfEnCours(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Dossier situation professionnelle"
          subtitle="Génère un dossier complet : contexte, documents à lire et annexes à remplir (facture, fiche de stock, bon de livraison)"
        />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Filière *</label>
              <input value={filiere} onChange={(e) => setFiliere(e.target.value)}
                placeholder="Ex : Commerce, Logistique, Électrotechnique…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Matière</label>
              <input value={matiere} onChange={(e) => setMatiere(e.target.value)}
                placeholder="Ex : Gestion commerciale, Supply Chain…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-xs font-medium text-gray-600">Niveau</label>
              <input value={niveau} onChange={(e) => setNiveau(e.target.value)}
                placeholder="Ex : BAC PRO 2e"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 w-28">
              <label className="text-xs font-medium text-gray-600">Durée (min)</label>
              <input type="number" value={duree} onChange={(e) => setDuree(parseInt(e.target.value) || 120)}
                min={30} max={480}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Contexte d'entreprise (facultatif)</label>
            <input value={contexte} onChange={(e) => setContexte(e.target.value)}
              placeholder="Ex : grossiste en matériel électrique, entreprise de BTP, distributeur de pièces auto…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Compétences — arborescence pôles */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Compétences à mobiliser (optionnel)</p>
              {competencesSelectionnees.length > 0 && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                  {competencesSelectionnees.length} sélectionnée{competencesSelectionnees.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <select value={matiereId} onChange={(e) => { setMatiereId(e.target.value); setCompetencesSelectionnees([]); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full">
                <option value="">— Choisir un référentiel —</option>
                {matieres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>

              {arborescence && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {/* Pôles avec leurs compétences */}
                  {(arborescence.poles ?? []).map((pole) => {
                    const tousSelectionnes = pole.competences?.every((c) => competencesSelectionnees.includes(c.id));
                    const certSelectionnes = pole.competences?.some((c) => competencesSelectionnees.includes(c.id));
                    return (
                      <div key={pole.id} className="rounded-lg border border-gray-100 overflow-hidden">
                        {/* En-tête pôle cliquable */}
                        <button
                          type="button"
                          onClick={() => toutSelectionnerPole(pole.competences ?? [])}
                          className={[
                            'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                            tousSelectionnes ? 'bg-indigo-600 text-white' : certSelectionnes ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                          ].join(' ')}
                        >
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${tousSelectionnes ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                            {pole.code}
                          </span>
                          <span className="text-xs font-semibold flex-1 truncate">{pole.titre}</span>
                          <span className={`text-xs flex-shrink-0 ${tousSelectionnes ? 'text-white/80' : 'text-gray-400'}`}>
                            {certSelectionnes && !tousSelectionnes
                              ? `${pole.competences.filter(c => competencesSelectionnees.includes(c.id)).length}/`
                              : ''}{pole.competences?.length ?? 0}
                          </span>
                        </button>

                        {/* Compétences du pôle */}
                        {(pole.competences ?? []).map((c) => (
                          <label key={c.id} className={[
                            'flex items-start gap-2.5 px-3 py-1.5 cursor-pointer border-t border-gray-50 transition-colors',
                            competencesSelectionnees.includes(c.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50',
                          ].join(' ')}>
                            <input
                              type="checkbox"
                              checked={competencesSelectionnees.includes(c.id)}
                              onChange={() => toggleCompetence(c.id)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <span className="text-xs font-mono font-bold text-indigo-500 mt-0.5 flex-shrink-0 min-w-10">{c.code}</span>
                            <span className={`text-xs leading-relaxed ${competencesSelectionnees.includes(c.id) ? 'text-indigo-900 dark:text-indigo-200 font-medium' : 'text-gray-600'}`}>
                              {c.description}
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  })}

                  {/* Compétences sans pôle */}
                  {(arborescence.competences ?? []).length > 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 font-medium">Sans pôle</div>
                      {arborescence.competences.map((c) => (
                        <label key={c.id} className={[
                          'flex items-start gap-2.5 px-3 py-1.5 cursor-pointer border-t border-gray-50 transition-colors',
                          competencesSelectionnees.includes(c.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50',
                        ].join(' ')}>
                          <input type="checkbox" checked={competencesSelectionnees.includes(c.id)}
                            onChange={() => toggleCompetence(c.id)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0" />
                          <span className="text-xs font-mono font-bold text-indigo-500 mt-0.5 flex-shrink-0 min-w-10">{c.code}</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{c.description}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <div className="flex items-center gap-3">
            <BoutonGenerer onClick={() => { reset(); mutate(); }} loading={isPending}
              disabled={!filiere.trim() && competencesSelectionnees.length === 0}
              label="Générer le dossier complet" />
            <p className="text-xs text-gray-400">Génère la page de garde, 2 documents à lire et 3 annexes à remplir</p>
          </div>
        </div>
      </Card>

      {dossier && (
        <div className="space-y-4">
          {/* Barre d'action */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Dossier généré — {dossier.titre}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {dossier.documents?.length ?? 0} document{(dossier.documents?.length ?? 0) > 1 ? 's' : ''} à lire · {dossier.annexes?.length ?? 0} annexe{(dossier.annexes?.length ?? 0) > 1 ? 's' : ''} à compléter · {dossier.baremeTotal ?? 20} pts · {dossier.dureeMinutes ?? 120} min
              </p>
            </div>
            <button onClick={telechargerPdf} disabled={pdfEnCours}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm">
              {pdfEnCours ? <><Spinner size="sm" /> Génération…</> : <><FileText className="w-4 h-4" /> Télécharger Word (.docx)</>}
            </button>
          </div>

          {/* Entreprise */}
          {dossier.entreprise && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{dossier.entreprise.nom}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{dossier.entreprise.activite}</p>
                  <p className="text-xs text-gray-400 mt-1">{dossier.entreprise.adresse}, {dossier.entreprise.codePostal} {dossier.entreprise.ville}</p>
                  {dossier.entreprise.responsable && (
                    <p className="text-xs text-gray-400">Responsable : {dossier.entreprise.responsable}</p>
                  )}
                </div>
              </div>
              {dossier.misEnSituation && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Mise en situation</p>
                  <p className="text-sm text-gray-700">{dossier.misEnSituation}</p>
                </div>
              )}
            </Card>
          )}

          {/* Tâches */}
          {dossier.taches?.length > 0 && (
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Travail demandé</p>
              <div className="space-y-2">
                {dossier.taches.map((t) => (
                  <div key={t.numero} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">T{t.numero}</span>
                    <span className="flex-1 text-sm text-gray-800">{t.intitule}</span>
                    {t.annexe && <span className="text-xs text-indigo-600 font-medium">Annexe {t.annexe}</span>}
                    <span className="text-xs font-bold text-gray-500">{t.points} pts</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Documents à lire */}
          {dossier.documents?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents à lire</p>
              <div className="space-y-2">
                {dossier.documents.map((d) => (
                  <div key={d.numero} className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="w-7 h-7 rounded-lg bg-blue-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">D{d.numero}</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">{d.titre}</p>
                      <p className="text-xs text-blue-500">{TYPE_DOC_LABELS_LU[d.type] ?? d.type}</p>
                    </div>
                    {d.articles?.length > 0 && <span className="ml-auto text-xs text-blue-400">{d.articles.length} article{d.articles.length > 1 ? 's' : ''}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Annexes */}
          {dossier.annexes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Annexes à compléter</p>
              <div className="space-y-2">
                {dossier.annexes.map((a) => (
                  <div key={a.numero} className="px-4 py-3 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${ANNEXE_COULEURS[a.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        Annexe {a.numero}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm">{a.titre}</span>
                      <span className="ml-auto text-xs font-bold text-gray-400">{a.points} pts</span>
                    </div>
                    {a.consigne && (
                      <p className="text-xs text-gray-500 mt-2 ml-1 italic">{a.consigne}</p>
                    )}
                    {a.type === 'facture' && a.lignesFacture?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 ml-1">{a.lignesFacture.length} ligne{a.lignesFacture.length > 1 ? 's' : ''} — totalHT et TVA à calculer</p>
                    )}
                    {a.type === 'fiche_stock' && a.mouvements?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 ml-1">{a.mouvements.length} mouvements — {a.mouvements.filter(m => m.aCompleter).length} soldes à calculer</p>
                    )}
                    {a.type === 'bon_livraison' && a.lignesBL?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 ml-1">{a.lignesBL.length} ligne{a.lignesBL.length > 1 ? 's' : ''} — quantités livrées à compléter</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sélecteur de compétence depuis le référentiel ───────────────────────────

function CompetenceSelector({ competenceId, setCompetenceId }) {
  const [matiereId, setMatiereId] = useState('');

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => api.get('/matieres').then((r) => r.data),
  });

  const { data: arborescence } = useQuery({
    queryKey: ['arborescence', matiereId],
    queryFn: () => api.get(`/referentiel/matieres/${matiereId}/arborescence`).then((r) => r.data),
    enabled: !!matiereId,
  });

  const toutesCompetences = arborescence
    ? [
        ...(arborescence.poles ?? []).flatMap((p) => p.competences ?? []),
        ...(arborescence.competences ?? []),
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Matière / Référentiel</label>
          <select
            value={matiereId}
            onChange={(e) => { setMatiereId(e.target.value); setCompetenceId(''); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Choisir un référentiel —</option>
            {matieres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>

        {toutesCompetences.length > 0 && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-[260px]">
            <label className="text-xs font-medium text-gray-600">Compétence</label>
            <select
              value={competenceId}
              onChange={(e) => setCompetenceId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sélectionner —</option>
              {(arborescence.poles ?? []).map((pole) => (
                <optgroup key={pole.id} label={`${pole.code} — ${pole.titre}`}>
                  {(pole.competences ?? []).map((c) => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.description}</option>
                  ))}
                </optgroup>
              ))}
              {(arborescence.competences ?? []).length > 0 && (
                <optgroup label="Sans pôle">
                  {arborescence.competences.map((c) => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.description}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
      </div>

      {competenceId && toutesCompetences.find((c) => c.id === competenceId) && (
        <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
          <Target className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-indigo-700 mr-2">
              {toutesCompetences.find((c) => c.id === competenceId)?.code}
            </span>
            <span className="text-xs text-indigo-900">
              {toutesCompetences.find((c) => c.id === competenceId)?.description}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet Cours complet ─────────────────────────────────────────────────────

const ACTIVITE_LABELS = {
  exercice: 'Exercice', mise_en_situation: 'Mise en situation',
  qcm: 'QCM', production: 'Production', observation: 'Observation',
};

function OngletCours() {
  const [competenceId, setCompetenceId] = useState('');
  const [filiere, setFiliere] = useState('');
  const [niveau, setNiveau] = useState('BAC PRO');
  const [dureeHeures, setDureeHeures] = useState(2);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/generer-cours', {
        competenceId,
        contexte: { filiere, niveau, dureeHeures },
      }).then((r) => r.data),
  });

  const cours = data?.resultat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Génération de cours complet"
          subtitle="L'IA génère un cours structuré, progressif et prêt à l'emploi à partir d'une compétence du référentiel"
        />
        <div className="space-y-4">
          <CompetenceSelector competenceId={competenceId} setCompetenceId={setCompetenceId} />

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Filière (facultatif)</label>
              <input value={filiere} onChange={(e) => setFiliere(e.target.value)}
                placeholder="Ex : Commerce, Électrotechnique…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-gray-600">Niveau</label>
              <input value={niveau} onChange={(e) => setNiveau(e.target.value)}
                placeholder="BAC PRO, BTS…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 w-24">
              <label className="text-xs font-medium text-gray-600">Durée (h)</label>
              <input type="number" value={dureeHeures} min={1} max={8}
                onChange={(e) => setDureeHeures(parseInt(e.target.value) || 2)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <div className="flex items-center gap-3">
            <BoutonGenerer
              onClick={() => { reset(); mutate(); }}
              loading={isPending}
              disabled={!competenceId}
              label="Générer le cours"
            />
            {cours && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cours généré — {cours.plan?.length ?? 0} partie(s)
              </span>
            )}
          </div>
        </div>
      </Card>

      {cours && (
        <div className="space-y-4">
          {/* En-tête cours */}
          <div className="bg-indigo-600 text-white rounded-xl px-6 py-4">
            <h2 className="text-lg font-bold">{cours.titre}</h2>
            <div className="flex items-center gap-4 mt-1 text-indigo-200 text-xs">
              {cours.dureeEstimeeHeures && <span>{cours.dureeEstimeeHeures}h estimées</span>}
              <span>{cours.plan?.length ?? 0} partie(s)</span>
            </div>
          </div>

          {/* Objectifs */}
          {cours.objectifsPedagogiques?.length > 0 && (
            <ResultatSection titre="Objectifs pédagogiques">
              <ListeBullet items={cours.objectifsPedagogiques} couleur="text-indigo-600" />
            </ResultatSection>
          )}

          {/* Prérequis */}
          {cours.prerequis?.length > 0 && (
            <ResultatSection titre="Prérequis">
              <ListeBullet items={cours.prerequis} couleur="text-amber-600" />
            </ResultatSection>
          )}

          {/* Introduction */}
          {cours.introduction && (
            <ResultatSection titre="Introduction / Mise en situation">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cours.introduction}</p>
            </ResultatSection>
          )}

          {/* Plan */}
          {cours.plan?.length > 0 && (
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Plan du cours</p>
              <div className="space-y-1.5">
                {cours.plan.map((p) => (
                  <div key={p.numero} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {p.numero}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 font-medium">{p.titre}</span>
                    {p.dureeMinutes && <span className="text-xs text-gray-400">{p.dureeMinutes} min</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contenu structuré */}
          {cours.contenuStructure?.map((partie) => (
            <ResultatSection key={partie.numero} titre={`${partie.numero}. ${partie.titre}`}>
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{partie.contenu}</p>

                {partie.exemplesConcrets?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Exemples concrets</p>
                    <ListeBullet items={partie.exemplesConcrets} couleur="text-emerald-600" />
                  </div>
                )}

                {partie.activite && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 mb-1">
                      Activité — {ACTIVITE_LABELS[partie.activite.type] ?? partie.activite.type}
                      {partie.activite.dureeMinutes && ` (${partie.activite.dureeMinutes} min)`}
                    </p>
                    <p className="text-sm text-amber-900">{partie.activite.consigne}</p>
                  </div>
                )}

                {partie.pointsCles?.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-indigo-700 mb-1.5">À retenir</p>
                    <ListeBullet items={partie.pointsCles} couleur="text-indigo-600" />
                  </div>
                )}
              </div>
            </ResultatSection>
          ))}

          {/* Évaluation formative */}
          {cours.evaluationFormative?.questions?.length > 0 && (
            <ResultatSection titre="Évaluation formative">
              <p className="text-xs text-gray-500 mb-2">{cours.evaluationFormative.type}</p>
              <ol className="space-y-1.5">
                {cours.evaluationFormative.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="font-bold text-indigo-600 flex-shrink-0">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ol>
            </ResultatSection>
          )}

          {/* Ressources */}
          {cours.ressourcesComplementaires?.length > 0 && (
            <ResultatSection titre="Ressources complémentaires">
              <ListeBullet items={cours.ressourcesComplementaires} couleur="text-blue-600" />
            </ResultatSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Support de travail ────────────────────────────────────────────────

const TYPE_SUPPORT_LABELS = {
  exercice_application: 'Exercice d\'application',
  situation_professionnelle: 'Situation professionnelle',
  etude_de_cas: 'Étude de cas',
  travaux_pratiques: 'Travaux pratiques',
  mise_en_situation: 'Mise en situation',
};

const DIFFICULTE_COULEURS = {
  decouverte: 'bg-green-100 text-green-700',
  application: 'bg-blue-100 text-blue-700',
  approfondissement: 'bg-purple-100 text-purple-700',
};

function OngletSupportTravail() {
  const [competenceId, setCompetenceId] = useState('');
  const [filiere, setFiliere] = useState('');
  const [niveau, setNiveau] = useState('BAC PRO');
  const [typeSouhaite, setTypeSouhaite] = useState('situation_professionnelle');
  const [corrigeVisible, setCorrigeVisible] = useState(false);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/support-travail', {
        competenceId,
        contexte: { filiere, niveau, typeSouhaite },
      }).then((r) => r.data),
  });

  const support = data?.resultat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Génération de support de travail"
          subtitle="L'IA génère un exercice ou une situation professionnelle clé en main, avec corrigé"
        />
        <div className="space-y-4">
          <CompetenceSelector competenceId={competenceId} setCompetenceId={setCompetenceId} />

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Filière (facultatif)</label>
              <input value={filiere} onChange={(e) => setFiliere(e.target.value)}
                placeholder="Ex : Commerce, Logistique…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-gray-600">Niveau</label>
              <input value={niveau} onChange={(e) => setNiveau(e.target.value)}
                placeholder="BAC PRO, BTS…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Type de support</label>
              <select value={typeSouhaite} onChange={(e) => setTypeSouhaite(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(TYPE_SUPPORT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <div className="flex items-center gap-3">
            <BoutonGenerer
              onClick={() => { reset(); setCorrigeVisible(false); mutate(); }}
              loading={isPending}
              disabled={!competenceId}
              label="Générer le support"
            />
            {support && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {support.travailDemande?.length ?? 0} question(s) générée(s)
              </span>
            )}
          </div>
        </div>
      </Card>

      {support && (
        <div className="space-y-4">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTE_COULEURS[support.niveauDifficulte] ?? 'bg-gray-100 text-gray-600'}`}>
                  {support.niveauDifficulte}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {TYPE_SUPPORT_LABELS[support.type] ?? support.type}
                </span>
                {support.dureeMinutes && (
                  <span className="text-xs text-gray-500">{support.dureeMinutes} min</span>
                )}
                {support.noteMax && (
                  <span className="text-xs font-bold text-gray-600">/ {support.noteMax} pts</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{support.titre}</h2>
            </div>
            <button
              onClick={() => setCorrigeVisible((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {corrigeVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {corrigeVisible ? 'Masquer le corrigé' : 'Afficher le corrigé'}
            </button>
          </div>

          {/* Contexte */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mise en situation</p>
            <p className="text-sm text-gray-700 leading-relaxed">{support.contexte}</p>
          </Card>

          {/* Documents support */}
          {support.documentsSupport?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents fournis</p>
              <div className="space-y-2">
                {support.documentsSupport.map((doc, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 mb-1">{doc.titre}</p>
                    <p className="text-sm text-blue-900 whitespace-pre-line">{doc.contenu}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travail demandé */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Travail demandé</p>
            <div className="space-y-3">
              {support.travailDemande?.map((q) => (
                <Card key={q.numero}>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {q.numero}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{q.question}</p>
                        <span className="text-xs font-bold text-gray-500 flex-shrink-0">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                      </div>
                      {q.competenceCiblee && (
                        <p className="text-xs text-indigo-600 mt-0.5">Compétence : {q.competenceCiblee}</p>
                      )}
                      {corrigeVisible && support.elementsDeCorrection?.[q.numero - 1] && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                          <p className="text-xs font-bold text-emerald-700 mb-1">Corrigé</p>
                          <p className="text-xs text-emerald-900">{support.elementsDeCorrection[q.numero - 1].reponseAttendue}</p>
                          {support.elementsDeCorrection[q.numero - 1].criteresDAttribution?.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {support.elementsDeCorrection[q.numero - 1].criteresDAttribution.map((c, i) => (
                                <li key={i} className="text-xs text-emerald-700 flex items-start gap-1">
                                  <span className="font-bold">·</span> {c}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Conseils pédagogiques */}
          {support.conseilsPedagogiques && (
            <ResultatSection titre="Conseils pédagogiques (enseignant)">
              <p className="text-sm text-gray-700">{support.conseilsPedagogiques}</p>
            </ResultatSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Appréciation & Remédiation ───────────────────────────────────────

const NIVEAU_REUSSITE_CONFIG = {
  insuffisant: { label: 'Insuffisant',  classe: 'bg-red-100 text-red-700' },
  en_voie:     { label: 'En voie',      classe: 'bg-orange-100 text-orange-700' },
  acquis:      { label: 'Acquis',       classe: 'bg-green-100 text-green-700' },
  depasse:     { label: 'Dépassé',      classe: 'bg-indigo-100 text-indigo-700' },
};

const RESPONSABLE_COULEURS = {
  eleve:       'bg-blue-100 text-blue-700',
  enseignant:  'bg-purple-100 text-purple-700',
  tuteur:      'bg-amber-100 text-amber-700',
};

function OngletAppreciationRemediation() {
  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [noteObtenue, setNoteObtenue] = useState('');
  const [noteMax, setNoteMax] = useState('20');
  const [commentaire, setCommentaire] = useState('');

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      api.post('/ia/appreciation-remediation', {
        eleveId: eleveId || undefined,
        noteObtenue: parseFloat(noteObtenue),
        noteMax: parseFloat(noteMax),
        commentaireCorrecteur: commentaire,
      }).then((r) => r.data),
  });

  const resultat = data?.resultat;
  const niveauConfig = NIVEAU_REUSSITE_CONFIG[resultat?.niveauReussite];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Appréciation & Remédiation"
          subtitle="Après la correction d'un devoir, l'IA génère une appréciation personnalisée et un plan de remédiation adapté"
        />
        <div className="space-y-4">
          <EleveSelector classeId={classeId} setClasseId={setClasseId} eleveId={eleveId} setEleveId={setEleveId} />
          <p className="text-xs text-gray-400">L'élève est facultatif — permet d'enrichir les remédiations avec ses compétences en base.</p>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 w-32">
              <label className="text-xs font-medium text-gray-600">Note obtenue *</label>
              <input
                type="number"
                value={noteObtenue}
                onChange={(e) => setNoteObtenue(e.target.value)}
                placeholder="Ex : 12"
                min={0}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-32">
              <label className="text-xs font-medium text-gray-600">Note max *</label>
              <input
                type="number"
                value={noteMax}
                onChange={(e) => setNoteMax(e.target.value)}
                placeholder="Ex : 20"
                min={1}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Observations de l'enseignant (facultatif)</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              placeholder="Ex : L'élève a bien compris la mise en situation mais peine sur les calculs de TVA. La présentation du document est soignée."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <ErreurIA message={error?.response?.data?.message ?? 'Erreur lors de la génération'} />}

          <div className="flex items-center gap-3">
            <BoutonGenerer
              onClick={() => { reset(); mutate(); }}
              loading={isPending}
              disabled={!noteObtenue || !noteMax}
              label="Générer l'appréciation"
            />
            {resultat && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Appréciation générée
              </span>
            )}
          </div>
        </div>
      </Card>

      {resultat && (
        <div className="space-y-4">
          {/* Niveau de réussite */}
          {niveauConfig && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${niveauConfig.classe}`}>
                {niveauConfig.label}
              </span>
              {noteObtenue && noteMax && (
                <span className="text-sm text-gray-600 font-medium">
                  {noteObtenue}/{noteMax} — {Math.round((parseFloat(noteObtenue) / parseFloat(noteMax)) * 100)}%
                </span>
              )}
            </div>
          )}

          {/* Appréciation */}
          <ResultatSection titre="Appréciation personnalisée">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <p className="text-sm text-indigo-900 leading-relaxed font-medium">{resultat.appreciation}</p>
            </div>
          </ResultatSection>

          {/* Points forts / Axes de progrès */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultatSection titre="Points forts">
              <ListeBullet items={resultat.pointsForts} couleur="text-emerald-600" />
            </ResultatSection>
            <ResultatSection titre="Axes de progrès">
              <ListeBullet items={resultat.axesProgres} couleur="text-amber-600" />
            </ResultatSection>
          </div>

          {/* Remédiations */}
          {resultat.remediations?.length > 0 && (
            <ResultatSection titre={`Plan de remédiation (${resultat.remediations.length} action${resultat.remediations.length > 1 ? 's' : ''})`}>
              <div className="space-y-3">
                {resultat.remediations.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">{r.competence}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RESPONSABLE_COULEURS[r.responsable] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.responsable}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">{r.delai}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      Difficulté identifiée : <em>{r.difficulteIdentifiee}</em>
                    </p>
                    <p className="text-sm text-gray-800 font-medium">{r.action}</p>
                    {r.ressource && (
                      <p className="text-xs text-indigo-600 mt-1">Ressource : {r.ressource}</p>
                    )}
                  </div>
                ))}
              </div>
            </ResultatSection>
          )}

          {/* Objectif suivant + encouragement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resultat.objectifSuivant && (
              <ResultatSection titre="Objectif pour le prochain travail">
                <p className="text-sm text-gray-700">{resultat.objectifSuivant}</p>
              </ResultatSection>
            )}
            {resultat.encouragement && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-700 mb-1">Encouragement</p>
                <p className="text-sm text-emerald-900 italic">{resultat.encouragement}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ONGLETS = [
  { id: 'scenario',      label: 'Situations pro',          icone: Building2,       composant: OngletScenario },
  { id: 'cours',         label: 'Cours complet',           icone: GraduationCap,   composant: OngletCours },
  { id: 'support',       label: 'Support de travail',      icone: Wrench,          composant: OngletSupportTravail },
  { id: 'appreciation',  label: 'Appréciation & Remédiation', icone: ClipboardCheck, composant: OngletAppreciationRemediation },
  { id: 'entretien',     label: 'Questions d\'entretien',  icone: MessageSquare,   composant: OngletQuestionsEntretien },
  { id: 'bulletin',      label: 'Commentaire bulletin',    icone: BookOpen,        composant: OngletBulletin },
  { id: 'fragiles',      label: 'Compétences fragiles',    icone: Target,          composant: OngletCompetencesFragiles },
];

export default function AssistantIA() {
  const { utilisateur } = useAuth();
  const [onglet, setOnglet] = useState('scenario');
  const estEnseignant = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);

  if (!estEnseignant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Sparkles className="w-12 h-12 text-indigo-200 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Assistant IA</h2>
        <p className="text-gray-400 mt-1 text-sm">Cette section est réservée aux enseignants.</p>
      </div>
    );
  }

  const OngletActif = ONGLETS.find((o) => o.id === onglet)?.composant ?? OngletBulletin;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistant IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fonctions d'intelligence artificielle pédagogique</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              onglet === o.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <o.icone className="w-4 h-4" />
            {o.label}
          </button>
        ))}
      </div>

      <OngletActif />
    </div>
  );
}
