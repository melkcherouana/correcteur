import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Upload, CheckCircle, ChevronDown, ChevronUp, Loader2, AlertCircle,
  BookOpen, Plus, Pencil, Check, X, GripVertical, Trash2, FolderOpen,
  ListChecks, Info,
} from 'lucide-react';

// ─── Étape 1 : Upload PDF ─────────────────────────────────────────────────────

function EtapeUpload({ onResultat }) {
  const inputRef = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [erreur, setErreur] = useState('');

  const mutation = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('fichier', file);
      const { data } = await api.post('/referentiel/analyser', form, {
        headers: { 'Content-Type': null },
      });
      return data;
    },
    onSuccess: (data) => onResultat(data.referentiel),
    onError: (e) => setErreur(e.response?.data?.message ?? 'Erreur lors de l\'analyse'),
  });

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') { setFichier(f); setErreur(''); }
    else setErreur('Veuillez déposer un fichier PDF');
  };

  return (
    <div className="max-w-xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="font-medium text-slate-700 dark:text-slate-300">Déposez votre référentiel PDF ici</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ou cliquez pour parcourir (max 20 Mo)</p>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { setFichier(e.target.files[0] ?? null); setErreur(''); }} />
      </div>

      {fichier && (
        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{fichier.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{(fichier.size / 1024).toFixed(0)} Ko</span>
        </div>
      )}

      {erreur && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" /> {erreur}
        </p>
      )}

      <button
        disabled={!fichier || mutation.isPending}
        onClick={() => fichier && mutation.mutate(fichier)}
        className="mt-5 w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Analyse en cours…' : 'Analyser avec l\'IA'}
      </button>
    </div>
  );
}

// ─── Étape 2 : Réorganisation par pôles (drag & drop) ────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function nomaliserId(poles) {
  return poles.map((p, pi) => ({
    ...p,
    _id: p._id ?? genId(),
    ordre: pi,
    competences: (p.competences ?? []).map((c, ci) => ({
      ...c,
      _id: c._id ?? genId(),
      ordre: ci,
    })),
  }));
}

function NomPole({ nom, onRenommer, onSupprimer }) {
  const [edite, setEdite] = useState(false);
  const [valeur, setValeur] = useState(nom);
  const ref = useRef(null);

  const valider = () => {
    if (valeur.trim()) onRenommer(valeur.trim());
    setEdite(false);
  };

  if (edite) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={ref}
          autoFocus
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') setEdite(false); }}
          className="flex-1 min-w-0 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-700 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button onClick={valider} className="p-1 text-indigo-600 hover:text-indigo-800"><Check className="w-4 h-4" /></button>
        <button onClick={() => setEdite(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 group">
      <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{nom}</span>
      <button
        onClick={() => setEdite(true)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 transition-opacity"
        title="Renommer"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {onSupprimer && (
        <button
          onClick={onSupprimer}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-opacity ml-auto"
          title="Supprimer ce pôle"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CarteCompetence({ comp, isDragging, onDragStart, onDragOver, onSupprimer }) {
  const [ouvert, setOuvert] = useState(false);
  const nbCriteres = (comp.criteres ?? []).length;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      className={[
        'rounded-lg border bg-white transition-all select-none group',
        isDragging ? 'opacity-50 border-indigo-400 shadow-lg scale-95' : 'border-slate-200 dark:border-slate-700',
      ].join(' ')}
    >
      {/* En-tête de la compétence */}
      <div
        draggable
        onDragStart={onDragStart}
        className="flex items-start gap-2 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
      >
        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex-shrink-0">{comp.code}</span>
        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug flex-1">{comp.description}</span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onSupprimer?.(); }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-slate-300 hover:text-red-500 transition-opacity"
          title="Supprimer cette compétence"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {nbCriteres > 0 ? (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setOuvert((v) => !v); }}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 ml-1"
            title={ouvert ? 'Masquer les critères' : 'Voir les critères'}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>{nbCriteres}</span>
            {ouvert ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : (
          <span className="flex-shrink-0 text-xs text-amber-400 ml-1" title="Aucun critère extrait">—</span>
        )}
      </div>

      {/* Critères observables */}
      {ouvert && nbCriteres > 0 && (
        <div className="px-3 pb-2.5 border-t border-slate-100 dark:border-slate-700 mt-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-2 mb-1.5">
            Critères observables évaluables
          </p>
          <ul className="space-y-1">
            {(comp.criteres ?? []).map((critere, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                <span className="leading-snug">{critere}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ZonePole({ pole, dragId, dragOver, onDragOverPole, onDropPole, onRenommer, onSupprimer, children }) {
  const [ouvert, setOuvert] = useState(true);
  const estCible = dragOver && dragId !== null;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOverPole(); }}
      onDrop={() => onDropPole()}
      className={[
        'rounded-xl border-2 transition-colors',
        estCible ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 bg-white',
      ].join(' ')}
    >
      {/* En-tête pôle */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <NomPole nom={pole.titre} onRenommer={onRenommer} onSupprimer={onSupprimer} />
        <span className="text-xs text-slate-400 flex-shrink-0">
          {(pole.competences ?? []).length} compétence{(pole.competences ?? []).length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => setOuvert((v) => !v)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {ouvert ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Zone de dépôt */}
      {ouvert && (
        <div className={[
          'min-h-[52px] px-3 pb-3 space-y-1.5',
          estCible ? 'pt-1' : '',
        ].join(' ')}>
          {estCible && (
            <div className="h-1.5 rounded-full bg-indigo-400 mx-1 mb-2" />
          )}
          {(pole.competences ?? []).length === 0 ? (
            <div className={[
              'flex items-center justify-center h-10 rounded-lg border-2 border-dashed text-sm',
              estCible ? 'border-indigo-400 dark:border-indigo-500 text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 text-slate-400',
            ].join(' ')}>
              Déposez une compétence ici
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

const LABELS_TYPE_ORG = {
  poles: 'Pôles de compétences',
  blocs: 'Blocs de compétences',
  classes: 'Classes',
  domaines: 'Domaines',
};

function EtapeOrganisation({ referentiel, onContinuer }) {
  const [poles, setPoles] = useState(() => nomaliserId([
    ...(referentiel.poles ?? []),
  ]));
  const [matiereExistanteId, setMatiereExistanteId] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dragSrcPole, setDragSrcPole] = useState(null);
  const [dragOverPole, setDragOverPole] = useState(null);
  const [dragOverCompId, setDragOverCompId] = useState(null);

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres-liste'],
    queryFn: () => api.get('/referentiel/matieres').then((r) => r.data),
  });
  const matiereSelectionnee = matieres.find((m) => m.id === matiereExistanteId);

  const totalComps = poles.reduce((s, p) => s + (p.competences?.length ?? 0), 0);
  const totalCriteres = poles.reduce(
    (s, p) => s + (p.competences ?? []).reduce((sc, c) => sc + (c.criteres?.length ?? 0), 0),
    0,
  );
  const typeOrg = referentiel.typeOrganisation ?? 'poles';
  const labelTypeOrg = LABELS_TYPE_ORG[typeOrg] ?? 'Groupes de compétences';

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const startDrag = (compId, poleId) => {
    setDragId(compId);
    setDragSrcPole(poleId);
  };

  const endDrag = () => {
    setDragId(null);
    setDragSrcPole(null);
    setDragOverPole(null);
    setDragOverCompId(null);
  };

  const drop = (targetPoleId) => {
    if (!dragId || !dragSrcPole) { endDrag(); return; }

    setPoles((prev) => {
      const src = prev.find((p) => p._id === dragSrcPole);
      const comp = src?.competences?.find((c) => c._id === dragId);
      if (!comp) return prev;

      if (targetPoleId === dragSrcPole) {
        // Réordonnancement au sein du même pôle
        if (!dragOverCompId || dragOverCompId === dragId) return prev;
        return prev.map((p) => {
          if (p._id !== targetPoleId) return p;
          const liste = p.competences.filter((c) => c._id !== dragId);
          const idx = liste.findIndex((c) => c._id === dragOverCompId);
          liste.splice(idx === -1 ? liste.length : idx, 0, comp);
          return { ...p, competences: liste.map((c, i) => ({ ...c, ordre: i })) };
        });
      }

      // Déplacement vers un autre pôle
      return prev.map((p) => {
        if (p._id === dragSrcPole) {
          return { ...p, competences: p.competences.filter((c) => c._id !== dragId) };
        }
        if (p._id === targetPoleId) {
          const dest = [...(p.competences ?? [])];
          const idx = dragOverCompId ? dest.findIndex((c) => c._id === dragOverCompId) : -1;
          dest.splice(idx === -1 ? dest.length : idx, 0, { ...comp });
          return { ...p, competences: dest.map((c, i) => ({ ...c, ordre: i })) };
        }
        return p;
      });
    });
    endDrag();
  };

  // ── Gestion des pôles ──────────────────────────────────────────────────────

  const ajouterPole = () => {
    const num = poles.length + 1;
    setPoles((prev) => [
      ...prev,
      { _id: genId(), code: `P${num}`, titre: `Nouveau pôle ${num}`, competences: [], ordre: prev.length },
    ]);
  };

  const renommerPole = (poleId, nouveauTitre) => {
    setPoles((prev) => prev.map((p) => p._id === poleId ? { ...p, titre: nouveauTitre } : p));
  };

  const supprimerPole = (poleId) => {
    setPoles((prev) => {
      const pole = prev.find((p) => p._id === poleId);
      const compsOrphelines = pole?.competences ?? [];
      // Déplacer les compétences dans le premier autre pôle disponible
      const autresPoles = prev.filter((p) => p._id !== poleId);
      if (autresPoles.length === 0) return prev; // Au moins un pôle requis
      return autresPoles.map((p, i) =>
        i === 0
          ? { ...p, competences: [...(p.competences ?? []), ...compsOrphelines] }
          : p
      );
    });
  };

  const supprimerCompetence = (poleId, compId) => {
    setPoles((prev) =>
      prev.map((p) =>
        p._id === poleId
          ? { ...p, competences: p.competences.filter((c) => c._id !== compId) }
          : p
      )
    );
  };

  // ── Continuer vers l'import ────────────────────────────────────────────────

  const handleContinuer = () => {
    const polesFinaux = poles.map((p, pi) => ({
      code: p.code,
      titre: p.titre,
      ordre: pi,
      competences: (p.competences ?? []).map((c, ci) => ({
        code: c.code,
        description: c.description,
        criteres: c.criteres ?? [],
        ordre: ci,
      })),
    }));
    onContinuer({
      titre: referentiel.titre,
      niveau: referentiel.niveau,
      poles: polesFinaux,
      matiereExistanteId: matiereExistanteId || undefined,
    });
  };

  return (
    <div
      onDragEnd={endDrag}
      className="space-y-6"
    >
      {/* Résumé */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-1">
        <h3 className="font-semibold text-indigo-800 dark:text-indigo-300">{referentiel.titre ?? 'Référentiel analysé'}</h3>
        {referentiel.niveau && (
          <p className="text-sm text-indigo-600 dark:text-indigo-400">Niveau : {referentiel.niveau}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <FolderOpen className="w-3.5 h-3.5" />
            {poles.length} {labelTypeOrg}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <BookOpen className="w-3.5 h-3.5" />
            {totalComps} compétence{totalComps !== 1 ? 's' : ''}
          </span>
          <span className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            totalCriteres > 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          ].join(' ')}>
            <ListChecks className="w-3.5 h-3.5" />
            {totalCriteres > 0
              ? `${totalCriteres} critère${totalCriteres !== 1 ? 's' : ''} observables`
              : 'Aucun critère extrait'}
          </span>
        </div>
        {referentiel.observations && (
          <p className="flex items-start gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 mt-2 italic">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {referentiel.observations}
          </p>
        )}
      </div>

      {/* Sélection matière */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">
          Associer à une matière
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          Choisissez la matière existante ou laissez vide pour en créer une nouvelle automatiquement.
        </p>
        <select
          value={matiereExistanteId}
          onChange={(e) => setMatiereExistanteId(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Créer une nouvelle matière —</option>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
          ))}
        </select>
        {matiereSelectionnee && (matiereSelectionnee.poles.length > 0 || matiereSelectionnee._count?.competences > 0) && (
          <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              « {matiereSelectionnee.nom} » contient déjà {matiereSelectionnee.poles.length} pôle{matiereSelectionnee.poles.length !== 1 ? 's' : ''} et {matiereSelectionnee._count?.competences ?? 0} compétence{(matiereSelectionnee._count?.competences ?? 0) !== 1 ? 's' : ''}.
              Cet import va s'<strong>ajouter</strong> à ce contenu (aucune détection de doublon) — vérifiez qu'il ne s'agit pas d'une réimportation du même référentiel avant de continuer.
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
        <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Vérifiez la liste extraite par l'IA. Glissez les compétences entre les {labelTypeOrg.toLowerCase()} pour réorganiser.
          Cliquez sur le compteur de critères <ListChecks className="inline w-3.5 h-3.5 mx-0.5" /> pour voir les critères observables de chaque compétence.
        </span>
      </div>

      {/* Pôles */}
      <div className="space-y-3">
        {poles.map((pole) => (
          <ZonePole
            key={pole._id}
            pole={pole}
            dragId={dragOverPole === pole._id ? dragId : null}
            dragOver={dragOverPole === pole._id}
            onDragOverPole={() => setDragOverPole(pole._id)}
            onDropPole={() => drop(pole._id)}
            onRenommer={(titre) => renommerPole(pole._id, titre)}
            onSupprimer={poles.length > 1 ? () => supprimerPole(pole._id) : undefined}
          >
            {(pole.competences ?? []).map((comp) => (
              <CarteCompetence
                key={comp._id}
                comp={comp}
                isDragging={dragId === comp._id}
                onDragStart={() => startDrag(comp._id, pole._id)}
                onDragOver={() => setDragOverCompId(comp._id)}
                onSupprimer={() => supprimerCompetence(pole._id, comp._id)}
              />
            ))}
          </ZonePole>
        ))}
      </div>

      {/* Ajouter un pôle */}
      <button
        onClick={ajouterPole}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Ajouter un pôle
      </button>

      {/* Valider */}
      <button
        onClick={handleContinuer}
        disabled={totalComps === 0}
        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        Valider et importer — {totalComps} compétence{totalComps !== 1 ? 's' : ''}
        {totalCriteres > 0 && ` · ${totalCriteres} critère${totalCriteres !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

// ─── Étape 3 : Import en base ─────────────────────────────────────────────────

function EtapeImport({ payload, onSucces }) {
  const mutation = useMutation({
    mutationFn: () => api.post('/referentiel/importer', payload).then((r) => r.data),
    onSuccess: onSucces,
  });

  // Lancer automatiquement au montage
  useState(() => { mutation.mutate(); });

  return (
    <div className="flex flex-col items-center py-10 gap-4">
      {mutation.isPending && (
        <>
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">Import en cours…</p>
        </>
      )}
      {mutation.isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {mutation.error?.response?.data?.message ?? 'Erreur lors de l\'import'}
        </div>
      )}
    </div>
  );
}

// ─── Étape 4 : Succès ─────────────────────────────────────────────────────────

function EtapeSucces({ resultat, onRecommencer }) {
  return (
    <div className="max-w-md mx-auto text-center py-10">
      <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Import réussi !</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-1">
        <span className="font-semibold text-indigo-700 dark:text-indigo-400">{resultat.totalCreees}</span> compétences importées
        dans <span className="font-semibold">{resultat.totalPoles}</span> pôle{resultat.totalPoles !== 1 ? 's' : ''}
        {resultat.totalIgnorees > 0 && ` (${resultat.totalIgnorees} doublons ignorés)`}
      </p>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Matière : <span className="font-medium">{resultat.matiereNom}</span>
      </p>
      <button
        onClick={onRecommencer}
        className="px-6 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm font-medium"
      >
        Importer un autre référentiel
      </button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ETAPES = ['Upload PDF', 'Organiser', 'Import', 'Terminé'];

export default function ImportReferentiel() {
  const [etape, setEtape] = useState(0);
  const [referentiel, setReferentiel] = useState(null);
  const [payload, setPayload] = useState(null);
  const [resultatImport, setResultatImport] = useState(null);

  const recommencer = () => {
    setEtape(0); setReferentiel(null); setPayload(null); setResultatImport(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Import de référentiel</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          L'IA extrait les pôles et compétences — vous les réorganisez avant l'import.
        </p>
      </div>

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {ETAPES.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
              ${i < etape ? 'bg-green-500 text-white' : i === etape ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
              {i < etape ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${i === etape ? 'font-medium text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`}>
              {label}
            </span>
            {i < ETAPES.length - 1 && <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        {etape === 0 && (
          <EtapeUpload onResultat={(data) => { setReferentiel(data); setEtape(1); }} />
        )}
        {etape === 1 && referentiel && (
          <EtapeOrganisation
            referentiel={referentiel}
            onContinuer={(p) => { setPayload(p); setEtape(2); }}
          />
        )}
        {etape === 2 && payload && (
          <EtapeImport payload={payload} onSucces={(r) => { setResultatImport(r); setEtape(3); }} />
        )}
        {etape === 3 && resultatImport && (
          <EtapeSucces resultat={resultatImport} onRecommencer={recommencer} />
        )}
      </div>
    </div>
  );
}
