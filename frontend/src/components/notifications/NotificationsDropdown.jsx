import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api.js';

export default function NotificationsDropdown() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifs-count'],
    queryFn: () => api.get('/notifications/non-lues/count').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifs'],
    queryFn: () => api.get('/notifications', { params: { limite: 15 } }).then((r) => r.data),
    enabled: ouvert,
  });

  const invalider = () => {
    qc.invalidateQueries({ queryKey: ['notifs'] });
    qc.invalidateQueries({ queryKey: ['notifs-count'] });
  };

  const lireMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/lire`),
    onSuccess: invalider,
  });

  const lireToutMutation = useMutation({
    mutationFn: () => api.patch('/notifications/lire-tout'),
    onSuccess: invalider,
  });

  const supprimerMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: invalider,
  });

  // Fermer si clic hors du composant
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = countData?.count ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative" ref={ref}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOuvert((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Panneau déroulant */}
      {ouvert && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {count > 0 && (
              <button
                onClick={() => lireToutMutation.mutate()}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Aucune notification</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                      n.lue ? 'bg-white' : 'bg-indigo-50/50'
                    }`}
                  >
                    {/* Indicateur non-lu */}
                    <div className="mt-1 flex-shrink-0">
                      {!n.lue ? (
                        <span className="w-2 h-2 bg-indigo-500 rounded-full block" />
                      ) : (
                        <span className="w-2 h-2 block" />
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.lue ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                        {n.titre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!n.lue && (
                        <button
                          onClick={() => lireMutation.mutate(n.id)}
                          title="Marquer comme lu"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => supprimerMutation.mutate(n.id)}
                        title="Supprimer"
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
