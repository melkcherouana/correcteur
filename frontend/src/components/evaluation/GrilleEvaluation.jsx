import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Spinner from '../ui/Spinner.jsx';

// Paliers avec toutes les classes Tailwind explicites (pas de construction dynamique)
const PALIERS = [
  {
    valeur: null,
    label: 'NE',
    libelle: 'Non évaluable',
    badgeCls: 'bg-gray-100 text-gray-500',
    btnActiveCls: 'bg-gray-100 text-gray-600 border-gray-400 ring-2 ring-gray-300 ring-offset-1 shadow-sm',
    btnInactiveCls: 'bg-white text-gray-300 border-gray-200 hover:border-gray-300 hover:text-gray-500',
  },
  {
    valeur: 1,
    label: 'N',
    libelle: 'Novice',
    badgeCls: 'bg-red-100 text-red-700',
    btnActiveCls: 'bg-red-100 text-red-700 border-red-400 ring-2 ring-red-300 ring-offset-1 shadow-sm',
    btnInactiveCls: 'bg-white text-gray-300 border-gray-200 hover:border-red-200 hover:text-red-400',
  },
  {
    valeur: 2,
    label: 'D',
    libelle: 'Débrouillé',
    badgeCls: 'bg-orange-100 text-orange-700',
    btnActiveCls: 'bg-orange-100 text-orange-700 border-orange-400 ring-2 ring-orange-300 ring-offset-1 shadow-sm',
    btnInactiveCls: 'bg-white text-gray-300 border-gray-200 hover:border-orange-200 hover:text-orange-400',
  },
  {
    valeur: 3,
    label: 'A',
    libelle: 'Averti',
    badgeCls: 'bg-yellow-100 text-yellow-700',
    btnActiveCls: 'bg-yellow-100 text-yellow-700 border-yellow-400 ring-2 ring-yellow-300 ring-offset-1 shadow-sm',
    btnInactiveCls: 'bg-white text-gray-300 border-gray-200 hover:border-yellow-200 hover:text-yellow-500',
  },
  {
    valeur: 4,
    label: 'E',
    libelle: 'Expert',
    badgeCls: 'bg-green-100 text-green-700',
    btnActiveCls: 'bg-green-100 text-green-700 border-green-500 ring-2 ring-green-300 ring-offset-1 shadow-sm',
    btnInactiveCls: 'bg-white text-gray-300 border-gray-200 hover:border-green-300 hover:text-green-600',
  },
];

function getPalier(valeur) {
  return PALIERS.find((p) => p.valeur === valeur) ?? PALIERS[0];
}

export default function GrilleEvaluation({ grille = [], onSauvegarder, lectureSeule = false }) {
  const [paliers, setPaliers] = useState(() => {
    const map = {};
    grille.forEach(({ eleve, note }) => { map[eleve.id] = note?.valeur ?? null; });
    return map;
  });
  const [modifie, setModifie] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);

  // Resynchronise l'état local quand les données de la grille sont rafraîchies (ex : après correction IA)
  useEffect(() => {
    if (modifie) return;
    const map = {};
    grille.forEach(({ eleve, note }) => { map[eleve.id] = note?.valeur ?? null; });
    setPaliers(map);
  }, [grille]);

  const choisirPalier = (eleveId, valeur) => {
    if (lectureSeule) return;
    setPaliers((prev) => ({ ...prev, [eleveId]: valeur }));
    setModifie(true);
  };

  const handleSauvegarder = async () => {
    setSauvegarde(true);
    try {
      const notes = grille.map(({ eleve }) => ({ eleveId: eleve.id, valeur: paliers[eleve.id] }));
      await onSauvegarder(notes);
      setModifie(false);
    } finally {
      setSauvegarde(false);
    }
  };

  const compteurs = PALIERS.map((p) => ({
    ...p,
    count: Object.values(paliers).filter((v) => v === p.valeur).length,
  }));

  if (grille.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-sm">Aucun élève inscrit dans cette classe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Légende des paliers */}
      <div className="flex flex-wrap gap-2">
        {PALIERS.map((p) => (
          <span
            key={p.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${p.badgeCls}`}
          >
            <span className="font-bold">{p.label}</span>
            <span>— {p.libelle}</span>
          </span>
        ))}
      </div>

      {/* Grille élèves × paliers */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide w-52">
                Élève
              </th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-center">
                Palier d'évaluation
              </th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right w-36">
                Niveau retenu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grille.map(({ eleve }) => {
              const palierActif = getPalier(paliers[eleve.id]);
              return (
                <tr key={eleve.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-900">{eleve.nom}</span>{' '}
                    <span className="text-gray-600">{eleve.prenom}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {PALIERS.map((p) => {
                        const actif = paliers[eleve.id] === p.valeur;
                        return (
                          <button
                            key={p.label}
                            onClick={() => choisirPalier(eleve.id, p.valeur)}
                            disabled={lectureSeule}
                            title={p.libelle}
                            className={[
                              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 select-none',
                              actif ? p.btnActiveCls : p.btnInactiveCls,
                              lectureSeule ? 'cursor-default' : 'cursor-pointer',
                            ].join(' ')}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${palierActif.badgeCls}`}
                    >
                      {palierActif.libelle}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Récapitulatif + bouton sauvegarder */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {compteurs
            .filter((c) => c.count > 0)
            .map((c) => (
              <div
                key={c.label}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.badgeCls}`}
              >
                <span className="text-xs font-bold">{c.libelle}</span>
                <span className="text-sm font-bold">{c.count}</span>
              </div>
            ))}
        </div>

        {!lectureSeule && (
          <button
            onClick={handleSauvegarder}
            disabled={!modifie || sauvegarde}
            className={[
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
              modifie
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {sauvegarde ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
            {sauvegarde ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        )}
      </div>
    </div>
  );
}
