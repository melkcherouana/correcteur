# Image du back-end EvalPro avec LibreOffice (conversion fidèle des copies Word annotées en PDF)
FROM node:20-bookworm-slim

# LibreOffice Writer sans interface graphique + polices compatibles Word
# (Carlito ≈ Calibri, Caladea ≈ Cambria, Liberation ≈ Arial/Times New Roman) ;
# openssl est requis par Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer-nogui \
    fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea fonts-dejavu-core \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    LIBREOFFICE_PATH=/usr/bin/soffice

WORKDIR /app

# Dépendances, y compris celles de dev : le CLI prisma sert au postinstall
# (prisma generate) et au démarrage (prisma migrate deploy)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY src ./src

EXPOSE 3001
CMD ["npm", "start"]
