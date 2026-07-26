import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Job Application Assistant
// Nodes   : 31  |  Connections: 24
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualTrigger                      manualTrigger
// MemorySearchIndeed                 memoryBufferWindow         [ai_memory]
// ParseSearchResults                 outputParserStructured     [AI] [ai_outputParser]
// MemoryApplicationPack              memoryBufferWindow         [ai_memory]
// ParseApplicationPack               outputParserStructured     [AI] [ai_outputParser]
// OpenaiChatModel                    lmChatOpenAi               [creds] [ai_languageModel] [ai_languageModel] [ai_languageModel] [ai_languageModel] [ai_languageModel] [ai_languageModel]
// AggregateProfileSources            aggregate
// MemoryProfileIntelligence1         memoryBufferWindow         [ai_memory]
// ParseProfileIntelligence1          outputParserStructured     [ai_outputParser]
// Configuration1                     set
// StructuredOutputParser             outputParserStructured     [ai_outputParser]
// MemoryProfileIntelligence          memoryBufferWindow         [ai_memory]
// AggregateJobApplications           aggregate
// BuildDigestEmail                   code
// BuildSelectedJobsSource            code
// BuildSearchQueries                 code
// AgentSearchQueriesGeneration       agent                      [AI]
// AgentProfileGeneration             agent                      [AI]
// BuildProfileSources                code
// JinaReadProfileSource              jinaAi                     [creds]
// LoopOverProfileSources             splitInBatches
// AgentJobsSelection                 agent                      [AI]
// AggregateJobs                      aggregate
// GetJobResults                      httpRequest                [creds]
// LoopOverJobResultsResponses        splitInBatches
// LoopOverApplication                splitInBatches
// AgentGenerateApplication           agent                      [AI]
// SendApplicationOutput              gmail                      [creds]
// AppendRowInSheet                   googleSheets               [creds]
// GetAlreadyProcessedJobsUrls        googleSheets               [creds] [alwaysOutput]
// RemoveAlreadyProcessedJobs         code
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualTrigger
//    → Configuration1
//      → BuildProfileSources
//        → LoopOverProfileSources
//          → AggregateProfileSources
//            → AgentProfileGeneration
//              → AgentSearchQueriesGeneration
//                → BuildSearchQueries
//                  → LoopOverJobResultsResponses
//                    → AggregateJobs
//                      → GetAlreadyProcessedJobsUrls
//                        → RemoveAlreadyProcessedJobs
//                          → AgentJobsSelection
//                            → BuildSelectedJobsSource
//                              → LoopOverApplication
//                                → AggregateJobApplications
//                                  → BuildDigestEmail
//                                    → SendApplicationOutput
//                                → AppendRowInSheet
//                               .out(1) → AgentGenerateApplication
//                                  → LoopOverApplication (↩ loop)
//                   .out(1) → GetJobResults
//                      → LoopOverJobResultsResponses (↩ loop)
//         .out(1) → JinaReadProfileSource
//            → LoopOverProfileSources (↩ loop)
//
// AI CONNECTIONS
// ParseSearchResults.uses({ ai_languageModel: OpenaiChatModel })
// ParseApplicationPack.uses({ ai_languageModel: OpenaiChatModel })
// AgentSearchQueriesGeneration.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemoryProfileIntelligence, ai_outputParser: StructuredOutputParser })
// AgentProfileGeneration.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemoryProfileIntelligence1, ai_outputParser: ParseProfileIntelligence1 })
// AgentJobsSelection.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemorySearchIndeed, ai_outputParser: ParseSearchResults })
// AgentGenerateApplication.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemoryApplicationPack, ai_outputParser: ParseApplicationPack })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '1RApu6UgRmtLGFyT',
    name: 'Job Application Assistant',
    active: false,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: false,
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class JobApplicationAssistantWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '5580f339-470c-4eb3-b900-ad0c8bbc77ef',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [-1072, 592],
    })
    ManualTrigger = {};

    @node({
        id: '19ab2381-a92b-4f06-a0fc-882f798e1da6',
        name: '💾 Memory: Search Indeed',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [1952, 528],
    })
    MemorySearchIndeed = {
        sessionIdType: 'customKey',
        sessionKey: '=indeed_search_{{ $execution.id }}',
        contextWindowLength: 8,
    };

    @node({
        id: '67eb1a8b-e9d1-4e94-9c77-6f8199724983',
        name: '📋 Parse: Search Results',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [2080, 528],
    })
    ParseSearchResults = {
        schemaType: 'manual',
        inputSchema: `{
  "title": "JobOffersList",
  "type": "object",
  "properties": {
    "jobs": {
      "type": "array",
      "description": "Liste des offres d'emploi trouvées.",
      "items": {
        "type": "object",
        "required": [
          "jobId",
          "title",
          "company",
          "url",
          "location",
          "whyMatch"
        ],
        "properties": {
          "jobId": {
            "type": "string",
            "description": "Identifiant unique trouvé sur la plateforme (ex: 'job_12345')."
          },
          "title": {
            "type": "string",
            "description": "Intitulé exact du poste."
          },
          "description": {
            "type": "string",
            "description": "the job full description"
          },
          "company": {
            "type": "string",
            "description": "Nom de l'entreprise recruteuse."
          },
          "url": {
            "type": "string",
            "description": "URL absolue vers l'offre."
          },
          "applySite": {
            "type": "string",
            "description": "Nom du site sur lequel se trouve le lien de candidature (ex: 'Indeed', 'LinkedIn')."
          },
          "workArrangement": {
            "type": "string",
            "description": "'Remote' si le poste est en télétravail, sinon 'Belirtilmemiş'."
          },
          "country": {
            "type": "string",
            "description": "Pays/région d'éligibilité mentionné dans la description, sinon 'Belirtilmemiş'."
          },
          "location": {
            "type": "string",
            "description": "Localisation telle que retournée par la source (ville, pays, remote, etc.)."
          },
          "salary": {
            "type": "object",
            "properties": {
              "min": { "type": "number", "description": "Salaire minimum (nombre uniquement). Omettre si inconnu." },
              "max": { "type": "number", "description": "Salaire maximum (nombre uniquement). Omettre si inconnu." },
              "currency": { "type": "string", "description": "Devise (EUR, USD, etc.)", "default": "EUR" },
              "text": { "type": "string", "description": "Mention brute du salaire si format complexe." }
            }
          },
          "jobType": {
            "type": "string",
            "description": "Type de contrat : CDI, CDD, Freelance, Alternance, Stage."
          },
          "whyMatch": {
            "type": "string",
            "description": "Analyse concise expliquant la pertinence du poste."
          },
          "relevanceScore": {
            "type": "integer",
            "description": "Score de pertinence de 0 à 100."
          }
        }
      }
    }
  }
}`,
        autoFix: true,
    };

    @node({
        id: '13ff260c-fb7e-45bb-90db-921463f94f2b',
        name: '💾 Memory: Application Pack',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [2896, 576],
    })
    MemoryApplicationPack = {
        sessionIdType: 'customKey',
        sessionKey: '=application_pack_{{ $execution.id }}_{{ $itemIndex }}',
        contextWindowLength: 6,
    };

    @node({
        id: 'ef9f17a7-92ba-4ff1-8606-ee4a776151bf',
        name: '📋 Parse: Application Pack',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [3024, 576],
    })
    ParseApplicationPack = {
        schemaType: 'manual',
        inputSchema: `{
	"type": "object",
	"properties": {
		"email_subject": {
			"type": "string",
			"description": "A professional and catchy subject line for the application email (e.g., 'Application for [Role] - [Name]')"
		},
		"salutation": {
			"type": "string",
			"description": "The greeting line (e.g., 'Dear Hiring Manager,' or the specific name if found in the job description)"
		},
		"letter_body": {
			"type": "string",
			"description": "The core content of the cover letter in Markdown. Exclude the subject line and the greeting."
		},
		"key_selling_points": {
			"type": "array",
			"items": {
				"type": "string"
			},
			"description": "A list of the top 3 skills or achievements extracted from the profile that best match this specific job."
		},
        "job_url": {
			"type": "string",
			"description": "The url of the job offer"
		},
        "job_title": {
			"type": "string",
			"description": "The title of the job offer"
		},
        "company": {
			"type": "string",
			"description": "The hiring company name. Copy verbatim from JOB_DATA, do not invent."
		},
        "applySite": {
			"type": "string",
			"description": "The site name the job_url points to (e.g. 'Indeed'). Copy verbatim from JOB_DATA."
		},
        "workArrangement": {
			"type": "string",
			"description": "Copy verbatim from JOB_DATA (e.g. 'Remote' or 'Belirtilmemiş')."
		},
        "country": {
			"type": "string",
			"description": "Copy verbatim from JOB_DATA (e.g. 'US' or 'Belirtilmemiş')."
		}
	},
	"required": [
		"email_subject",
		"salutation",
		"letter_body",
        "job_url",
        "job_title",
        "company",
        "applySite",
        "workArrangement",
        "country"
	]
}`,
        autoFix: true,
    };

    @node({
        id: '7d2d646a-8d17-418c-8a9d-c9663a38574b',
        name: 'OpenAI Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [2016, 736],
        credentials: { openAiApi: { id: 'saVqn6WmzFGhipg0', name: 'OpenAI account' } },
    })
    OpenaiChatModel = {
        model: {
            mode: 'list',
            value: 'gpt-4o-mini',
        },
        options: {},
    };

    @node({
        id: '14a5da16-a979-4ef0-9cd3-2b6a299cac53',
        name: '📦 Aggregate: Profile Sources',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [-176, 448],
    })
    AggregateProfileSources = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'results',
        options: {},
    };

    @node({
        id: '8e6d8704-8659-43f5-ba17-6d119e2d09b6',
        name: '💾 Memory: Profile Intelligence1',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [64, 672],
    })
    MemoryProfileIntelligence1 = {
        sessionIdType: 'customKey',
        sessionKey: '=profile_intel_{{ $execution.id }}',
        contextWindowLength: 8,
    };

    @node({
        id: 'a7343f9b-7da0-4898-b3fe-b47c6356f524',
        name: '📋 Parse: Profile Intelligence1',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [192, 672],
    })
    ParseProfileIntelligence1 = {
        schemaType: 'manual',
        inputSchema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Profil de Recherche d'Emploi",
  "type": "object",
  "required": [
    "primaryRoles",
    "secondaryRoles",
    "coreSkills",
    "seniority",
    "expected_salary",
    "searchQueries",
    "exclusions",
    "locationQuery",
    "rationale"
  ],
  "properties": {
    "primaryRoles": {
      "type": "array",
      "description": "Liste des rôles principaux ciblés.",
      "items": {
        "type": "string"
      }
    },
    "secondaryRoles": {
      "type": "array",
      "description": "Liste des rôles secondaires ou connexes.",
      "items": {
        "type": "string"
      }
    },
    "coreSkills": {
      "type": "array",
      "description": "Compétences clés requises pour le poste.",
      "items": {
        "type": "string"
      }
    },
    "seniority": {
      "type": "string",
      "description": "Niveau d'expérience (ex: Junior, Senior, Lead)."
    },
    "expected_salary": {
      "type": "string",
      "description": "Salaire minimum"
    },
    "searchQueries": {
      "type": "array",
      "description": "Requêtes optimisées pour la recherche d'emploi, en local et en anglais.",
      "items": {
        "type": "string"
      }
    },
    "exclusions": {
      "type": "array",
      "description": "Mots-clés à exclure de la recherche.",
      "items": {
        "type": "string"
      }
    },
    "locationQuery": {
      "type": "object",
      "description": "Détails géographiques de la recherche.",
      "properties": {
        "state": {
          "type": "string",
          "description": "Région, province ou État."
        },
        "cities": {
          "type": "array",
          "description": "Liste des villes ciblées.",
          "items": {
            "type": "string"
          }
        }
      },
      "required": ["state", "cities"]
    },
    "rationale": {
      "type": "string",
      "description": "Justification ou logique derrière cette stratégie de recherche."
    }
  }
}`,
    };

    @node({
        id: 'bdd9decd-9de7-4604-9aaa-34261567b8c8',
        name: '⚙️ Configuration1',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-848, 592],
    })
    Configuration1 = {
        assignments: {
            assignments: [
                {
                    id: '770e00d8-02de-465d-a28b-387dc07bad22',
                    name: 'candidateName',
                    value: 'Deniz Doğru',
                    type: 'string',
                },
                {
                    id: '23e0d14f-c236-42e6-a559-9bcb2fb41ef4',
                    name: 'candidateEmail',
                    value: 'denizdogru97@gmail.com',
                    type: 'string',
                },
                {
                    id: '1a173df7-672c-4db9-8569-a9d2e5a3d98e',
                    name: 'candidatePhone',
                    value: '+90 539 888 3060',
                    type: 'string',
                },
                {
                    id: '75935f15-263f-4d1a-bb2a-4f0495a5977d',
                    name: 'targetLocation',
                    value: 'Istanbul',
                    type: 'string',
                },
                {
                    id: 'b66717e5-9008-49b7-a70f-5a46d4a9fd16',
                    name: 'targetLanguage',
                    value: 'tr',
                    type: 'string',
                },
                {
                    id: '8dec8eeb-6612-4f0c-b4d7-d802a43d0bc0',
                    name: 'remotePreference',
                    value: 'hybrid',
                    type: 'string',
                },
                {
                    id: 'a6ff7374-6e40-498c-8cda-03cb6814c5e8',
                    name: 'minimumSalaryAnnual',
                    value: '60 000',
                    type: 'string',
                },
                {
                    id: '1186e511-98f8-42f7-a1c7-c775d1ba7cc6',
                    name: 'maxJobsToProcess',
                    value: 3,
                    type: 'number',
                },
                {
                    id: 'ef1dba6b-c697-46cd-9873-9f109af8c894',
                    name: 'cvUrlPdf',
                    value: 'https://raw.githubusercontent.com/denizddogru/cv/main/DenizDogruCV.pdf',
                    type: 'string',
                },
                {
                    id: 'cb6b6fc1-cac9-4bde-bdac-b5fb65f2fed3',
                    name: 'cvUrlWeb',
                    value: 'https://raw.githubusercontent.com/denizddogru/cv/main/DenizDogruCV.pdf',
                    type: 'string',
                },
                {
                    id: 'f30e006c-63b8-42ee-9197-83d709822a81',
                    name: 'linkedinUrl',
                    value: 'https://www.linkedin.com/in/denizzdogru/',
                    type: 'string',
                },
                {
                    id: 'ac7fbc69-d7af-493c-9665-7cfe86973b9d',
                    name: 'githubUrl',
                    value: 'https://github.com/denizddogru',
                    type: 'string',
                },
                {
                    id: 'f9eaf5ee-0c36-46ec-8514-40341c44ef84',
                    name: 'githubOwner',
                    value: 'John Doe',
                    type: 'string',
                },
                {
                    id: '88fdb269-e3f6-4d17-ac3a-a16260060543',
                    name: 'githubRepo',
                    value: 'cv',
                    type: 'string',
                },
                {
                    id: 'bdca111c-c24d-4f95-ae40-e646f1539921',
                    name: 'githubBaseBranch',
                    value: 'main',
                    type: 'string',
                },
                {
                    id: '683ec5bf-a45e-40cb-888d-5d0f8c758f90',
                    name: 'githubLocaleFilePath',
                    value: 'locales/fr.yml',
                    type: 'string',
                },
                {
                    id: 'b9d8c2ab-59c3-4f53-84b7-75f1a6b6be7b',
                    name: 'githubPdfPath',
                    value: 'pdf/cv-fr-light.pdf',
                    type: 'string',
                },
                {
                    id: '29d03144-ec2e-4980-9387-ad6ec6d826a1',
                    name: 'githubActionPollSeconds',
                    value: 30,
                    type: 'number',
                },
                {
                    id: 'f2f45f77-cb4f-4a90-a633-8767ec06bf0c',
                    name: 'githubActionMaxPollAttempts',
                    value: 20,
                    type: 'number',
                },
                {
                    id: '89eb427b-a6f4-47ec-bf53-2f687c8abf5b',
                    name: 'githubActionWorkflowName',
                    value: 'Build and Commit PDFs',
                    type: 'string',
                },
                {
                    id: 'f8eb7364-935b-4669-8bd4-d41922adfcbe',
                    name: 'githubToken',
                    value: 'xxx',
                    type: 'string',
                },
                {
                    id: '8a6a9362-2068-4fa0-b13c-8b3e6df74e4a',
                    name: 'githubPrDraft',
                    value: true,
                    type: 'boolean',
                },
                {
                    id: 'c1a1b7f1-1a11-4a11-9a11-a1a1a1a1a1a1',
                    name: 'targetCountryCode',
                    value: 'tr',
                    type: 'string',
                },
                {
                    id: 'c1a1b7f1-1a11-4a11-9a11-a1a1a1a1a1a2',
                    name: 'targetLanguageCode',
                    value: 'tr',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'f825bc75-20d1-45a2-8a11-5e80bffb5e93',
        name: 'Structured Output Parser',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [544, 672],
    })
    StructuredOutputParser = {
        schemaType: 'manual',
        inputSchema: `{
  "type": "object",
  "properties": {
    "queries": {
      "type": "array",
      "minItems": 6,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["q"],
        "properties": {
          "q": { "type": "string", "description": "Search text for Google Jobs (job title + keyword variant, max 4-5 words)" },
          "location": { "type": "string", "description": "City/region string, e.g. 'Istanbul, Turkey'. Omit for remote-only queries." }
        }
      }
    }
  },
  "required": ["queries"]
}`,
    };

    @node({
        id: '90c4f615-73a3-4395-a817-fadb0b5d4f13',
        name: '💾 Memory: Profile Intelligence',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [416, 672],
    })
    MemoryProfileIntelligence = {
        sessionIdType: 'customKey',
        sessionKey: '=url_{{ $execution.id }}',
        contextWindowLength: 8,
    };

    @node({
        id: '0fb1983b-3f24-4d95-b1ec-cb93a3b41a82',
        name: '📦 Aggregate: Job Applications',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [3024, 48],
    })
    AggregateJobApplications = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'results',
        options: {},
    };

    @node({
        id: '6f6a5f0e-7a5d-4a8b-9a4e-2c9d3a6b7e1f',
        name: '🧾 Build Digest Email',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [3200, 48],
    })
    BuildDigestEmail = {
        jsCode: `const items = $json.results || [];
const jobs = items.map((item) => item.output).filter(Boolean);

const dateStr = new Date().toLocaleDateString('tr-TR');

const jobBlocks = jobs.map((job, idx) => \`
<hr>
<h3>\${idx + 1}. \${job.job_title || ''} — \${job.company || ''}</h3>
<p><strong>Çalışma Şekli:</strong> \${job.workArrangement || 'Belirtilmemiş'} | <strong>Ülke:</strong> \${job.country || 'Belirtilmemiş'} | <strong>Site:</strong> \${job.applySite || ''}</p>
<p><a href="\${job.job_url}">Başvuru linki</a></p>
<p>\${job.salutation || ''}<br><br>\${job.letter_body || ''}</p>
<p>\${Array.isArray(job.key_selling_points) ? job.key_selling_points.join(', ') : (job.key_selling_points || '')}</p>
\`).join('');

const html = \`<h2>Bugün başvurabileceğin \${jobs.length} ilan bulundu (\${dateStr})</h2>\${jobBlocks}\`;
const subject = \`\${jobs.length} yeni iş fırsatı - \${dateStr}\`;

return [
  {
    json: {
      subject,
      html
    }
  }
];`,
    };

    @node({
        id: '51b38592-1bb6-49c9-94eb-df55cce54539',
        name: '🧾 Build Selected Jobs Source',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2448, 304],
    })
    BuildSelectedJobsSource = {
        jsCode: 'return $input.first().json.output.jobs.map((job)=>{return {job}})',
    };

    @node({
        id: '62afa358-27ac-428b-8023-24b56bfc8a13',
        name: '🧾 Build Search Queries',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [752, 448],
    })
    BuildSearchQueries = {
        jsCode: `return $input.first().json.output.queries.map((item) => ({
  q: item.q
}));`,
    };

    @node({
        id: '7ccde75f-8333-469e-a875-b59f51fd8b5d',
        name: '🔎 Agent: Search Queries generation',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [400, 448],
    })
    AgentSearchQueriesGeneration = {
        promptType: 'define',
        text: `=Search Strategy:
Primary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.primaryRoles }}
Secondary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.secondaryRoles }}
coreSkills:
{{ $('🎯 Agent: Profile Generation').item.json.output.coreSkills }}
Seniority:
{{ $('🎯 Agent: Profile Generation').item.json.output.seniority }}

Search Queries:
{{ $('🎯 Agent: Profile Generation').item.json.output.searchQueries }}

Exclusions:
{{ $('🎯 Agent: Profile Generation').item.json.output.exclusions }}

Location Query:
{{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.cities }}, {{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.state }}

Rationale:
{{ $('🎯 Agent: Profile Generation').item.json.output.rationale }}
`,
        hasOutputParser: true,
        options: {
            systemMessage: `=You are a search-query generation agent for Google Jobs via SerpAPI.
Endpoint: https://serpapi.com/search?engine=google_jobs

IMPORTANT CONSTRAINT
Google's Jobs feature does not cover Turkey (not on Google's supported-country list), so this search is fixed to gl=us / hl=en and only surfaces remote/international listings. Location-based queries for Istanbul or Turkey will always return zero results — do not generate them.

Objective
Generate complementary queries to maximize coverage of REMOTE positions the candidate could do from Turkey.

Available Parameters (per query)
- q (required): search text, max 4-5 words, must include the word "remote". Combine job title + one keyword variant. Write it like a natural Google search, not a boolean query.

Splitting Strategies
By keywords: job title variants
"remote backend developer" -> "remote .NET developer", "remote C# developer", "remote backend engineer"
By seniority: add/omit "senior", "lead"

Rules
- 4-6 queries, no duplicates
- Every query's q must contain "remote"
- Keep q concise and natural

Response Format
Return a JSON object with key 'queries': an array of { q } objects.

Example
query 1: { "q": "remote .NET backend developer" }
query 2: { "q": "remote C# developer" }
query 3: { "q": "remote backend engineer" }`,
            maxIterations: 10,
        },
    };

    @node({
        id: '1182efb6-5271-4c91-a51e-3ba0bd8a8f1a',
        name: '🎯 Agent: Profile Generation',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [48, 448],
    })
    AgentProfileGeneration = {
        promptType: 'define',
        text: `=Build a precise job search strategy from these profile sources.

Candidate:
- Name: {{ $('⚙️ Configuration1').item.json.candidateName }}
- Target location: {{ $('⚙️ Configuration1').item.json.targetLocation }}
- Remote preference: {{ $('⚙️ Configuration1').item.json.remotePreference }}
- Minimum annual salary: {{ $('⚙️ Configuration1').item.json.minimumSalaryAnnual }}

Profile Source Content:
{{ JSON.stringify($json) }}

Return a JSON object with:
- primaryRoles (array of strings)
- secondaryRoles (array of strings)
- coreSkills (array of strings)
- seniority (string)
- expected salary (string)
- searchQueries (array of optimized search queries, local language and English)
- exclusions (array of terms to avoid)
- locationQuery (string)
- rationale (short string)`,
        hasOutputParser: true,
        options: {
            systemMessage:
                'You are a profile intelligence agent for job search automation. Infer realistic target roles and search queries from resume/profile content. Keep outputs concrete, concise, and useful for a Google Jobs search.',
            maxIterations: 4,
        },
    };

    @node({
        id: '535b047e-aae7-466b-a2e4-604214996e5d',
        name: '🧾 Build Profile Sources',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-624, 592],
    })
    BuildProfileSources = {
        jsCode: `const original = $input.first().json;

const pickedArray = [original.cvUrlWeb, original.linkedinUrl, original.githubUrl]
  .filter((url) => typeof url === 'string' && url.trim().length > 0);

return pickedArray.map((url) => ({
  json: {
    url: url.trim()
  }
}));
`,
    };

    @node({
        id: '92cd5025-6b82-466e-9f15-1665f74f1969',
        name: '📖 Jina: Read Profile Source',
        type: 'n8n-nodes-base.jinaAi',
        version: 1,
        position: [-176, 640],
        credentials: { jinaAiApi: { id: '8tZLsdzFjbi3lZvU', name: 'Jina AI account' } },
    })
    JinaReadProfileSource = {
        url: '={{ $json.url }}',
        options: {
            outputFormat: 'markdown',
        },
        requestOptions: {},
    };

    @node({
        id: '1d7abcfa-fdf5-4e0c-bf2e-15bfd00c3b6a',
        name: 'Loop Over profile sources',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [-400, 592],
    })
    LoopOverProfileSources = {
        options: {},
    };

    @node({
        id: '9509bd0e-9c9a-4667-8ee9-4a89e273eb11',
        name: '🔎 Agent: Jobs selection',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [1872, 304],
    })
    AgentJobsSelection = {
        promptType: 'define',
        text: `=JOB OFFERS :
{{ JSON.stringify($json.results) }}
`,
        hasOutputParser: true,
        options: {
            systemMessage: `=You are an autonomous job hunter agent. Prioritize relevance over quantity, and produce clean structured output.

Use the generated strategy to find relevant jobs and return structured jobs.

Search Strategy:
Primary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.primaryRoles }}
Secondary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.secondaryRoles }}
coreSkills:
{{ $('🎯 Agent: Profile Generation').item.json.output.coreSkills }}
Seniority:
{{ $('🎯 Agent: Profile Generation').item.json.output.seniority }}
Expected salary:
{{ $('🎯 Agent: Profile Generation').item.json.output.expected_salary }}

Search Queries:
{{ $('🎯 Agent: Profile Generation').item.json.output.searchQueries }}

Exclusions:
{{ $('🎯 Agent: Profile Generation').item.json.output.exclusions }}

Location Query:
{{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.cities }}, {{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.state }}

Rationale:
{{ $('🎯 Agent: Profile Generation').item.json.output.rationale }}

Context note: JOB OFFERS above is a flat, already-deduplicated array (max 25) of candidate offers from SerpAPI's Google Jobs engine (gl=us, hl=en, remote-focused). Each object contains: job_id, title, company_name, location (plain string), description (truncated), via, detected_extensions (may contain schedule_type, salary, work_from_home boolean), apply_url (the real application URL, already resolved — always use this verbatim, never modify it), apply_site (the site name the apply_url points to, e.g. "Indeed", "LinkedIn").

Rules:
1) FIND MATCHING OFFERS
2) Never invent or hallucinate offers. Always rely on JOB OFFERS in your context.
3) Return max {{ $('⚙️ Configuration1').item.json.maxJobsToProcess }} jobs.
4) If no match simply return "Aucune offre correspondante"
5) TECH STACK FIT IS MANDATORY, NOT JUST TITLE MATCH: a job title containing "Backend Developer" or similar is NOT enough by itself. Read the offer's description and prioritize offers whose primary tech stack matches coreSkills (.NET, C#, ASP.NET, Microsoft stack). Deprioritize or exclude offers that primarily require a fundamentally different stack (e.g. Ruby on Rails, Python-only, PHP-only, Java-only) even if the title looks like a match, unless there are no better-fitting offers available.

Return JSON object with key 'jobs' as array of objects:
- jobId (from job_id)
- title (from title)
- company (from company_name)
- url (copy apply_url verbatim — this is the real, clickable application link, do not alter it)
- applySite (copy apply_site verbatim)
- location (from location, plain string)
- snippet
- fullDescription (from description)
- salary (from detected_extensions.salary if present, else omit)
- jobType (from detected_extensions.schedule_type if present, else omit)
- workArrangement ("Remote" if detected_extensions.work_from_home is true, else "Belirtilmemiş")
- country (a specific country/region mentioned in the description as a location or eligibility restriction, e.g. "US", "US, Canada, WEU"; if none is mentioned, use "Belirtilmemiş" — never guess)
- whyMatch
All those properties must be found in context below. Do not invent properties that aren't derivable from the source data.`,
            maxIterations: 10,
        },
    };

    @node({
        id: '651263fb-bf3a-4e94-809d-2f10c5d89617',
        name: '📦 Aggregate: Jobs',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [1200, 304],
    })
    AggregateJobs = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'results',
        options: {},
    };

    @node({
        id: 'a9ae48f4-b4df-4e71-a1eb-a5da173b665d',
        name: 'Get job results',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.3,
        position: [1200, 496],
        credentials: { httpQueryAuth: { id: 'dsypNzw0HzLbftbw', name: 'SerpAPI account' } },
    })
    GetJobResults = {
        url: 'https://serpapi.com/search',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpQueryAuth',
        sendQuery: true,
        queryParameters: {
            parameters: [
                {
                    name: 'engine',
                    value: 'google_jobs',
                },
                {
                    name: 'q',
                    value: '={{ $json.q }}',
                },
                {
                    name: 'gl',
                    value: 'us',
                },
                {
                    name: 'hl',
                    value: 'en',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '24f00a37-dcee-4819-814e-7d982a740af5',
        name: 'Loop Over Job results responses',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [976, 448],
    })
    LoopOverJobResultsResponses = {
        options: {},
    };

    @node({
        id: '752baaac-264f-4026-b72f-f1a66a2171e4',
        name: 'Loop Over Application',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [2672, 304],
    })
    LoopOverApplication = {
        options: {},
    };

    @node({
        id: '36a201c2-6ed0-4138-8de9-a61dfa6e0fa3',
        name: '✍️ Agent: Generate Application',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [2928, 352],
    })
    AgentGenerateApplication = {
        promptType: 'define',
        text: `=Create a tailored application package for this job.


**CANDIDATE_PROFILE:**
Primary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.primaryRoles }}
Secondary roles:
{{ $('🎯 Agent: Profile Generation').item.json.output.secondaryRoles }}
coreSkills:
{{ $('🎯 Agent: Profile Generation').item.json.output.coreSkills }}
Seniority:
{{ $('🎯 Agent: Profile Generation').item.json.output.seniority }}
Expected salary:
{{ $('🎯 Agent: Profile Generation').item.json.output.seniority }}

Search Queries:
{{ $('🎯 Agent: Profile Generation').item.json.output.searchQueries }}

Exclusions:
{{ $('🎯 Agent: Profile Generation').item.json.output.exclusions }}

Location Query:
{{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.cities }}, {{ $('🎯 Agent: Profile Generation').item.json.output.locationQuery.state }}

Rationale:
{{ $('🎯 Agent: Profile Generation').item.json.output.rationale }}

**CANDIDATE_FULL_DATA:**
{{ JSON.stringify($('📦 Aggregate: Profile Sources').item.json.results) }}

**JOB_DATA:**
Job url: {{ $json.job.url }}
Job title: {{ $json.job.title }}
Company: {{ $json.job.company }}
Apply site: {{ $json.job.applySite }}
Work arrangement: {{ $json.job.workArrangement }}
Country: {{ $json.job.country }}
Job description: {{ $json.job.description }}
Job location: {{ JSON.stringify($json.job.location) }}
Job type: {{ $json.job.jobType }}
Why match: {{ $json.job.whyMatch }}
Relevance Score: {{ $json.job.relevanceScore }}

`,
        hasOutputParser: true,
        options: {
            systemMessage: `=### ROLE
You are an expert Career Strategist and Professional Copywriter with 15 years of experience in recruitment. Your goal is to write a highly persuasive, personalized, and professional cover letter.

### INPUT DATA
You will receive three distinct blocks of information:
1. **CANDIDATE_PROFILE:** Information about the user (Resume, bio, skills, experience).
2. **CANDIDATE_FULL_DATA:** Full data about the candidate that you can use if you find specific matches that were not highlighted in **CANDIDATE_PROFILE:**
3. **JOB_DESCRIPTION:** Details about the target role (Responsibilities, requirements, company culture).

### OBJECTIVE
Analyze the \`CANDIDATE_PROFILE\` to find specific evidence that matches the requirements in the \`JOB_DESCRIPTION\`. Write a cover letter that proves the candidate is the perfect fit for this specific role.

### WRITING GUIDELINES
1.  **Tone:** Professional, confident, enthusiastic, and authentic. Match the tone of the job description (e.g., if the JD is formal, be formal; if it's a startup, be dynamic).
2.  **Structure:**
    * **Header:** Standard formal letter format (placeholders for contact info if not provided).
    * **Hook:** Don't start with "I am writing to apply..." Start with a strong opening sentence about the value the candidate brings or their passion for the company's mission.
    * **The "Bridge":** Connect the candidate's past achievements directly to the company's future goals. Use metrics and specific examples from the \`CANDIDATE_PROFILE\`.
    * **Company Fit:** Briefly mention why this specific company appeals to the candidate (based on the \`JOB_DESCRIPTION\`).
    * **Call to Action:** A confident closing inviting an interview.
3.  **Constraints:**
    * Do NOT invent experiences not present in the \`CANDIDATE_PROFILE\`.
    * Do NOT simply summarize the resume. Interpret the experience.
    * Keep the length between 250-400 words.
    * Output letter_body and key_selling_points properties strings in HTML.

### CRITICAL INSTRUCTION
If the \`CANDIDATE_PROFILE\` is missing a specific skill required in the \`JOB_DESCRIPTION\`, focus on transferable skills and the ability to learn quickly. Do not lie.
You have to answer in a structured outpy json.
You must also copy through, verbatim and unchanged, these fields from JOB_DATA into the structured json output: job_url, job_title, company, applySite, workArrangement, country. Do not alter or invent these values.

Now, wait for the user to provide the data contexts.`,
        },
    };

    @node({
        id: '14c03b9b-0fe5-4b40-81b0-d8ac52594f1a',
        webhookId: '81a80254-cea3-4fde-b02a-11a7e10c8c35',
        name: '📧 Send: Application Output',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [3616, 352],
        credentials: { gmailOAuth2: { id: '8eriZBk67AGsq90h', name: 'Gmail account' } },
    })
    SendApplicationOutput = {
        sendTo: 'denizdogru97@gmail.com',
        subject: '={{ $json.subject }}',
        message: '={{ $json.html }}',
        options: {},
    };

    @node({
        id: 'c4c7fee1-f3b8-417b-87f0-65744e8f468e',
        name: 'Append row in sheet',
        type: 'n8n-nodes-base.googleSheets',
        version: 4.7,
        position: [3840, 352],
        credentials: { googleSheetsOAuth2Api: { id: '3O1hlMiu4a6mMKrJ', name: 'Google Sheets account' } },
    })
    AppendRowInSheet = {
        operation: 'append',
        documentId: {
            __rl: true,
            value: '14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730',
            mode: 'list',
            cachedResultName: 'job offers processed',
            cachedResultUrl:
                'https://docs.google.com/spreadsheets/d/14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730/edit?usp=drivesdk',
        },
        sheetName: {
            __rl: true,
            value: 'gid=0',
            mode: 'list',
            cachedResultName: 'job urls',
            cachedResultUrl:
                'https://docs.google.com/spreadsheets/d/14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730/edit#gid=0',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                Tarih: "={{ $now.format('yyyy-MM-dd HH:mm') }}",
                URLS: '={{ $json.output.job_url }}',
                'İlan Adı': '={{ $json.output.job_title }}',
                Şirket: '={{ $json.output.company }}',
                Site: '={{ $json.output.applySite }}',
                'Çalışma Şekli': '={{ $json.output.workArrangement }}',
                Ülke: '={{ $json.output.country }}',
            },
            matchingColumns: ['URLS'],
            schema: [
                {
                    id: 'Tarih',
                    displayName: 'Tarih',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
                {
                    id: 'URLS',
                    displayName: 'URLS',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                    removed: false,
                },
                {
                    id: 'İlan Adı',
                    displayName: 'İlan Adı',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
                {
                    id: 'Şirket',
                    displayName: 'Şirket',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
                {
                    id: 'Site',
                    displayName: 'Site',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
                {
                    id: 'Çalışma Şekli',
                    displayName: 'Çalışma Şekli',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
                {
                    id: 'Ülke',
                    displayName: 'Ülke',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: false,
                    removed: false,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        options: {},
    };

    @node({
        id: '1443c96a-cf31-4f6a-87d7-facac5a5eb7a',
        name: 'Get already processed jobs urls',
        type: 'n8n-nodes-base.googleSheets',
        version: 4.7,
        position: [1424, 304],
        credentials: { googleSheetsOAuth2Api: { id: '3O1hlMiu4a6mMKrJ', name: 'Google Sheets account' } },
        alwaysOutputData: true,
    })
    GetAlreadyProcessedJobsUrls = {
        documentId: {
            __rl: true,
            value: '14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730',
            mode: 'list',
            cachedResultName: 'job offers processed',
            cachedResultUrl:
                'https://docs.google.com/spreadsheets/d/14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730/edit?usp=drivesdk',
        },
        sheetName: {
            __rl: true,
            value: 'gid=0',
            mode: 'list',
            cachedResultName: 'job urls',
            cachedResultUrl:
                'https://docs.google.com/spreadsheets/d/14RtXAwXWsI_dPze9FKTJGzzn9RpYOXxxOxsd5H3H730/edit#gid=0',
        },
        options: {},
    };

    @node({
        id: 'b2ef2972-fc15-4401-b7da-4a4140bcc882',
        name: 'Remove already processed jobs',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1648, 304],
    })
    RemoveAlreadyProcessedJobs = {
        jsCode: `const normalizeUrl = (value) => {
  if (typeof value !== 'string') return '';

  const raw = value.trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const normalizedPath = parsed.pathname.replace(/\\/+$|^$/, '/');
    return \`\${parsed.protocol.toLowerCase()}//\${parsed.hostname.toLowerCase()}\${normalizedPath}\${parsed.search}\`;
  } catch {
    return raw.replace(/\\/+$|^$/, '/');
  }
};

const getOfferUrl = (offer) =>
  offer?.apply_options?.[0]?.link ??
  offer?.related_links?.[0]?.link ??
  offer?.apply_link ??
  offer?.share_link;

const getOfferSite = (offer) => offer?.apply_options?.[0]?.title ?? offer?.via;

const addProcessedOffer = (offer, processedUrls, processedIds) => {
  const offerUrl = normalizeUrl(getOfferUrl(offer));

  if (offerUrl) {
    processedUrls.add(offerUrl);
  }

  const offerId = offer?.job_id != null ? String(offer.job_id).trim() : '';
  if (offerId) {
    processedIds.add(offerId);
  }
};

const processedUrls = new Set();
const processedIds = new Set();

for (const item of $input.all()) {
  const json = item?.json ?? {};

  const directUrl = json.URLS ?? json.url ?? json.Url ?? json.urls;
  const normalizedDirectUrl = normalizeUrl(directUrl);
  if (normalizedDirectUrl) {
    processedUrls.add(normalizedDirectUrl);
  }

  const directId = json.id != null ? String(json.id).trim() : '';
  if (directId) {
    processedIds.add(directId);
  }

  if (Array.isArray(json.jobs_results)) {
    for (const offer of json.jobs_results) {
      addProcessedOffer(offer, processedUrls, processedIds);
    }
  }

  if (Array.isArray(json.results)) {
    for (const resultBlock of json.results) {
      if (Array.isArray(resultBlock?.jobs_results)) {
        for (const offer of resultBlock.jobs_results) {
          addProcessedOffer(offer, processedUrls, processedIds);
        }
      } else if (resultBlock && typeof resultBlock === 'object') {
        addProcessedOffer(resultBlock, processedUrls, processedIds);
      }
    }
  }
}

const trimOffer = (offer) => ({
  job_id: offer?.job_id,
  title: offer?.title,
  company_name: offer?.company_name,
  location: offer?.location,
  description: typeof offer?.description === 'string' ? offer.description.slice(0, 1200) : offer?.description,
  via: offer?.via,
  detected_extensions: offer?.detected_extensions
    ? {
        schedule_type: offer.detected_extensions.schedule_type,
        salary: offer.detected_extensions.salary,
        work_from_home: offer.detected_extensions.work_from_home
      }
    : undefined,
  apply_url: getOfferUrl(offer),
  apply_site: getOfferSite(offer)
});

const MAX_CANDIDATE_JOBS = 25;

const aggregated = $('📦 Aggregate: Jobs').first()?.json?.results;
const responseItems = Array.isArray(aggregated) ? aggregated : [];

const seenUrls = new Set();
const seenIds = new Set();
const candidateOffers = [];

outer:
for (const responseItem of responseItems) {
  if (!Array.isArray(responseItem?.jobs_results)) continue;

  for (const offer of responseItem.jobs_results) {
    const offerUrl = normalizeUrl(getOfferUrl(offer));
    const offerId = offer?.job_id != null ? String(offer.job_id).trim() : '';

    if (offerUrl && processedUrls.has(offerUrl)) continue;
    if (offerId && processedIds.has(offerId)) continue;
    if (offerId && seenIds.has(offerId)) continue;
    if (offerUrl && seenUrls.has(offerUrl)) continue;

    if (offerId) seenIds.add(offerId);
    if (offerUrl) seenUrls.add(offerUrl);

    candidateOffers.push(trimOffer(offer));
    if (candidateOffers.length >= MAX_CANDIDATE_JOBS) break outer;
  }
}

return [
  {
    json: {
      results: candidateOffers
    },
    pairedItem: {
      item: 0
    }
  }
];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ManualTrigger.out(0).to(this.Configuration1.in(0));
        this.AggregateProfileSources.out(0).to(this.AgentProfileGeneration.in(0));
        this.Configuration1.out(0).to(this.BuildProfileSources.in(0));
        this.BuildSelectedJobsSource.out(0).to(this.LoopOverApplication.in(0));
        this.BuildSearchQueries.out(0).to(this.LoopOverJobResultsResponses.in(0));
        this.AgentSearchQueriesGeneration.out(0).to(this.BuildSearchQueries.in(0));
        this.AgentProfileGeneration.out(0).to(this.AgentSearchQueriesGeneration.in(0));
        this.BuildProfileSources.out(0).to(this.LoopOverProfileSources.in(0));
        this.JinaReadProfileSource.out(0).to(this.LoopOverProfileSources.in(0));
        this.LoopOverProfileSources.out(0).to(this.AggregateProfileSources.in(0));
        this.LoopOverProfileSources.out(1).to(this.JinaReadProfileSource.in(0));
        this.AgentJobsSelection.out(0).to(this.BuildSelectedJobsSource.in(0));
        this.AggregateJobs.out(0).to(this.GetAlreadyProcessedJobsUrls.in(0));
        this.GetJobResults.out(0).to(this.LoopOverJobResultsResponses.in(0));
        this.LoopOverJobResultsResponses.out(0).to(this.AggregateJobs.in(0));
        this.LoopOverJobResultsResponses.out(1).to(this.GetJobResults.in(0));
        this.LoopOverApplication.out(0).to(this.AggregateJobApplications.in(0));
        this.LoopOverApplication.out(0).to(this.AppendRowInSheet.in(0));
        this.LoopOverApplication.out(1).to(this.AgentGenerateApplication.in(0));
        this.AgentGenerateApplication.out(0).to(this.LoopOverApplication.in(0));
        this.AggregateJobApplications.out(0).to(this.BuildDigestEmail.in(0));
        this.BuildDigestEmail.out(0).to(this.SendApplicationOutput.in(0));
        this.GetAlreadyProcessedJobsUrls.out(0).to(this.RemoveAlreadyProcessedJobs.in(0));
        this.RemoveAlreadyProcessedJobs.out(0).to(this.AgentJobsSelection.in(0));

        this.ParseSearchResults.uses({
            ai_languageModel: this.OpenaiChatModel.output,
        });
        this.ParseApplicationPack.uses({
            ai_languageModel: this.OpenaiChatModel.output,
        });
        this.AgentSearchQueriesGeneration.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemoryProfileIntelligence.output,
            ai_outputParser: this.StructuredOutputParser.output,
        });
        this.AgentProfileGeneration.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemoryProfileIntelligence1.output,
            ai_outputParser: this.ParseProfileIntelligence1.output,
        });
        this.AgentJobsSelection.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemorySearchIndeed.output,
            ai_outputParser: this.ParseSearchResults.output,
        });
        this.AgentGenerateApplication.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemoryApplicationPack.output,
            ai_outputParser: this.ParseApplicationPack.output,
        });
    }
}
