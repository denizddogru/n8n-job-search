import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : JSearch Turkey Test
// Nodes   : 19  |  Connections: 15
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualTrigger                      manualTrigger
// Configuration1                     set
// BuildProfileSources                code
// LoopOverProfileSources             splitInBatches
// JinaReadProfileSource              jinaAi                     [creds]
// AggregateProfileSources            aggregate
// OpenaiChatModel                    lmChatOpenAi               [creds] [ai_languageModel] [ai_languageModel] [ai_languageModel] [ai_languageModel]
// MemoryProfileIntelligence1         memoryBufferWindow         [ai_memory]
// ParseProfileIntelligence1          outputParserStructured     [AI] [ai_outputParser]
// AgentProfileGeneration             agent                      [AI] [retry]
// MemoryProfileIntelligence          memoryBufferWindow         [ai_memory]
// StructuredOutputParser             outputParserStructured     [AI] [ai_outputParser]
// AgentSearchQueriesGeneration       agent                      [AI] [retry]
// BuildSearchQueries                 code
// LoopOverJobResultsResponses        splitInBatches
// GetJsearchResultsTr                httpRequest                [creds]
// AggregateJobs                      aggregate
// BuildDigestEmail                   code
// SendJsearchDigest                  gmail                      [creds]
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
//                      → BuildDigestEmail
//                        → SendJsearchDigest
//                   .out(1) → GetJsearchResultsTr
//                      → LoopOverJobResultsResponses (↩ loop)
//         .out(1) → JinaReadProfileSource
//            → LoopOverProfileSources (↩ loop)
//
// AI CONNECTIONS
// ParseProfileIntelligence1.uses({ ai_languageModel: OpenaiChatModel })
// AgentProfileGeneration.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemoryProfileIntelligence1, ai_outputParser: ParseProfileIntelligence1 })
// StructuredOutputParser.uses({ ai_languageModel: OpenaiChatModel })
// AgentSearchQueriesGeneration.uses({ ai_languageModel: OpenaiChatModel, ai_memory: MemoryProfileIntelligence, ai_outputParser: StructuredOutputParser })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'tAXywdAzShVqvh0V',
    name: 'JSearch Turkey Test',
    active: false,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: false,
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class JsearchTurkeyTestWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '781c7077-ce5e-46e0-9d8f-e60f84f56113',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [-1072, 592],
    })
    ManualTrigger = {};

    @node({
        id: 'ffaede98-82bb-49ad-92a8-6e3082604c81',
        name: '⚙️ Configuration1',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-848, 592],
    })
    Configuration1 = {
        assignments: {
            assignments: [
                {
                    name: 'candidateName',
                    value: 'Deniz Doğru',
                    type: 'string',
                },
                {
                    name: 'targetLocation',
                    value: 'Istanbul',
                    type: 'string',
                },
                {
                    name: 'targetLanguage',
                    value: 'tr',
                    type: 'string',
                },
                {
                    name: 'remotePreference',
                    value: 'hybrid',
                    type: 'string',
                },
                {
                    name: 'minimumSalaryAnnual',
                    value: '60 000',
                    type: 'string',
                },
                {
                    name: 'cvUrlPdf',
                    value: 'https://raw.githubusercontent.com/denizddogru/cv/main/DenizDogruCV.pdf',
                    type: 'string',
                },
                {
                    name: 'cvUrlWeb',
                    value: 'https://raw.githubusercontent.com/denizddogru/cv/main/DenizDogruCV.pdf',
                    type: 'string',
                },
                {
                    name: 'linkedinUrl',
                    value: 'https://www.linkedin.com/in/denizzdogru/',
                    type: 'string',
                },
                {
                    name: 'githubUrl',
                    value: 'https://github.com/denizddogru',
                    type: 'string',
                },
                {
                    name: 'targetCountryCode',
                    value: 'tr',
                    type: 'string',
                },
                {
                    name: 'targetLanguageCode',
                    value: 'tr',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '3636a529-63e8-4bc8-ae8c-2d3e782e17cb',
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
        id: 'c1425285-6c39-420a-8e65-064ecdb9b98c',
        name: 'Loop Over profile sources',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [-400, 592],
    })
    LoopOverProfileSources = {
        options: {},
    };

    @node({
        id: 'b492ee58-49f8-4265-a69f-3127ff0bcf55',
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
        id: '2b29a5f0-e869-4cd8-9d1c-d7d512a7a00b',
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
        id: '0d8fb716-9699-4e21-876e-e0007b7e2d4f',
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
        builtInTools: {},
        options: {},
    };

    @node({
        id: '02edb65a-7916-4212-8a17-f286e1e43e1d',
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
        id: '44c9556a-bc10-45fd-bf34-319b5ad1d6d4',
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
      "items": { "type": "string" }
    },
    "secondaryRoles": {
      "type": "array",
      "description": "Liste des rôles secondaires ou connexes.",
      "items": { "type": "string" }
    },
    "coreSkills": {
      "type": "array",
      "description": "Compétences clés requises pour le poste.",
      "items": { "type": "string" }
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
      "items": { "type": "string" }
    },
    "exclusions": {
      "type": "array",
      "description": "Mots-clés à exclure de la recherche.",
      "items": { "type": "string" }
    },
    "locationQuery": {
      "type": "object",
      "description": "Détails géographiques de la recherche.",
      "properties": {
        "state": { "type": "string", "description": "Région, province ou État." },
        "cities": {
          "type": "array",
          "description": "Liste des villes ciblées.",
          "items": { "type": "string" }
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
        autoFix: true,
    };

    @node({
        id: '9bc5b431-3009-44d1-b758-0aa31ef93b88',
        name: '🎯 Agent: Profile Generation',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [48, 448],
        retryOnFail: true,
        maxTries: 2,
        waitBetweenTries: 2000,
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
                'You are a profile intelligence agent for job search automation. Infer realistic target roles and search queries from resume/profile content. Keep outputs concrete, concise, and useful for a job search targeting Turkey. The candidate\'s primary stack is .NET / C# (Microsoft stack) — always include ".NET Developer" as a primaryRole. Never include Java or Python as a primaryRole or secondaryRole unless the profile source explicitly shows real professional experience in it (a passing mention, a course, or a tangential tool reference is not enough) — do not invent adjacent-language roles just because they sound similar to backend/API work.',
            maxIterations: 4,
        },
    };

    @node({
        id: '49bfcc23-3783-40c3-b5a3-702dd925e68d',
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
        id: 'a4ed6688-98cb-4606-a5ed-26343a4afb0c',
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
      "minItems": 2,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["q"],
        "properties": {
          "q": { "type": "string", "description": "Search text for JSearch (job title + city/keyword variant, max 4-5 words)" }
        }
      }
    }
  },
  "required": ["queries"]
}`,
        autoFix: true,
    };

    @node({
        id: 'e41556ab-839f-4123-a429-e35a69ea8c1f',
        name: '🔎 Agent: Search Queries generation',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [400, 448],
        retryOnFail: true,
        maxTries: 2,
        waitBetweenTries: 2000,
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
            systemMessage: `=You are a search-query generation agent for JSearch (a job search API on RapidAPI, endpoint https://jsearch.p.rapidapi.com/search-v2) — this run targets the Netherlands (country=nl, fixed at the HTTP node level).

Objective
Generate queries targeting the Netherlands. A mix of Netherlands/Amsterdam-specific and general queries is fine.

Available Parameters (per query)
- q (required): search text, max 4-5 words. May include "Netherlands" or "Amsterdam". Write it like a natural search query, not boolean.

Rules
- Generate ONLY 2-3 queries (quota-constrained test, keep it minimal)
- No duplicates
- At least one query MUST be a close variant of ".NET developer Netherlands" — .NET is the candidate's primary stack, never drop it
- NEVER generate queries for Java or Python (not the candidate's stack)
- Keep q concise and natural

Response Format
Return a JSON object with key 'queries': an array of { q } objects.

Example
query 1: { "q": ".NET developer Netherlands" }
query 2: { "q": "C# developer Amsterdam" }`,
            maxIterations: 10,
        },
    };

    @node({
        id: 'c7196f37-806f-497f-92a7-ef21f3d5c4af',
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
        id: '166e7627-f3a9-4be6-9d0e-c832cdb25eb0',
        name: 'Loop Over Job results responses',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [976, 448],
    })
    LoopOverJobResultsResponses = {
        options: {},
    };

    @node({
        id: '9c3b34ce-fd99-4024-9ab0-3a96290f33e9',
        name: 'Get JSearch Results (TR)',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.3,
        position: [1200, 496],
        credentials: { httpHeaderAuth: { id: 'hduGUHJHD3qaeSZw', name: 'Header Auth account 2' } },
    })
    GetJsearchResultsTr = {
        url: 'https://jsearch.p.rapidapi.com/search-v2',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendQuery: true,
        queryParameters: {
            parameters: [
                {
                    name: 'query',
                    value: '={{ $json.q }}',
                },
                {
                    name: 'country',
                    value: 'nl',
                },
                {
                    name: 'language',
                    value: 'nl',
                },
                {
                    name: 'page',
                    value: '1',
                },
            ],
        },
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'X-RapidAPI-Host',
                    value: 'jsearch.p.rapidapi.com',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '41734f05-1df4-4cca-a2ab-8622c98249d4',
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
        id: '1d04e87e-88b6-4a91-8ade-c04da8946839',
        name: '🧾 Build Digest Email',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1424, 304],
    })
    BuildDigestEmail = {
        jsCode: `const responses = $json.results || [];
const jobs = responses.flatMap((r) => (r?.data?.jobs || []));

const dateStr = new Date().toLocaleDateString('tr-TR');

const jobBlocks = jobs.map((job, idx) => \`
<hr>
<h3>\${idx + 1}. \${job.job_title || ''} — \${job.employer_name || ''}</h3>
<p><strong>Konum:</strong> \${job.job_city || ''}\${job.job_city && job.job_country ? ', ' : ''}\${job.job_country || ''} | <strong>Tip:</strong> \${job.job_employment_type || 'Belirtilmemiş'}</p>
<p><a href="\${job.job_apply_link}">Başvuru linki</a></p>
\`).join('');

const html = \`<h2>JSearch testi: \${jobs.length} ilan bulundu (\${dateStr})</h2>\${jobBlocks || '<p>Sonuç bulunamadı.</p>'}\`;
const subject = \`JSearch test: \${jobs.length} ilan - \${dateStr}\`;

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
        id: '5664e56e-65c6-4976-a112-73dc2dbc90e0',
        name: '📧 Send: JSearch Digest',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [1648, 304],
        credentials: { gmailOAuth2: { id: '8eriZBk67AGsq90h', name: 'Gmail account' } },
    })
    SendJsearchDigest = {
        sendTo: 'denizdogru97@gmail.com',
        subject: '={{ $json.subject }}',
        message: '={{ $json.html }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ManualTrigger.out(0).to(this.Configuration1.in(0));
        this.Configuration1.out(0).to(this.BuildProfileSources.in(0));
        this.BuildProfileSources.out(0).to(this.LoopOverProfileSources.in(0));
        this.LoopOverProfileSources.out(0).to(this.AggregateProfileSources.in(0));
        this.LoopOverProfileSources.out(1).to(this.JinaReadProfileSource.in(0));
        this.JinaReadProfileSource.out(0).to(this.LoopOverProfileSources.in(0));
        this.AggregateProfileSources.out(0).to(this.AgentProfileGeneration.in(0));
        this.AgentProfileGeneration.out(0).to(this.AgentSearchQueriesGeneration.in(0));
        this.AgentSearchQueriesGeneration.out(0).to(this.BuildSearchQueries.in(0));
        this.BuildSearchQueries.out(0).to(this.LoopOverJobResultsResponses.in(0));
        this.LoopOverJobResultsResponses.out(0).to(this.AggregateJobs.in(0));
        this.LoopOverJobResultsResponses.out(1).to(this.GetJsearchResultsTr.in(0));
        this.GetJsearchResultsTr.out(0).to(this.LoopOverJobResultsResponses.in(0));
        this.AggregateJobs.out(0).to(this.BuildDigestEmail.in(0));
        this.BuildDigestEmail.out(0).to(this.SendJsearchDigest.in(0));

        this.ParseProfileIntelligence1.uses({
            ai_languageModel: this.OpenaiChatModel.output,
        });
        this.AgentProfileGeneration.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemoryProfileIntelligence1.output,
            ai_outputParser: this.ParseProfileIntelligence1.output,
        });
        this.StructuredOutputParser.uses({
            ai_languageModel: this.OpenaiChatModel.output,
        });
        this.AgentSearchQueriesGeneration.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.MemoryProfileIntelligence.output,
            ai_outputParser: this.StructuredOutputParser.output,
        });
    }
}
