# Setup & Running Guide

This document lists **every step** needed to take this project from scratch (on an empty machine) and get the n8n automations running. For technical detail on what the workflows do, see `n8n.md`; for project history, see `CLAUDE.md`.

## 1. Prerequisites

- **Docker Desktop** (to run n8n as a container) — https://www.docker.com/products/docker-desktop/
- **Node.js + npm** (to run the n8n-as-code CLI via `npx`, no global install needed) — versions tested in this project: Node v25, npm 11
- A **RapidAPI account** (for the JSearch test workflow, free, no credit card)
- An **OpenAI API key** (paid, token-based — uses gpt-4o-mini)
- A **Gmail account** (OAuth2, free)
- A **Google Sheets** file (free, for dedup/logging — used only by the production workflow)
- (Optional, for the production workflow) A **SerpAPI account** (for Google Jobs search, ~250 free requests/month)

## 2. Bringing n8n Up with Docker

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

- `-v ~/.n8n:/home/node/.n8n` — persists all of n8n's data (workflows, credentials, execution history) on the host machine; data survives even if the container is deleted/recreated.
- Once the container is up, go to **http://localhost:5678** in your browser.
- On first launch, n8n will ask you to create an **owner account** (email + password) — this account is local to this n8n instance only, not tied to any third-party service.

To stop/restart the container:
```bash
docker stop n8n
docker start n8n
```

## 3. Cloning the Project and CLI Check

```bash
git clone https://github.com/denizddogru/n8n-job-search.git
cd n8n-job-search
```

`n8nac-config.json` already ships in the repo pointing at `localhost:5678` (environment name: `local`, workflows path: `workflows/local`). No extra configuration is needed.

`n8nac` is never installed globally — every command runs as `npx --yes n8nac ...` (downloads the npm package on first run).

## 4. Giving n8nac API Access to n8n

For n8nac's workflow push/pull/execution commands to work, it needs to know n8n's own API key:

1. In the n8n UI, top right → **Settings → API**, create a new **API key** and copy it.
2. In your terminal:
   ```bash
   printf '%s' 'YOUR_API_KEY_HERE' | npx --yes n8nac env auth set --env local --api-key-stdin
   ```
   (The key is piped in via `printf | ... --api-key-stdin` rather than typed directly into the command, so it doesn't end up in plaintext shell history.)

## 5. Creating Credentials in n8n

All of the credentials below must be created **through the n8n UI**, inside `localhost:5678` (n8nac's CLI credential-creation commands are not reliable in this setup — see `CLAUDE.md`).

| Credential | Type | Where to get it | How to add it |
|---|---|---|---|
| OpenAI | `openAiApi` | platform.openai.com → API keys | n8n UI → Credentials → New → "OpenAi" |
| Jina AI | `jinaAiApi` | jina.ai → API key (has a free tier) | n8n UI → Credentials → New → "Jina AI" |
| Gmail | `gmailOAuth2` | Google OAuth (your own Gmail account) — do the Cloud Console setup in **5.1** first | n8n UI → Credentials → New → "Gmail" → enter Client ID/Secret → "Sign in with Google" |
| Google Sheets | `googleSheetsOAuth2Api` | Same Google account, same OAuth client | n8n UI → Credentials → New → "Google Sheets" → enter Client ID/Secret → "Sign in with Google" |
| SerpAPI (production) | `httpQueryAuth` (generic auth) | serpapi.com → API key | This type does **not** show up in the global catalog — open the `Get job results` node → Authentication → "Generic Credential Type" → "HTTP Query Auth" → "Create New" |
| JSearch/RapidAPI (test workflow) | `httpHeaderAuth` (generic auth) | rapidapi.com → JSearch (by OpenWeb Ninja) → subscribe to the Basic (Free) plan → `X-RapidAPI-Key` | Same pattern: open the `Get JSearch Results (TR)` node → Authentication → "Generic Credential Type" → "HTTP Header Auth" → "Create New" → Name: `X-RapidAPI-Key`, Value: your key |

**Note**: "Generic" auth types like `httpQueryAuth`/`httpHeaderAuth` are not listed in n8n's global "Add Credential" catalog — they can only be created from inside a node that uses them (an HTTP Request node's Authentication field).

**Note — Gmail OAuth token expires every 7 days**: the OAuth app in Google Cloud Console has intentionally been left in **Testing** mode (a deliberate choice — to switch it to Production: APIs & Services → OAuth consent screen → **Publish App**). In Testing mode, Google invalidates the refresh token every 7 days, so you'll need to periodically (roughly weekly) "reconnect" the Gmail credential in the n8n UI — n8n Credentials → "Gmail account" → "Sign in with Google" again.

### 5.1 Google Cloud Console: OAuth Client Setup for Gmail + Sheets

Gmail and Google Sheets credentials don't work with n8n's own "Sign in with Google" flow (that only exists on n8n Cloud) — for self-hosted n8n you need to **create your own OAuth client in Google Cloud Console**. One OAuth client can be reused for both the Gmail and Sheets credentials (no need to create it twice).

1. **Create a project** — [console.cloud.google.com](https://console.cloud.google.com) → the project dropdown at the top → **"New Project"** → give it a name (e.g. "n8n-job-search") → **Create**. Make sure the new project is selected in the dropdown.

2. **Enable the required APIs** — left sidebar **APIs & Services → Library**:
   - Search for **Gmail API**, open it, click **Enable**.
   - Search for **Google Sheets API**, open it, click **Enable**.
   - (Also enabling the **Google Drive API** is recommended, so the Sheets node's file-picker dropdown works.)

3. **Configure the OAuth consent screen** — **APIs & Services → OAuth consent screen**:
   - **User type**: choose "External" (the only option unless you have a Google Workspace account).
   - Enter **App name** (e.g. "n8n Job Search"), **User support email** (your own), **Developer contact email** (your own) → **Save and Continue**.
   - In the **Scopes** step, add `https://mail.google.com/` (or `gmail.send`) for Gmail, and `https://www.googleapis.com/auth/spreadsheets` for Sheets (n8n already requests these during the OAuth flow itself; Google sometimes wants them listed here too).
   - In the **Test users** step, **add your own Gmail address** — since the app stays in Testing mode (see the note above), only emails added here can sign in. Skipping this step results in an "access blocked" error.
   - **Save**.

4. **Create the OAuth Client ID** — **APIs & Services → Credentials → + Create Credentials → OAuth client ID**:
   - **Application type**: "Web application".
   - **Name**: e.g. "n8n local".
   - **Authorized redirect URIs**: paste in the **OAuth Redirect URL** exactly as shown on screen when you create a Gmail credential in n8n. For a local Docker setup this is usually `http://localhost:5678/rest/oauth2-credential/callback` — but copy/paste whatever value n8n actually shows you, to be safe.
   - Click **Create**.

5. **Get the Client ID / Client Secret** — a dialog shows the **Client ID** and **Client Secret**. **Copy both before closing this dialog** — the Client Secret won't be shown again the same way (if you lose it, you'll need to generate a new one).

6. **Enter them in n8n** — n8n UI → Credentials → the "Gmail" (or "Google Sheets") credential's **Client ID** / **Client Secret** fields → paste them in → **"Sign in with Google"** → sign in with the account you added as a test user in step 3 → approve the permissions.

## 6. Preparing the Google Sheet (production workflow only)

Create an empty Google Sheet, and in the first row write **exactly these headers, in this order**:

```
Tarih | URLS | İlan Adı | Şirket | Site | Çalışma Şekli | Ülke
```

Put the sheet's ID into the `documentId` field of the `AppendRowInSheet` and `GetAlreadyProcessedJobsUrls` nodes in `job-application-assistant.workflow.ts` (or open the node in the n8n UI and pick it from the dropdown).

## 7. Pushing the Workflows to n8n

```bash
npx --yes n8nac push workflows/local/job-application-assistant.workflow.ts --verify
npx --yes n8nac push workflows/local/jsearch-turkey-test.workflow.ts --verify
```

The `--verify` flag re-fetches the workflow from n8n after pushing, and shows node count plus any warnings/errors.

## 8. Entering Personal Information

In both workflows, the `⚙️ Configuration1` node (a Set node) holds personal info: `candidateName`, `cvUrlWeb`/`cvUrlPdf` (your CV needs a publicly accessible URL, e.g. a GitHub raw link), `linkedinUrl`, `githubUrl`, `targetLocation`, `remotePreference`, `minimumSalaryAnnual`. Update these with your own information and push again.

## 9. Running It

1. In the n8n UI (`localhost:5678`), open the workflow you want.
2. Click **"Execute Workflow"** in the top left (Manual Trigger).
3. Once it finishes (production: ~1-2 min, test workflow: ~30-60 sec):
   - Production: a digest email arrives, rows get added to Google Sheets.
   - Test workflow: a digest email arrives (Netherlands/UK .NET listings).

## 10. Useful CLI Commands

```bash
# Pull a workflow from n8n back to the local file (if you edited it by hand in the n8n UI)
npx --yes n8nac pull <workflowId>

# List recent executions
npx --yes n8nac execution list --workflow-id <workflowId> --limit 5 --json

# Inspect a full execution's data (including errors)
npx --yes n8nac execution get <executionId> --include-data --json

# Show which credentials a workflow needs
npx --yes n8nac workflow credential-required <workflowId> --json
```

## 11. Customizing for a Different Role/Person

This automation is currently hardwired for **a candidate looking for .NET/C# roles** — that's not something the profile-extraction agent figured out on its own, it's a **manually added rule**. If you want to adapt it for someone looking for a different role (e.g. "Frontend React Developer" or "Data Analyst"):

### 1. What to tell Claude Code

Something like this is enough: *"I'm not looking for .NET, I'm looking for [role/stack X] — remove the .NET/C# focus and the Java/Python ban from these three system messages and update them for [X]."* The same **3 nodes' system messages** need to change in both workflows:

| Node | Location in file | What needs to change |
|---|---|---|
| `🎯 Agent: Profile Generation` | `job-application-assistant.workflow.ts:827`, `jsearch-turkey-test.workflow.ts:363` | The sentence "...The candidate's primary stack is .NET / C# (Microsoft stack) — always include '.NET Developer' as a primaryRole. Never include Java or Python..." needs to be removed and rewritten for the target role |
| `🔎 Agent: Search Queries generation` | `job-application-assistant.workflow.ts:774,776`, `jsearch-turkey-test.workflow.ts:458-459` | The "MUST be a close variant of '.NET developer'" rule and the "NEVER generate queries for Java or Python" rule need to change for the new role |
| `🔎 Agent: Jobs selection` (production only) | `job-application-assistant.workflow.ts:932` | The "TECH STACK FIT" rule's `.NET, C#, ASP.NET` vs. `Ruby on Rails, Python-only, PHP-only, Java-only` comparison needs to change for the new role |

Everything else (profile reading, query generation mechanics, the digest email, writing to Sheets) is role-agnostic — no need to touch it.

### 2. Does the CV have to be hosted on GitHub?

No, GitHub isn't required — the only requirement is that the **CV has a publicly accessible, direct URL** (the `📖 Jina: Read Profile Source` node fetches this URL, and it can't get past a login/password wall). A GitHub raw link (what this project uses) was chosen just because it's **free and simple**. Alternatives:
- A CV link on your own personal website/portfolio page
- A Dropbox/Google Drive file shared as **"anyone with the link can view"**, using a direct-download URL (not Drive's normal share link — you'll likely need the `uc?export=download&id=...` format, otherwise Jina reads an HTML preview page instead of the actual PDF content)
- A page made public in Notion

In short: since a CV is meant to be shared in the first place, making it publicly reachable isn't a privacy concern here — what matters is just that it's **reachable in the right format**.

### 3. Free AI alternatives to OpenAI

Right now, the `OpenaiChatModel` node (`lmChatOpenAi`, model: `gpt-4o-mini`) is the brain behind every agent, and it's **paid, token-based**. Free alternatives exist as separate n8n "Chat Model" node types (they replace `OpenaiChatModel`, and every `.uses({ ai_languageModel: ... })` connection needs to point at the new node and its credential):

| Provider | n8n node type | Free tier | Note |
|---|---|---|---|
| **Google Gemini** | `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | Yes, quite generous (Gemini 2.0/2.5 Flash) — free API key from Google AI Studio | Easiest swap, quality is comparable to/better than OpenAI's gpt-4o-mini. Recommended first choice. |
| **Groq** | `@n8n/n8n-nodes-langchain.lmChatGroq` | Yes (open Llama/Mixtral models, very fast) | Free tier has rate limits, but they're plenty for this automation's volume |
| **Ollama** | `@n8n/n8n-nodes-langchain.lmChatOllama` | Fully free, unlimited — but **you have to run it yourself** (an extra Docker container, downloading models, CPU/GPU resource use) | The most independent option, but also the heaviest to set up |

To switch, an instruction like this is enough for Claude Code: *"Switch the OpenaiChatModel node to Gemini, use [X] credential, and update every agent's connection."*

## Known Limitations

- **No Turkey coverage**: both SerpAPI (Google Jobs) and JSearch (RapidAPI) are backed by Google's own "Jobs" feature, which is not active in Turkey — `country=tr` returns zero results in both APIs. This is not a configuration mistake; the data source itself has no coverage there.
- **JSearch's `language` parameter matters a lot**: in a non-English-speaking market like `country=nl`, leaving `language=en` returns zero results (it filters out listings in the local language); `language` needs to match the target country's language too (e.g. `nl` for the Netherlands).
- **JSearch free tier**: ~200 requests/month, no credit card required.
