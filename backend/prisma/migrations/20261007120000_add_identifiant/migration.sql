-- Identifiant de connexion court (prenom.nom) ; l'email devient optionnel
ALTER TABLE "utilisateurs" ADD COLUMN "identifiant" TEXT;
ALTER TABLE "utilisateurs" ALTER COLUMN "email" DROP NOT NULL;

-- Génère l'identifiant des comptes existants : minuscules, sans accents,
-- sans espaces ni caractères spéciaux ; en cas d'homonymes, suffixe 2, 3…
-- par ordre de création (même règle que src/utils/identifiant.js)
WITH normalise AS (
  SELECT
    "id",
    "createdAt",
    regexp_replace(
      translate(
        replace(replace(replace(lower("prenom"), 'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss'),
        'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'
      ),
      '[^a-z0-9]', '', 'g'
    ) AS p,
    regexp_replace(
      translate(
        replace(replace(replace(lower("nom"), 'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss'),
        'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'
      ),
      '[^a-z0-9]', '', 'g'
    ) AS n
  FROM "utilisateurs"
),
base AS (
  SELECT
    "id",
    "createdAt",
    COALESCE(NULLIF(p, ''), 'utilisateur') || '.' || COALESCE(NULLIF(n, ''), 'utilisateur') AS b
  FROM normalise
),
numerote AS (
  SELECT "id", b, row_number() OVER (PARTITION BY b ORDER BY "createdAt", "id") AS rang
  FROM base
)
UPDATE "utilisateurs" u
SET "identifiant" = CASE WHEN numerote.rang = 1 THEN numerote.b ELSE numerote.b || numerote.rang END
FROM numerote
WHERE u."id" = numerote."id";

ALTER TABLE "utilisateurs" ALTER COLUMN "identifiant" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_identifiant_key" ON "utilisateurs"("identifiant");
