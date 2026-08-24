import anthropic from '../utils/anthropic.js';
import mammoth from 'mammoth';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

// Le modèle est défini ici pour faciliter la mise à jour
const MODELE = 'claude-sonnet-4-6';
const MODELE_V2 = 'claude-sonnet-4-6';

// ─── Helpers internes ─────────────────────────────────────────────────────────

const extraireOutil = (response) => {
  const bloc = response.content.find((b) => b.type === 'tool_use');
  if (!bloc) throw Object.assign(new Error('Réponse IA inattendue : outil non activé'), { status: 502 });
  return { resultat: bloc.input, usage: response.usage };
};

// Convertit un buffer de fichier en blocs de contenu compatibles Claude
const preparerFichier = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    return [{
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
      // Cache le PDF pour les appels successifs (utile si on retraite le même référentiel)
      cache_control: { type: 'ephemeral' },
    }];
  }
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    const { value } = await mammoth.extractRawText({ buffer });
    return [{ type: 'text', text: `[Document Word — texte extrait]\n\n${value}` }];
  }
  if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
    const wb = xlsxRead(buffer, { type: 'buffer' });
    const textes = wb.SheetNames.map((nom) => {
      const csv = xlsxUtils.sheet_to_csv(wb.Sheets[nom]);
      return `[Feuille : ${nom}]\n${csv}`;
    });
    return [{ type: 'text', text: textes.join('\n\n') }];
  }
  // Texte brut ou format non reconnu
  return [{ type: 'text', text: buffer.toString('utf-8') }];
};

// ─── 1. Extraction de compétences depuis un référentiel PDF ───────────────────

export const extraireCompetencesPDF = async (pdfBuffer) => {
  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 8096,
    system: [
      {
        type: 'text',
        text: `Tu es un expert en ingénierie de formation professionnelle française (BAC PRO, BTS, CAP, Bac Technologique).
Tu analyses des référentiels officiels du Ministère de l'Éducation Nationale pour en extraire UNIQUEMENT le référentiel de compétences.

RÈGLE ABSOLUE — À IGNORER TOTALEMENT :
- Articles de loi, arrêtés ministériels, textes réglementaires
- Modalités d'examen, d'épreuve, de certification (unités, coefficients, durées, barèmes)
- PFMP (Périodes de Formation en Milieu Professionnel) et leurs modalités
- Règlements d'examen, dispenses, équivalences, jury
- Référentiels de formation : contenus de cours, horaires, progressions pédagogiques
- Savoirs associés, connaissances théoriques (sauf si formulés comme critère observable)
- Tout texte administratif, introductif ou de cadrage qui n'est pas une compétence

CE QUE TU DOIS EXTRAIRE :
1. Les regroupements de compétences (pôles, blocs, domaines ou classes selon le référentiel)
2. Les compétences individuelles avec leur code officiel exact (C1, C1.1, CO1, P1C1, etc.)
3. Les critères observables et évaluables : indicateurs comportementaux mesurables permettant à l'enseignant de constater l'acquisition de la compétence en situation réelle ou d'évaluation

DÉTECTION DU TYPE D'ORGANISATION :
- "Pôle" dans le document → typeOrganisation = "poles"
- "Bloc de compétences" ou "Bloc" → typeOrganisation = "blocs"
- Organisation par classes (1ère Bac Pro, Terminale Bac Pro) → typeOrganisation = "classes"
- Autre organisation (domaines, axes, champs) → typeOrganisation = "domaines"

RÈGLE ABSOLUE sur les codes : recopie les codes officiels EXACTEMENT tels qu'ils apparaissent dans le document, sans modification ni normalisation.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'extraire_referentiel',
        description: 'Extrait UNIQUEMENT les pôles/blocs, compétences et critères observables évaluables. Exclut tout le reste : réglementation, examens, PFMP, savoirs associés, contenus pédagogiques.',
        input_schema: {
          type: 'object',
          properties: {
            titre: {
              type: 'string',
              description: 'Intitulé complet du diplôme (ex: Bac Pro Gestion-Administration, BTS Support à l\'Action Managériale)',
            },
            niveau: {
              type: 'string',
              description: 'Niveau du diplôme (ex: Bac Pro, BTS, CAP)',
            },
            typeOrganisation: {
              type: 'string',
              enum: ['poles', 'blocs', 'classes', 'domaines'],
              description: 'Type de regroupement détecté dans le document officiel',
            },
            poles: {
              type: 'array',
              description: 'Regroupements de compétences. Même si le document utilise "blocs" ou "classes", cette liste contient tous les regroupements.',
              items: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'Code officiel exact du regroupement (ex: Pôle 1, Bloc 1, P1, AGOrA1)',
                  },
                  titre: {
                    type: 'string',
                    description: 'Intitulé officiel exact du regroupement',
                  },
                  competences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          description: 'Code officiel exact de la compétence (ex: C1, C1.1, CO1, P1C1). Recopie-le exactement.',
                        },
                        description: {
                          type: 'string',
                          description: 'Intitulé exact de la compétence tel qu\'il figure dans le référentiel (commence généralement par un verbe d\'action)',
                        },
                        criteres: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Critères observables et évaluables de la compétence. Chaque critère doit être un indicateur comportemental mesurable (ce que l\'enseignant peut observer en situation). Ne pas inclure de savoirs théoriques non observables.',
                        },
                      },
                      required: ['code', 'description', 'criteres'],
                    },
                  },
                },
                required: ['code', 'titre', 'competences'],
              },
            },
            totalCompetences: {
              type: 'number',
              description: 'Nombre total de compétences extraites',
            },
            observations: {
              type: 'string',
              description: 'Notes sur la structure détectée, les ambiguïtés rencontrées, ou les éléments délibérément non extraits avec la raison',
            },
          },
          required: ['titre', 'poles', 'typeOrganisation'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extraire_referentiel' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Analyse ce référentiel officiel et extrais UNIQUEMENT :
1. Les pôles/blocs/domaines de compétences avec leur code et titre officiels exacts
2. Pour chaque pôle : toutes les compétences avec leur code officiel exact
3. Pour chaque compétence : ses critères observables et évaluables (ce que l'enseignant peut constater en classe ou en évaluation)

À NE PAS extraire : articles de loi, modalités d'examen, PFMP, savoirs associés purement théoriques, contenus de cours, horaires, coefficients.
Conserve les codes officiels EXACTEMENT tels qu'ils apparaissent dans le document sans les modifier.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 2. Correction automatique d'un devoir avec grille d'évaluation ───────────

export const corrigerDevoir = async (fileBuffer, mimeType, grille) => {
  const contenuFichier = await preparerFichier(fileBuffer, mimeType);

  const grilleFormatee = grille.criteres
    .map((c, i) => `${i + 1}. ${c.nom} — ${c.description} (barème : ${c.noteMax} pts)`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 6000,
    system: [
      {
        type: 'text',
        text: `Tu es un enseignant expérimenté en lycée professionnel. Tu corriges des travaux d'élèves avec bienveillance, rigueur et objectivité.
Tu justifies chaque note par des observations précises extraites du travail.
Tu ne notes que ce qui est présent ou absent dans le document fourni — tu n'inventes pas de contenu.
Tes retours sont constructifs : tu soulignes les réussites avant les améliorations possibles.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'corriger_travail',
        description: 'Évalue un travail d\'élève critère par critère',
        input_schema: {
          type: 'object',
          properties: {
            noteGlobale: { type: 'number', description: 'Somme des points obtenus' },
            noteMax: { type: 'number', description: 'Note maximale possible' },
            mention: {
              type: 'string',
              enum: ['Insuffisant', 'Passable', 'Assez Bien', 'Bien', 'Très Bien'],
            },
            appreciationGenerale: { type: 'string', description: 'Appréciation synthétique du travail (3-5 phrases)' },
            criteres: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  noteObtenue: { type: 'number' },
                  noteMax: { type: 'number' },
                  justification: { type: 'string', description: 'Argument factuel tiré du travail' },
                  pointsForts: { type: 'array', items: { type: 'string' } },
                  pointsAmeliorer: { type: 'array', items: { type: 'string' } },
                },
                required: ['nom', 'noteObtenue', 'noteMax', 'justification'],
              },
            },
            competencesIdentifiees: {
              type: 'array',
              items: { type: 'string' },
              description: 'Compétences démontrées dans le travail',
            },
            conseilsPrioritaires: {
              type: 'array',
              items: { type: 'string' },
              description: 'Les 3 axes de progrès les plus importants',
              maxItems: 3,
            },
          },
          required: ['noteGlobale', 'noteMax', 'criteres', 'appreciationGenerale'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'corriger_travail' },
    messages: [
      {
        role: 'user',
        content: [
          ...contenuFichier,
          {
            type: 'text',
            text: `Évalue ce travail en appliquant strictement la grille suivante :\n\n${grilleFormatee}\n\nNote maximale totale : ${grille.noteMax} points.\n\nJustifie chaque note par des éléments précis du document.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 3. Génération de questions d'entretien ───────────────────────────────────

export const genererQuestionsEntretien = async ({ contenuTravail, contexte = {} }) => {
  const { filiere = '', matiere = '', niveau = '', nbQuestions = 8 } = contexte;

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 3000,
    system: [
      {
        type: 'text',
        text: `Tu es un enseignant en lycée professionnel (filière : ${filiere || 'non précisée'}).
Tu prépares un entretien oral pour évaluer la compréhension et le recul critique d'un élève sur son travail rendu.
Tes questions couvrent progressivement les niveaux de la taxonomie de Bloom :
1. Mémorisation (rappel factuel)
2. Compréhension (reformulation)
3. Application (mise en situation)
4. Analyse (décomposition, liens)
5. Évaluation / Création (jugement, proposition)
Les questions doivent être ancrées dans le contexte professionnel réel de la filière.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_questions_entretien',
        description: 'Génère des questions d\'entretien oral progressives',
        input_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              minItems: 5,
              maxItems: 12,
              items: {
                type: 'object',
                properties: {
                  numero: { type: 'number' },
                  question: { type: 'string' },
                  niveauBloom: {
                    type: 'string',
                    enum: ['memorisation', 'comprehension', 'application', 'analyse', 'evaluation_creation'],
                  },
                  elementsReponseAttendus: {
                    type: 'string',
                    description: 'Ce que l\'enseignant attend comme réponse complète',
                  },
                  indicateursReussitePartielle: {
                    type: 'string',
                    description: 'Éléments minimaux acceptables pour une réponse partielle',
                  },
                  competenceCiblee: { type: 'string' },
                  dureeEstimeeMinutes: { type: 'number' },
                },
                required: ['numero', 'question', 'niveauBloom', 'elementsReponseAttendus'],
              },
            },
            dureeTotaleMinutes: { type: 'number' },
            conseilsConduite: { type: 'string', description: 'Conseils pour mener l\'entretien efficacement' },
            alertes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Points du travail à approfondir en priorité lors de l\'entretien',
            },
          },
          required: ['questions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_questions_entretien' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Matière : ${matiere || 'non précisée'} — Niveau : ${niveau || 'non précisé'}\n\nTravail rendu par l'élève :\n\n${contenuTravail}\n\nGénère ${nbQuestions} questions d'entretien progressives (Bloom) en lien direct avec ce travail.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 4. Génération de scénarios professionnels ────────────────────────────────

export const genererScenarioProfessionnel = async ({
  filiere,
  matiere,
  niveau,
  competences,
  dureeMinutes = 60,
  contexteEntreprise,
}) => {
  const listeCompetences = competences
    .map((c) => `- [${c.code}] ${c.description}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: `Tu es un expert en ingénierie pédagogique professionnelle spécialisé dans la filière ${filiere}.
Tu conçois des situations d'évaluation (PFMP, CCF, chef-d'œuvre) réalistes et mobilisatrices.
Tes scénarios s'ancrent dans des contextes d'entreprise vraisemblables, avec des contraintes réelles.
Le scénario doit permettre d'observer directement les compétences ciblées sans ambiguïté.
La complexité est adaptée au niveau ${niveau || 'lycée professionnel'}.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_scenario',
        description: 'Génère un scénario professionnel complet pour évaluation',
        input_schema: {
          type: 'object',
          properties: {
            titre: { type: 'string' },
            entreprise: {
              type: 'object',
              properties: {
                nom: { type: 'string' },
                secteur: { type: 'string' },
                description: { type: 'string' },
                contact: { type: 'string', description: 'Nom du responsable fictif' },
              },
              required: ['nom', 'secteur', 'description'],
            },
            missionPrincipale: { type: 'string', description: 'Description de la mission confiée à l\'élève' },
            roleEleve: { type: 'string', description: 'Intitulé de poste fictif de l\'élève' },
            declencheur: { type: 'string', description: 'Événement ou problème qui déclenche la situation' },
            taches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  numero: { type: 'number' },
                  intitule: { type: 'string' },
                  description: { type: 'string' },
                  ressourcesFournies: { type: 'array', items: { type: 'string' } },
                  livrableAttendu: { type: 'string' },
                  competencesMobilisees: { type: 'array', items: { type: 'string' } },
                  dureeMinutes: { type: 'number' },
                  criteresDEvaluation: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        critere: { type: 'string' },
                        baremePoints: { type: 'number' },
                        indicateursReussite: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['critere', 'baremePoints'],
                    },
                  },
                },
                required: ['numero', 'intitule', 'description', 'livrableAttendu', 'competencesMobilisees'],
              },
            },
            noteMaximale: { type: 'number' },
            niveauDifficulte: { type: 'string', enum: ['accessible', 'intermediaire', 'expert'] },
            prerequis: { type: 'array', items: { type: 'string' } },
            documentsACreer: {
              type: 'array',
              items: { type: 'string' },
              description: 'Liste des documents supports à préparer par l\'enseignant',
            },
          },
          required: ['titre', 'entreprise', 'missionPrincipale', 'taches'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_scenario' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Filière : ${filiere} — Matière : ${matiere} — Niveau : ${niveau}
Durée totale : ${dureeMinutes} minutes
${contexteEntreprise ? `Contexte d'entreprise souhaité : ${contexteEntreprise}\n` : ''}
Compétences à mobiliser dans le scénario :
${listeCompetences}

Conçois un scénario professionnel réaliste, contextualisé et directement évaluable.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 5. Génération du dossier complet (situation pro + annexes) ───────────────

export const genererDossierComplet = async ({ filiere, matiere, niveau, competences, dureeMinutes = 120, contexteEntreprise }) => {
  const listeComp = (competences ?? []).map((c) => `- [${c.code}] ${c.description}`).join('\n');

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text: `Tu es un concepteur expert de sujets d'examen professionnels pour lycée professionnel.
Tu crées des dossiers de situation professionnelle complets, réalistes et prêts à l'emploi.

RÈGLE ABSOLUE : CHAQUE document et CHAQUE annexe doit être directement lié aux compétences listées.
- Si la compétence est "Recevoir les réclamations" → le scénario est une réclamation client, les documents sont la facture contestée et le bon de livraison litigieux.
- Si la compétence est "Réceptionner des marchandises" → le scénario est une réception, le BL est le document central.
- Si la compétence est "Passer des commandes" → le scénario est une commande fournisseur, le bon de commande est central.
- Si la compétence est "Mettre en rayon / gérer le stock" → la fiche de stock est l'outil principal.
Le candidat doit EXERCER les compétences listées en complétant les annexes, pas faire des calculs génériques.

Les données (noms, prix, références, adresses, SIRET) sont fictives mais cohérentes avec le secteur.
Les cases à null dans les annexes sont les champs que le candidat doit remplir.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_dossier',
        description: 'Génère un dossier de situation professionnelle complet avec documents et annexes',
        input_schema: {
          type: 'object',
          required: ['titre', 'entreprise', 'misEnSituation', 'taches', 'documents', 'annexes'],
          properties: {
            titre: { type: 'string' },
            dureeMinutes: { type: 'number' },
            baremeTotal: { type: 'number' },
            contexte: { type: 'string', description: 'Présentation de l\'entreprise et du secteur (3-4 phrases)' },
            misEnSituation: { type: 'string', description: 'Description du rôle de l\'élève et de la situation déclenchante (2-3 phrases)' },
            entreprise: {
              type: 'object',
              required: ['nom', 'adresse', 'codePostal', 'ville', 'tel', 'email', 'siret', 'activite'],
              properties: {
                nom: { type: 'string' },
                adresse: { type: 'string' },
                codePostal: { type: 'string' },
                ville: { type: 'string' },
                tel: { type: 'string' },
                email: { type: 'string' },
                siret: { type: 'string' },
                activite: { type: 'string' },
                responsable: { type: 'string', description: 'Nom du supérieur hiérarchique fictif' },
              },
            },
            taches: {
              type: 'array',
              items: {
                type: 'object',
                required: ['numero', 'intitule', 'points', 'annexe'],
                properties: {
                  numero: { type: 'number' },
                  intitule: { type: 'string' },
                  points: { type: 'number' },
                  annexe: { type: 'number', description: 'Numéro de l\'annexe correspondante' },
                },
              },
            },
            documents: {
              type: 'array',
              description: 'Documents de référence à lire (2 maximum)',
              items: {
                type: 'object',
                required: ['numero', 'type', 'titre'],
                properties: {
                  numero: { type: 'number' },
                  type: { type: 'string', enum: ['catalogue', 'bon_commande_client', 'correspondance', 'fiche_client'] },
                  titre: { type: 'string' },
                  // Pour catalogue
                  articles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        reference: { type: 'string' },
                        designation: { type: 'string' },
                        unite: { type: 'string' },
                        prixHT: { type: 'number' },
                        conditionnement: { type: 'string' },
                      },
                    },
                  },
                  // Pour correspondance / bon commande
                  expediteur: { type: 'string' },
                  destinataire: { type: 'string' },
                  date: { type: 'string' },
                  objet: { type: 'string' },
                  corps: { type: 'string', description: 'Texte de la correspondance ou contenu du bon de commande' },
                  lignes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        reference: { type: 'string' },
                        designation: { type: 'string' },
                        quantite: { type: 'number' },
                        unite: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            annexes: {
              type: 'array',
              description: 'Annexes à compléter par le candidat (2 à 3)',
              items: {
                type: 'object',
                required: ['numero', 'type', 'titre', 'consigne', 'points'],
                properties: {
                  numero: { type: 'number' },
                  type: { type: 'string', enum: ['facture', 'fiche_stock', 'bon_livraison'] },
                  titre: { type: 'string' },
                  consigne: { type: 'string', description: 'Instruction précise pour le candidat' },
                  points: { type: 'number' },

                  // ── FACTURE ──────────────────────────────────────
                  numeroDoc: { type: 'string' },
                  dateDoc: { type: 'string' },
                  emetteur: {
                    type: 'object',
                    properties: {
                      raisonSociale: { type: 'string' }, adresse: { type: 'string' },
                      codePostal: { type: 'string' }, ville: { type: 'string' },
                      siret: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string' },
                    },
                  },
                  client: {
                    type: 'object',
                    properties: {
                      raisonSociale: { type: 'string' }, adresse: { type: 'string' },
                      codePostal: { type: 'string' }, ville: { type: 'string' }, contact: { type: 'string' },
                    },
                  },
                  lignesFacture: {
                    type: 'array',
                    description: 'Lignes de la facture. totalHT = null signifie que le candidat doit calculer.',
                    items: {
                      type: 'object',
                      properties: {
                        reference: { type: 'string' },
                        designation: { type: 'string' },
                        quantite: { type: 'number' },
                        unite: { type: 'string' },
                        prixUHT: { type: 'number' },
                        remisePct: { type: 'number' },
                        totalHT: { type: 'number', description: 'null = à calculer par le candidat' },
                      },
                    },
                  },
                  tauxTVA: { type: 'number' },

                  // ── FICHE DE STOCK ────────────────────────────────
                  articleStock: {
                    type: 'object',
                    properties: {
                      reference: { type: 'string' }, designation: { type: 'string' },
                      unite: { type: 'string' }, stockMinimum: { type: 'number' },
                      prixUnitaireHT: { type: 'number' },
                    },
                  },
                  mouvements: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        libelle: { type: 'string' },
                        typeOp: { type: 'string', enum: ['SI', 'E', 'S'] },
                        entree: { type: 'number' },
                        sortie: { type: 'number' },
                        solde: { type: 'number', description: 'null = à calculer par le candidat' },
                        aCompleter: { type: 'boolean' },
                      },
                    },
                  },

                  // ── BON DE LIVRAISON ──────────────────────────────
                  fournisseur: {
                    type: 'object',
                    properties: {
                      raisonSociale: { type: 'string' }, adresse: { type: 'string' },
                      codePostal: { type: 'string' }, ville: { type: 'string' },
                    },
                  },
                  lignesBL: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        reference: { type: 'string' },
                        designation: { type: 'string' },
                        quantiteCommandee: { type: 'number' },
                        quantiteLivree: { type: 'number', description: 'null = à compléter par le candidat' },
                        anomalie: { type: 'string', description: 'null = à compléter si nécessaire' },
                        aCompleter: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_dossier' },
    messages: [
      {
        role: 'user',
        content: `Filière : ${filiere || '(à déduire des compétences)'} — Matière : ${matiere || '(à déduire des compétences)'} — Niveau : ${niveau ?? 'BAC PRO'}
Durée : ${dureeMinutes} minutes${contexteEntreprise ? `\nContexte souhaité : ${contexteEntreprise}` : ''}

${listeComp ? `COMPÉTENCES À ÉVALUER (le dossier doit permettre d'observer exactement ces compétences) :\n${listeComp}` : ''}

CONSIGNES DE GÉNÉRATION :
1. Lis attentivement les compétences. Construis un scénario qui NÉCESSITE d'exercer ces compétences précises.
2. Les 2 documents à lire doivent être les pièces que le candidat consulte pour accomplir la tâche (ex : facture litigieuse, bon de commande à vérifier, état de stock, tarif fournisseur…). Choisis les types de documents les plus cohérents avec les compétences.
3. Les 3 annexes à compléter (facture, fiche_stock, bon_livraison) doivent être les outils que le candidat remplit EN EXERÇANT les compétences listées. Le contenu (articles, références, montants, mouvements) doit être directement issu du scénario.
   - Annexe facture : peut être un avoir, une facture de remplacement, une facture d'intervention selon le scénario.
   - Annexe fiche_stock : les articles doivent être ceux du scénario (pas du papier bureautique si le scénario est électrique).
   - Annexe bon_livraison : doit être la livraison ou le retour en lien direct avec l'action principale.
4. Tous les champs à compléter par le candidat = null dans le JSON.`,
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 6. Génération de documents commerciaux ──────────────────────────────────

export const genererDocumentsCommerciaux = async ({ scenario }) => {
  const ctx = [
    scenario.entreprise?.nom && `Entreprise : ${scenario.entreprise.nom} (${scenario.entreprise.secteur})`,
    scenario.entreprise?.description,
    scenario.missionPrincipale && `Mission : ${scenario.missionPrincipale}`,
    scenario.roleEleve && `Rôle de l'élève : ${scenario.roleEleve}`,
    scenario.taches?.length && `Tâches : ${scenario.taches.map((t) => t.intitule).join(', ')}`,
  ].filter(Boolean).join('\n');

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: `Tu es un expert en gestion commerciale et administrative d'entreprise.
Tu génères des documents commerciaux fictifs mais parfaitement réalistes pour des exercices pédagogiques de lycée professionnel.
Les données (noms, adresses, SIRET, montants) sont inventées mais cohérentes. Les documents doivent correspondre exactement au contexte du scénario fourni.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_documents',
        description: 'Génère 2 à 3 documents commerciaux fictifs en lien avec le scénario',
        input_schema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              minItems: 2,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['facture', 'devis', 'bon_de_commande', 'bon_de_livraison', 'bon_de_retour'],
                  },
                  numero: { type: 'string', description: 'Ex: FAC-2024-0142' },
                  date: { type: 'string', description: 'Ex: 15 mars 2024' },
                  objet: { type: 'string' },
                  emetteur: {
                    type: 'object',
                    properties: {
                      raisonSociale: { type: 'string' },
                      adresse: { type: 'string' },
                      codePostal: { type: 'string' },
                      ville: { type: 'string' },
                      siret: { type: 'string' },
                      tel: { type: 'string' },
                      email: { type: 'string' },
                    },
                    required: ['raisonSociale', 'adresse', 'codePostal', 'ville'],
                  },
                  destinataire: {
                    type: 'object',
                    properties: {
                      raisonSociale: { type: 'string' },
                      adresse: { type: 'string' },
                      codePostal: { type: 'string' },
                      ville: { type: 'string' },
                      contact: { type: 'string' },
                    },
                    required: ['raisonSociale', 'adresse', 'codePostal', 'ville'],
                  },
                  lignes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        reference: { type: 'string' },
                        designation: { type: 'string' },
                        quantite: { type: 'number' },
                        unite: { type: 'string', description: 'Ex: pce, h, m², kg' },
                        prixUnitaireHT: { type: 'number' },
                        totalHT: { type: 'number' },
                      },
                      required: ['designation', 'quantite', 'prixUnitaireHT', 'totalHT'],
                    },
                  },
                  totalHT: { type: 'number' },
                  tauxTVA: { type: 'number', description: 'En pourcentage, ex: 20' },
                  totalTVA: { type: 'number' },
                  totalTTC: { type: 'number' },
                  conditions: { type: 'string', description: 'Conditions de paiement ou de livraison' },
                  notes: { type: 'string' },
                },
                required: ['type', 'numero', 'date', 'objet', 'emetteur', 'destinataire', 'lignes', 'totalHT', 'tauxTVA', 'totalTVA', 'totalTTC'],
              },
            },
          },
          required: ['documents'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_documents' },
    messages: [
      {
        role: 'user',
        content: `Contexte du scénario pédagogique :\n${ctx}\n\nGénère 2 à 3 documents commerciaux fictifs réalistes que l'élève devra analyser ou compléter dans ce scénario.`,
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 6. Génération de commentaires de bulletin ────────────────────────────────

const INSTRUCTIONS_TONALITE = {
  bienveillant: 'Valorise les efforts et les progrès. Ouvre des perspectives positives et motivantes. Reste dans l\'encouragement même face aux lacunes.',
  neutre: 'Sois factuel et équilibré. Donne le même poids aux points positifs et aux axes de progrès. Adopte un ton professionnel et mesuré.',
  exigeant: 'Souligne sans détour les insuffisances tout en reconnaissant les acquis. Fixe des exigences claires pour la suite. Reste respectueux et constructif.',
};

export const genererCommentaireBulletin = async ({
  eleve,
  moyenneGenerale,
  notes = [],
  competences = [],
  comportement,
  tonalite = 'bienveillant',
  trimestre = 1,
}) => {
  const notesTexte = notes
    .map((n) => `• ${n.matiere} : ${n.moyenne}/20 (coeff. ${n.coefficient ?? 1})`)
    .join('\n');

  const competencesTexte = competences
    .map((c) => `• [${c.niveau}] ${c.code} — ${c.description}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: `Tu es un enseignant en lycée professionnel qui rédige les commentaires du conseil de classe.
Tes commentaires respectent ces règles absolues :
— Personnalisés : jamais de phrase générique copiable pour n'importe quel élève
— Précis : appuie-toi sur les données chiffrées et les compétences fournies
— Concis : 2 à 4 phrases maximum
— Bienveillants dans la forme même quand le fond est critique
— En français soutenu, sans fautes, sans jargon excessif
— Jamais stigmatisants, jamais offensants
Tonalité demandée : ${INSTRUCTIONS_TONALITE[tonalite] ?? INSTRUCTIONS_TONALITE.bienveillant}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'rediger_commentaire_bulletin',
        description: 'Rédige un commentaire de bulletin scolaire personnalisé',
        input_schema: {
          type: 'object',
          properties: {
            commentaire: {
              type: 'string',
              description: 'Commentaire final prêt à imprimer dans le bulletin (2-4 phrases)',
            },
            pointsForts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Points positifs identifiés ce trimestre',
              maxItems: 3,
            },
            axesProgres: {
              type: 'array',
              items: { type: 'string' },
              description: 'Axes de travail prioritaires',
              maxItems: 3,
            },
            objectifProchainTrimestre: {
              type: 'string',
              description: 'Un objectif concret et mesurable pour le prochain trimestre',
            },
            alertePedagogique: {
              type: 'boolean',
              description: 'True si l\'élève nécessite un suivi pédagogique particulier',
            },
          },
          required: ['commentaire', 'pointsForts', 'axesProgres'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'rediger_commentaire_bulletin' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Élève : ${eleve.prenom} ${eleve.nom} — ${eleve.classe ?? ''}
Trimestre : ${trimestre}
Moyenne générale : ${moyenneGenerale}/20

Notes par matière :
${notesTexte || 'Non renseignées'}

Niveaux de compétences :
${competencesTexte || 'Non renseignées'}

Comportement / Assiduité : ${comportement || 'Non renseigné'}

Rédige un commentaire de bulletin adapté à cet élève.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 6. Détection des compétences fragiles ────────────────────────────────────

export const detecterCompetencesFragiles = async ({
  eleve,
  notes = [],
  competencesEleve = [],
  historiquesNotes = [],
}) => {
  const notesTexte = notes
    .map(
      (n) =>
        `• ${n.evaluation?.titre ?? 'Évaluation'} (${n.evaluation?.type ?? ''}) — ${n.valeur ?? 'ABS'}/${n.evaluation?.noteMax ?? 20}`
    )
    .join('\n');

  const competencesTexte = competencesEleve
    .map((ce) => `• [${ce.niveau}] ${ce.competence?.code ?? ''} — ${ce.competence?.description ?? ''}`)
    .join('\n');

  const historiquesTexte = historiquesNotes.length
    ? historiquesNotes
        .map((h) => `• ${h.motif} : ${h.ancienneNote ?? 'ABS'} → ${h.nouvelleNote ?? 'ABS'}`)
        .join('\n')
    : null;

  const response = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: `Tu es un conseiller pédagogique expert en analyse des parcours d'apprentissage en lycée professionnel.
Tu identifies les compétences fragiles avec nuance en croisant les données de notes et les niveaux de compétences déclarés.
Ton analyse est :
— Factuelle : fondée uniquement sur les données fournies, sans extrapolation
— Graduée : tu distingues fragilité légère (contexte, fatigue), modérée (lacune identifiée), sévère (remediations urgentes)
— Actionnable : chaque fragilité identifiée est accompagnée de remediations concrètes avec un responsable et un délai
— Bienveillante : tu formules les fragilités comme des "axes de renforcement" et les forces comme des "appuis pédagogiques"`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'analyser_profil_eleve',
        description: 'Analyse les compétences fragiles et le profil pédagogique d\'un élève',
        input_schema: {
          type: 'object',
          properties: {
            niveauGlobal: {
              type: 'string',
              enum: ['en_difficulte', 'fragile', 'satisfaisant', 'solide', 'excellent'],
            },
            syntheseNarrative: {
              type: 'string',
              description: 'Analyse narrative du profil de l\'élève (4-6 phrases)',
            },
            prioriteIntervention: {
              type: 'string',
              enum: ['aucune', 'normale', 'urgente'],
              description: 'Niveau d\'urgence d\'une intervention pédagogique',
            },
            competencesFragiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  description: { type: 'string' },
                  niveauActuel: { type: 'string' },
                  severite: { type: 'string', enum: ['leger', 'modere', 'severe'] },
                  signesObserves: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Indicateurs concrets tirés des données',
                  },
                  remediations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        responsable: {
                          type: 'string',
                          enum: ['eleve', 'enseignant', 'equipe_pedagogique', 'famille', 'etablissement'],
                        },
                        delai: { type: 'string', description: 'Ex: avant la fin du trimestre, sous 2 semaines' },
                        ressource: { type: 'string', description: 'Ressource ou outil suggéré (optionnel)' },
                      },
                      required: ['action', 'responsable', 'delai'],
                    },
                  },
                },
                required: ['code', 'description', 'severite', 'signesObserves', 'remediations'],
              },
            },
            competencesAppui: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  description: { type: 'string' },
                  commentaire: { type: 'string', description: 'Pourquoi cette compétence est un appui solide' },
                },
              },
              description: 'Compétences maîtrisées pouvant servir d\'appui pédagogique',
            },
            dispositifSuiviRecommande: {
              type: 'string',
              description: 'Dispositif de suivi recommandé : GPDS, PAP, tutorat, remédiation en groupe…',
            },
          },
          required: ['niveauGlobal', 'syntheseNarrative', 'prioriteIntervention', 'competencesFragiles'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'analyser_profil_eleve' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyse le profil pédagogique de cet élève et identifie ses compétences fragiles.

Élève : ${eleve.prenom} ${eleve.nom}${eleve.classe ? ` — ${eleve.classe}` : ''}

Résultats aux évaluations :
${notesTexte || 'Aucune note disponible'}

Niveaux de compétences déclarés :
${competencesTexte || 'Aucune compétence renseignée'}
${historiquesTexte ? `\nHistorique des corrections de notes :\n${historiquesTexte}` : ''}

Identifie les compétences fragiles avec leur sévérité et propose des remediations concrètes.`,
          },
        ],
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 7. Génération de cours complet ──────────────────────────────────────────

export const genererCours = async ({ competence, contexte = {} }) => {
  const { filiere = '', niveau = 'BAC PRO', dureeHeures = 2 } = contexte;

  const response = await anthropic.messages.create({
    model: MODELE_V2,
    max_tokens: 6000,
    system: [
      {
        type: 'text',
        text: `Tu es un enseignant expert en lycée professionnel${filiere ? ` (filière : ${filiere})` : ''}, niveau ${niveau}.
Tu conçois des cours structurés, progressifs et directement utilisables en classe sans modification.
Chaque partie contient du contenu clair, des exemples tirés du terrain professionnel, et une activité pratique.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_cours',
        description: 'Génère un cours structuré et complet à partir d\'une compétence professionnelle',
        input_schema: {
          type: 'object',
          required: ['titre', 'objectifsPedagogiques', 'plan', 'contenuStructure'],
          properties: {
            titre: { type: 'string' },
            dureeEstimeeHeures: { type: 'number' },
            prerequis: { type: 'array', items: { type: 'string' } },
            objectifsPedagogiques: { type: 'array', items: { type: 'string' } },
            introduction: { type: 'string' },
            plan: {
              type: 'array',
              items: {
                type: 'object',
                required: ['numero', 'titre'],
                properties: {
                  numero: { type: 'number' },
                  titre: { type: 'string' },
                  dureeMinutes: { type: 'number' },
                },
              },
            },
            contenuStructure: {
              type: 'array',
              items: {
                type: 'object',
                required: ['numero', 'titre', 'contenu'],
                properties: {
                  numero: { type: 'number' },
                  titre: { type: 'string' },
                  contenu: { type: 'string' },
                  exemplesConcrets: { type: 'array', items: { type: 'string' } },
                  activite: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['exercice', 'mise_en_situation', 'qcm', 'production', 'observation'] },
                      consigne: { type: 'string' },
                      dureeMinutes: { type: 'number' },
                    },
                  },
                  pointsCles: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            evaluationFormative: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                questions: { type: 'array', items: { type: 'string' } },
              },
            },
            ressourcesComplementaires: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_cours' },
    messages: [
      {
        role: 'user',
        content: `Compétence à enseigner :
Code : ${competence.code}
Description : ${competence.description}
${competence.criteres?.length ? `\nCritères d'évaluation :\n${competence.criteres.map((c) => `- ${c.description}`).join('\n')}` : ''}
${filiere ? `\nFilière : ${filiere}` : ''}
Niveau : ${niveau} — Durée : ${dureeHeures}h

Conçois un cours complet, structuré et directement utilisable en classe.`,
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 8. Génération de support de travail ─────────────────────────────────────

export const genererSupportTravail = async ({ competence, contexte = {} }) => {
  const { filiere = '', niveau = 'BAC PRO', typeSouhaite = 'situation_professionnelle' } = contexte;

  const response = await anthropic.messages.create({
    model: MODELE_V2,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: `Tu es un concepteur pédagogique expert en lycée professionnel${filiere ? ` (filière : ${filiere})` : ''}.
Tu crées des supports de travail pratiques, clés en main, distribuables immédiatement aux élèves.
Le support permet d'observer et d'évaluer directement la compétence ciblée dans un contexte professionnel réaliste.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_support',
        description: 'Génère un support de travail complet avec corrigé',
        input_schema: {
          type: 'object',
          required: ['titre', 'type', 'contexte', 'travailDemande', 'elementsDeCorrection'],
          properties: {
            titre: { type: 'string' },
            type: {
              type: 'string',
              enum: ['exercice_application', 'situation_professionnelle', 'etude_de_cas', 'travaux_pratiques', 'mise_en_situation'],
            },
            dureeMinutes: { type: 'number' },
            niveauDifficulte: { type: 'string', enum: ['decouverte', 'application', 'approfondissement'] },
            contexte: { type: 'string' },
            documentsSupport: {
              type: 'array',
              items: {
                type: 'object',
                required: ['titre', 'contenu'],
                properties: { titre: { type: 'string' }, contenu: { type: 'string' } },
              },
            },
            travailDemande: {
              type: 'array',
              items: {
                type: 'object',
                required: ['numero', 'question', 'points'],
                properties: {
                  numero: { type: 'number' },
                  question: { type: 'string' },
                  points: { type: 'number' },
                  competenceCiblee: { type: 'string' },
                  indicateursReussite: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            elementsDeCorrection: {
              type: 'array',
              items: {
                type: 'object',
                required: ['numero', 'reponseAttendue'],
                properties: {
                  numero: { type: 'number' },
                  reponseAttendue: { type: 'string' },
                  criteresDAttribution: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            noteMax: { type: 'number' },
            conseilsPedagogiques: { type: 'string' },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_support' },
    messages: [
      {
        role: 'user',
        content: `Compétence ciblée :
Code : ${competence.code}
Description : ${competence.description}
${competence.criteres?.length ? `\nCritères :\n${competence.criteres.map((c) => `- ${c.description}`).join('\n')}` : ''}
${filiere ? `\nFilière : ${filiere}` : ''}
Niveau : ${niveau} — Type : ${typeSouhaite}

Génère un support de travail complet avec corrigé.`,
      },
    ],
  });

  return extraireOutil(response);
};

// ─── 9. Appréciation et remédiation après correction ─────────────────────────

export const genererAppreciationRemediation = async ({
  eleve,
  noteObtenue,
  noteMax,
  competences = [],
  commentaireCorrecteur = '',
}) => {
  const pourcentage = Math.round((noteObtenue / noteMax) * 100);
  const competencesTexte = competences.length
    ? competences.map((c) => `- [${c.niveau ?? 'non évalué'}] ${c.code} — ${c.description}`).join('\n')
    : 'Non précisées';

  const response = await anthropic.messages.create({
    model: MODELE_V2,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: `Tu es un enseignant bienveillant en lycée professionnel.
Tu rédiges des appréciations personnalisées et des plans de remédiation concrets et réalistes.
Ton appréciation valorise toujours ce qui fonctionne avant de pointer les axes de progrès.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generer_appreciation',
        description: 'Génère une appréciation et un plan de remédiation personnalisés',
        input_schema: {
          type: 'object',
          required: ['appreciation', 'niveauReussite', 'pointsForts', 'axesProgres', 'remediations'],
          properties: {
            appreciation: { type: 'string' },
            niveauReussite: {
              type: 'string',
              enum: ['insuffisant', 'en_voie', 'acquis', 'depasse'],
            },
            pointsForts: { type: 'array', items: { type: 'string' }, maxItems: 3 },
            axesProgres: { type: 'array', items: { type: 'string' }, maxItems: 3 },
            remediations: {
              type: 'array',
              items: {
                type: 'object',
                required: ['competence', 'difficulteIdentifiee', 'action', 'delai', 'responsable'],
                properties: {
                  competence: { type: 'string' },
                  difficulteIdentifiee: { type: 'string' },
                  action: { type: 'string' },
                  ressource: { type: 'string' },
                  delai: { type: 'string' },
                  responsable: { type: 'string', enum: ['eleve', 'enseignant', 'tuteur'] },
                },
              },
            },
            objectifSuivant: { type: 'string' },
            encouragement: { type: 'string' },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generer_appreciation' },
    messages: [
      {
        role: 'user',
        content: `Élève : ${eleve?.prenom ?? ''} ${eleve?.nom ?? ''}
Note : ${noteObtenue}/${noteMax} (${pourcentage}%)
${commentaireCorrecteur ? `\nObservations de l'enseignant :\n${commentaireCorrecteur}` : ''}

Compétences évaluées :
${competencesTexte}

Génère une appréciation personnalisée et un plan de remédiation adapté.`,
      },
    ],
  });

  return extraireOutil(response);
};
