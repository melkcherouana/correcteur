import clsx from 'clsx';
import Spinner from './Spinner.jsx';

export default function StatCard({ titre, valeur, sousTitre, icone: Icon, couleur = 'bg-indigo-500', loading = false }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{titre}</p>
        {loading ? (
          <div className="mt-2"><Spinner size="sm" /></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{valeur ?? '—'}</p>
        )}
        {sousTitre && <p className="text-xs text-gray-400 mt-1">{sousTitre}</p>}
      </div>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4', couleur)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}
