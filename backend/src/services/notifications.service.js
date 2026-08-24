import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

// ─── Créer une notification (usage interne) ──────────────────────────────────

export const creerNotification = (userId, titre, message) =>
  prisma.notification.create({ data: { userId, titre, message } });

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const listerNotifications = async (userId, { lue, page = 1, limite = 20 } = {}) => {
  const where = {
    userId,
    ...(lue !== undefined && { lue: lue === 'true' || lue === true }),
  };

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limite,
      take: limite,
    }),
  ]);

  return { notifications, total, page, pages: Math.ceil(total / limite) };
};

export const compterNonLues = (userId) =>
  prisma.notification.count({ where: { userId, lue: false } });

// ─── Actions ──────────────────────────────────────────────────────────────────

export const marquerLue = async (id, userId) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw erreur('Notification introuvable', 404);
  if (notif.userId !== userId) throw erreur('Accès refusé', 403);

  return prisma.notification.update({
    where: { id },
    data: { lue: true, lueAt: new Date() },
  });
};

export const marquerToutesLues = async (userId) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, lue: false },
    data: { lue: true, lueAt: new Date() },
  });
  return { mises_a_jour: count };
};

export const supprimerNotification = async (id, userId) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw erreur('Notification introuvable', 404);
  if (notif.userId !== userId) throw erreur('Accès refusé', 403);
  await prisma.notification.delete({ where: { id } });
};
