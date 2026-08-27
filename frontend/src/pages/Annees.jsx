import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  CalendarDays, Plus, CheckCircle2, AlertTriangle,
  X, Check, ArrowRightLeft, Trash2, Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api.js';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';

function ModalCreerAnnee({ onFermer }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => api.post('/annees', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['annees'] }); onFermer(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nouvelle année scolaire</h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Libellé * <span className="text-gray-400">(ex: 2026-2027)</span></label>
            <input {...register('libelle', { required: true, pattern: /^\d{4}-\d{4}$/ })}
              placeholder="2026-2027"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.libelle && <p className="text-xs text-red-500 mt-1">Format attendu : AAAA-AAAA</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Début *</label>
              <input type="date" {...register('debut', { required: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fin *</label>
              <input type="date" {...register('fin', { required: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Bornes des trimestres <span className="text-gray-400">(optionnel — sinon découpage en tiers égaux)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" {...register('finTrimestre1')} placeholder="Fin trimestre 1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="date" {...register('finTrimestre2')} placeholder="Fin trimestre 2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {mutation.error && (
            <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
              {mutation.error?.response?.data?.message ?? 'Erreur lors de la création'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onFermer} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending ? <Spinner size="sm" /> : <Check className="w-4 h-4" />} Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalChangementAnnee({ annee, onFermer }) {
  const [confirme, setConfirme] = useState(false);
  const [resultat, setResultat] = useState(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/annees/${annee.id}/changement-annee`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['annees'] });
      setResultat(data);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Changement d'année scolaire</h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {!resultat ? (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">Action irréversible</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    <li>Toutes les classes actives seront promues d'un niveau</li>
                    <li>Les classes en dernière année de leur parcours (CAP 2, Terminale Pro, BTS 2) seront archivées</li>
                    <li>L'année <strong>{annee.libelle}</strong> deviendra l'année active</li>
                  </ul>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Je confirme le passage à l'année <strong>{annee.libelle}</strong></span>
              </label>

              {mutation.error && (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                  {mutation.error?.response?.data?.message ?? 'Erreur lors du changement'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={onFermer} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!confirme || mutation.isPending}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {mutation.isPending ? <Spinner size="sm" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Confirmer le changement
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Changement effectué — année active : {resultat.annee?.libelle}</p>
              </div>
              {resultat.bilan && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                  <p className="font-medium text-gray-700">{resultat.bilan.totalTraitees} classe{resultat.bilan.totalTraitees !== 1 ? 's' : ''} traitée{resultat.bilan.totalTraitees !== 1 ? 's' : ''}</p>
                  {resultat.bilan.classesPromues?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Promues</p>
                      {resultat.bilan.classesPromues.map((p, i) => (
                        <p key={i} className="text-xs text-gray-600">{p.avant} → {p.apres}</p>
                      ))}
                    </div>
                  )}
                  {resultat.bilan.classesArchivees?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Archivées</p>
                      {resultat.bilan.classesArchivees.map((c, i) => (
                        <p key={i} className="text-xs text-gray-500">{c}</p>
                      ))}
                    </div>
                  )}
                  {resultat.bilan.classesNonReconnues?.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Non traitées — niveau non reconnu, à corriger manuellement
                      </p>
                      {resultat.bilan.classesNonReconnues.map((c, i) => (
                        <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{c.nom} — niveau « {c.niveau} »</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={onFermer} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Fermer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Bornes des trimestres 1/2 d'une année — édition inline (repli tiers égaux si non renseignées)
function BornesTrimestres({ annee }) {
  const [edition, setEdition] = useState(false);
  const [t1, setT1] = useState(annee.finTrimestre1 ? annee.finTrimestre1.slice(0, 10) : '');
  const [t2, setT2] = useState(annee.finTrimestre2 ? annee.finTrimestre2.slice(0, 10) : '');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.put(`/annees/${annee.id}`, { finTrimestre1: t1 || null, finTrimestre2: t2 || null }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['annees'] }); setEdition(false); },
  });

  if (!edition) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
        <span>
          Trimestres :{' '}
          {annee.finTrimestre1 && annee.finTrimestre2
            ? `T1 → ${format(new Date(annee.finTrimestre1), 'd MMM', { locale: fr })} · T2 → ${format(new Date(annee.finTrimestre2), 'd MMM', { locale: fr })}`
            : 'découpage automatique (tiers égaux)'}
        </span>
        <button onClick={() => setEdition(true)} className="text-indigo-500 hover:text-indigo-700" title="Modifier les bornes de trimestre">
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input type="date" value={t1} onChange={(e) => setT1(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <span className="text-gray-300 text-xs">→</span>
      <input type="date" value={t2} onChange={(e) => setT2(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="text-emerald-600 hover:text-emerald-700" title="Enregistrer">
        {mutation.isPending ? <Spinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => setEdition(false)} className="text-gray-400 hover:text-gray-600" title="Annuler">
        <X className="w-3.5 h-3.5" />
      </button>
      {mutation.error && (
        <span className="text-xs text-red-500">{mutation.error?.response?.data?.message ?? 'Erreur'}</span>
      )}
    </div>
  );
}

export default function Annees() {
  const [modalCree, setModalCree] = useState(false);
  const [anneeChangement, setAnneeChangement] = useState(null);
  const qc = useQueryClient();

  const { data: annees = [], isLoading } = useQuery({
    queryKey: ['annees'],
    queryFn: () => api.get('/annees').then((r) => r.data),
  });

  const supprimerMutation = useMutation({
    mutationFn: (id) => api.delete(`/annees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annees'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Années scolaires</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des années et promotion des classes</p>
        </div>
        <button
          onClick={() => setModalCree(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle année
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : annees.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-gray-400">
            <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Aucune année scolaire créée</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {annees.map((annee) => (
            <Card key={annee.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${annee.actif ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100'}`}>
                    <CalendarDays className={`w-5 h-5 ${annee.actif ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{annee.libelle}</p>
                      {annee.actif && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(annee.debut), 'd MMM yyyy', { locale: fr })} → {format(new Date(annee.fin), 'd MMM yyyy', { locale: fr })}
                    </p>
                    <BornesTrimestres annee={annee} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!annee.actif && (
                    <>
                      <button
                        onClick={() => setAnneeChangement(annee)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-200 dark:border-amber-800"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Activer + promouvoir
                      </button>
                      <button
                        onClick={() => supprimerMutation.mutate(annee.id)}
                        className="p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalCree && <ModalCreerAnnee onFermer={() => setModalCree(false)} />}
      {anneeChangement && <ModalChangementAnnee annee={anneeChangement} onFermer={() => setAnneeChangement(null)} />}
    </div>
  );
}
