import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ClipboardList, Plus, Search, Filter, X, ChevronRight, Paperclip, ChevronDown, ChevronUp, AlertCircle, Clock, CheckCircle2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const TYPES = [
  { value: 'DEVOIR_SURVEILLE', label: 'Devoir surveillé' },
  { value: 'TRAVAUX_PRATIQUES', label: 'Travaux pratiques' },
  { value: 'ORAL', label: 'Oral' },
  { value: 'PROJET', label: 'Projet' },
  { value: 'CCF', label: 'CCF' },
];

const STATUTS = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'PUBLIEE', label: 'Publiée' },
  { value: 'CORRIGEE', label: 'Corrigée' },
  { value: 'ARCHIVEE', label: 'Archivée' },
];

const TYPE_LABELS = {
  DEVOIR_SURVEILLE: 'DS', TRAVAUX_PRATIQUES: 'TP',
  ORAL: 'Oral', PROJET: 'Projet', CCF: 'CCF',
};

function FormulaireEvaluation({ classes, sequences, matieres, onSubmit, onClose, loading, erreurApi, classeIdInitial, sequenceIdInitial }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      classeId: classeIdInitial ?? '',
      sequenceId: sequenceIdInitial ?? '',
      noteMax: 20, coefficient: 1, type: 'DEVOIR_SURVEILLE',
    },
  });
  const [fichierJoint, setFichierJoint] = useState(null);
  const [matiereId, setMatiereId] = useState('');
  const [competenceIds, setCompetenceIds] = useState([]);
  const [polesOuverts, setPolesOuverts] = useState({});

  const sequenceIdWatched = watch('sequenceId');

  // Auto-détecter la matière depuis la séquence sélectionnée
  useEffect(() => {
    if (!sequenceIdWatched) return;
    const seq = sequences.find((s) => s.id === sequenceIdWatched);
    if (seq?.matiere?.id) {
      setMatiereId(seq.matiere.id);
      setCompetenceIds([]);
      setPolesOuverts({});
    }
  }, [sequenceIdWatched, sequences]);

  const { data: arbo } = useQuery({
    queryKey: ['matiere-arbo-form', matiereId],
    queryFn: () => api.get(`/referentiel/matieres/${matiereId}/arborescence`).then((r) => r.data),
    enabled: !!matiereId,
    staleTime: 5 * 60 * 1000,
  });

  const toggleCompetence = (id) => {
    setCompetenceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const togglePole = (poleIds) => {
    const allSelected = poleIds.every((id) => competenceIds.includes(id));
    setCompetenceIds((prev) =>
      allSelected
        ? prev.filter((id) => !poleIds.includes(id))
        : [...new Set([...prev, ...poleIds])]
    );
  };

  const handleFormSubmit = (formData) => onSubmit({ ...formData, competenceIds }, fichierJoint);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Nouvelle évaluation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              {...register('titre', { required: 'Le titre est requis' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ex : Évaluation chapitre 3 — Électricité"
            />
            {errors.titre && <p className="text-xs text-red-500 mt-1">{errors.titre.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select
              {...register('classeId', { required: 'La classe est requise' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Choisir une classe…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {errors.classeId && <p className="text-xs text-red-500 mt-1">{errors.classeId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de passage</label>
              <input
                type="date"
                {...register('datePassage')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note maximale</label>
              <input
                type="number"
                step="0.5"
                min="1"
                {...register('noteMax', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
              <input
                type="number"
                step="0.5"
                min="0"
                {...register('coefficient', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Séquence (optionnel)</label>
            <select
              {...register('sequenceId')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Aucune séquence</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>[{s.matiere?.code}] {s.titre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Instructions, consignes particulières…"
            />
          </div>

          {/* Compétences évaluées */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compétences évaluées <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <select
              value={matiereId}
              onChange={(e) => { setMatiereId(e.target.value); setCompetenceIds([]); setPolesOuverts({}); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white mb-2"
            >
              <option value="">— Choisir une matière pour les compétences —</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>
              ))}
            </select>

            {arbo && (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                {(arbo.poles ?? []).map((pole) => {
                  const poleCompIds = pole.competences.map((c) => c.id);
                  const nbSel = poleCompIds.filter((id) => competenceIds.includes(id)).length;
                  const ouvert = polesOuverts[pole.id] !== false;
                  return (
                    <div key={pole.id} className="border-b border-gray-100 last:border-0">
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50/60 cursor-pointer select-none"
                        onClick={() => setPolesOuverts((p) => ({ ...p, [pole.id]: !ouvert }))}
                      >
                        <input
                          type="checkbox"
                          checked={poleCompIds.length > 0 && nbSel === poleCompIds.length}
                          ref={(el) => { if (el) el.indeterminate = nbSel > 0 && nbSel < poleCompIds.length; }}
                          onChange={() => togglePole(poleCompIds)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <span className="flex-1 text-xs font-semibold text-indigo-700">
                          {pole.code} — {pole.titre}
                        </span>
                        <span className="text-xs text-gray-400">{nbSel}/{poleCompIds.length}</span>
                        {ouvert ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                      </div>
                      {ouvert && pole.competences.map((comp) => {
                        const checked = competenceIds.includes(comp.id);
                        return (
                          <label
                            key={comp.id}
                            className={`flex items-start gap-2 px-4 py-1.5 cursor-pointer text-xs hover:bg-gray-50 ${checked ? 'bg-indigo-50/40' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCompetence(comp.id)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <span>
                              <strong className="text-indigo-600">{comp.code}</strong>{' '}
                              <span className="text-gray-600">{comp.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                {(arbo.competences ?? []).length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500">Sans pôle</div>
                    {arbo.competences.map((comp) => {
                      const checked = competenceIds.includes(comp.id);
                      return (
                        <label
                          key={comp.id}
                          className={`flex items-start gap-2 px-4 py-1.5 cursor-pointer text-xs hover:bg-gray-50 ${checked ? 'bg-indigo-50/40' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCompetence(comp.id)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                          />
                          <span>
                            <strong className="text-indigo-600">{comp.code}</strong>{' '}
                            <span className="text-gray-600">{comp.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {competenceIds.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1 font-medium">
                {competenceIds.length} compétence{competenceIds.length > 1 ? 's' : ''} sélectionnée{competenceIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Pièce jointe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet / Pièce jointe <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            {fichierJoint ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                <Paperclip className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-indigo-700 truncate flex-1">{fichierJoint.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {(fichierJoint.size / 1024).toFixed(0)} Ko
                </span>
                <button
                  type="button"
                  onClick={() => setFichierJoint(null)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
                <Paperclip className="w-4 h-4 flex-shrink-0" />
                <span>Ajouter un fichier (PDF, Word, Excel — 20 Mo max)</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => setFichierJoint(e.target.files[0] ?? null)}
                />
              </label>
            )}
          </div>

          {erreurApi && <p className="text-sm text-red-600">{erreurApi}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading && <Spinner size="sm" />}
              Créer l'évaluation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers vue élève ────────────────────────────────────────────────────────

function statutSoumission(ev) {
  if (ev.maSoumission?.corrigeeIA || ev.statut === 'CORRIGEE') return 'corrige';
  if (ev.maSoumission) return 'depose';
  return 'a_rendre';
}

function joursRestants(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}

const STATUT_SOUM = {
  a_rendre: { label: 'À rendre', cls: 'bg-gray-100 text-gray-600',    icon: Upload },
  depose:   { label: 'Déposé',   cls: 'bg-blue-100 text-blue-700',    icon: Clock },
  corrige:  { label: 'Corrigé',  cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
};

const ORDRE_STATUT = { a_rendre: 0, depose: 1, corrige: 2 };

// ─── Liste devoirs élève ──────────────────────────────────────────────────────

function ListeDevoirs({ evaluations, navigate }) {
  const triees = [...evaluations]
    .map((ev) => ({ ...ev, _statut: statutSoumission(ev), _jours: joursRestants(ev.datePassage) }))
    .sort((a, b) => {
      if (ORDRE_STATUT[a._statut] !== ORDRE_STATUT[b._statut])
        return ORDRE_STATUT[a._statut] - ORDRE_STATUT[b._statut];
      const dA = a.datePassage ? new Date(a.datePassage).getTime() : Infinity;
      const dB = b.datePassage ? new Date(b.datePassage).getTime() : Infinity;
      return dA - dB;
    });

  if (triees.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400">
        <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium text-gray-500">Aucun devoir</p>
        <p className="text-sm mt-1">Vos devoirs apparaîtront ici dès qu'un enseignant en publie un</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {triees.map((ev) => {
        const cfg     = STATUT_SOUM[ev._statut];
        const jours   = ev._jours;
        const enRetard = ev._statut === 'a_rendre' && jours !== null && jours < 0;
        const urgent   = ev._statut === 'a_rendre' && jours !== null && jours >= 0 && jours <= 3;

        const barreColor = enRetard ? 'bg-red-400'
          : urgent        ? 'bg-orange-400'
          : ev._statut === 'corrige' ? 'bg-green-400'
          : ev._statut === 'depose'  ? 'bg-blue-400'
          : 'bg-gray-200';

        const cardCls = urgent || enRetard
          ? 'border-orange-200 bg-orange-50/40 hover:border-orange-300'
          : 'border-gray-100 hover:border-indigo-200 bg-white';

        return (
          <button
            key={ev.id}
            onClick={() => navigate(`/evaluations/${ev.id}`)}
            className={`w-full text-left flex items-stretch gap-4 px-5 py-4 rounded-xl border transition-all hover:shadow-sm group ${cardCls}`}
          >
            {/* Barre couleur latérale */}
            <div className={`w-1 rounded-full flex-shrink-0 ${barreColor}`} />

            {/* Contenu principal */}
            <div className="flex-1 min-w-0">
              {/* Ligne titre */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
                  {TYPE_LABELS[ev.type] ?? ev.type}
                </span>
                {ev.sujetNom && (
                  <Paperclip
                    className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"
                    title="Énoncé disponible"
                  />
                )}
                <span className="text-sm font-semibold text-gray-900 truncate">{ev.titre}</span>
              </div>

              {/* Ligne date */}
              {ev.datePassage ? (
                <div className="flex items-center gap-1.5 text-xs">
                  {enRetard || urgent
                    ? <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    : <Clock className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                  <span className={enRetard || urgent ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                    {format(new Date(ev.datePassage), 'dd MMM yyyy', { locale: fr })}
                  </span>
                  {ev._statut === 'a_rendre' && jours !== null && (
                    <span className={`font-semibold ${enRetard ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-400'}`}>
                      {enRetard
                        ? `· ${Math.abs(jours)}j de retard`
                        : jours === 0
                        ? '· Aujourd\'hui !'
                        : `· dans ${jours}j`}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-300">Pas de date limite</p>
              )}
            </div>

            {/* Badge statut soumission */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Evaluations() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreType, setFiltreType] = useState('');
  const [filtreClasse, setFiltreClasse] = useState(location.state?.filtreClasseId ?? '');
  const [showForm, setShowForm] = useState(false);
  const classeIdInitial   = location.state?.classeId   ?? null;
  const sequenceIdInitial = location.state?.sequenceId ?? null;

  // Ouvrir le formulaire automatiquement si on vient d'une classe (nouvelle éval) ou d'une séquence
  useEffect(() => {
    if (classeIdInitial || sequenceIdInitial) setShowForm(true);
  }, [classeIdInitial, sequenceIdInitial]);

  const { data: evalsData, isLoading } = useQuery({
    queryKey: ['evaluations', { statut: filtreStatut, type: filtreType, classeId: filtreClasse }],
    queryFn: () => api.get('/evaluations', {
      params: {
        statut:   filtreStatut || undefined,
        type:     filtreType   || undefined,
        classeId: filtreClasse || undefined,
        limite: 50,
      },
    }).then((r) => r.data),
    // Polling pour que l'élève voit apparaître les nouvelles évaluations publiées
    refetchInterval: utilisateur?.role === 'ELEVE' ? 30000 : false,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
    enabled: showForm,
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => api.get('/sequences').then((r) => r.data),
    enabled: showForm,
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres-referentiel'],
    queryFn: () => api.get('/referentiel/matieres').then((r) => r.data),
    enabled: showForm,
    staleTime: 10 * 60 * 1000,
  });

  const creer = useMutation({
    mutationFn: async ({ formData, fichier }) => {
      const nouvelleEval = await api.post('/evaluations', {
        ...formData,
        classeId:    formData.classeId,
        sequenceId:  formData.sequenceId  || null,
        datePassage: formData.datePassage || null,
      }).then((r) => r.data);

      if (fichier) {
        const form = new FormData();
        form.append('sujet', fichier);
        await api.post(`/evaluations/${nouvelleEval.id}/sujet`, form, {
          headers: { 'Content-Type': null },
        });
      }

      return nouvelleEval;
    },
    onSuccess: (nouvelleEval) => {
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      setShowForm(false);
      navigate(`/evaluations/${nouvelleEval.id}`);
    },
  });

  const evaluations = evalsData?.evaluations ?? [];
  const peutGerer = ['ADMIN', 'ENSEIGNANT'].includes(utilisateur?.role);

  // Bug 3 : l'élève ne voit pas les brouillons
  const STATUTS_ELEVE = ['PUBLIEE', 'CORRIGEE', 'ARCHIVEE'];

  const filtrees = evaluations.filter((e) => {
    if (utilisateur?.role === 'ELEVE' && !STATUTS_ELEVE.includes(e.statut)) return false;
    if (recherche && !e.titre.toLowerCase().includes(recherche.toLowerCase()) && !e.classe?.nom?.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {utilisateur?.role === 'ELEVE' ? 'Mes devoirs' : 'Évaluations'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${filtrees.length} évaluation${filtrees.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {peutGerer && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle évaluation
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        {/* Filtres statut / type uniquement pour les enseignants et admins */}
        {peutGerer && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Badge filtre classe actif */}
      {filtreClasse && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtré par classe :</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
            {evalsData?.evaluations?.[0]?.classe?.nom ?? filtreClasse}
            <button onClick={() => setFiltreClasse('')} className="hover:text-indigo-900">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : utilisateur?.role === 'ELEVE' ? (
        /* ── Vue élève : cards avec statut soumission, urgence, tri ── */
        <ListeDevoirs evaluations={filtrees} navigate={navigate} />
      ) : filtrees.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium text-gray-500">Aucune évaluation</p>
          <p className="text-sm mt-1">
            {recherche || filtreStatut || filtreType
              ? 'Aucun résultat pour ces filtres'
              : 'Créez votre première évaluation'}
          </p>
        </div>
      ) : (
        /* ── Vue enseignant/admin : table classique ── */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Classe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Type</th>
                {peutGerer && <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Statut</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrees.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900 max-w-[250px] truncate">{ev.titre}</td>
                  <td className="px-4 py-3.5 text-gray-600 hidden sm:table-cell">{ev.classe?.nom ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{TYPE_LABELS[ev.type] ?? ev.type}</td>
                  {peutGerer && <td className="px-4 py-3.5"><Badge value={ev.statut} /></td>}
                  <td className="px-4 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                    {ev.datePassage
                      ? format(new Date(ev.datePassage), 'dd MMM yyyy', { locale: fr })
                      : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormulaireEvaluation
          classes={classes}
          sequences={sequences}
          matieres={matieres}
          onSubmit={(formData, fichier) => creer.mutate({ formData, fichier })}
          onClose={() => setShowForm(false)}
          loading={creer.isPending}
          erreurApi={creer.error?.response?.data?.message}
          classeIdInitial={classeIdInitial}
          sequenceIdInitial={sequenceIdInitial}
        />
      )}
    </div>
  );
}
