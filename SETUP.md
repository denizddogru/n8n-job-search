# Kurulum ve Çalıştırma Rehberi

Bu doküman, bu projeyi sıfırdan (boş bir makinede) alıp n8n otomasyonlarını çalıştırılabilir hale getirmek için gereken **her adımı** listeler. Workflow'ların ne yaptığına dair teknik detay için `n8n.md`'ye, proje geçmişi için `CLAUDE.md`'ye bak.

## 1. Ön Koşullar

- **Docker Desktop** (n8n'i container olarak çalıştırmak için) — https://www.docker.com/products/docker-desktop/
- **Node.js + npm** (n8n-as-code CLI'ı `npx` ile çalıştırmak için, global kurulum gerekmez) — bu projede test edilen sürüm: Node v25, npm 11
- Bir **RapidAPI hesabı** (JSearch test workflow'u için, ücretsiz, kredi kartsız)
- Bir **OpenAI API key** (ücretli, token bazlı — gpt-4o-mini kullanılıyor)
- Bir **Gmail hesabı** (OAuth2, ücretsiz)
- Bir **Google Sheets** dosyası (ücretsiz, dedup/loglama için — sadece production workflow'da kullanılıyor)
- (Opsiyonel, production workflow için) Bir **SerpAPI hesabı** (Google Jobs araması için, aylık ~250 ücretsiz istek)

## 2. n8n'i Docker ile Ayağa Kaldırma

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

- `-v ~/.n8n:/home/node/.n8n` — n8n'in tüm verisini (workflow'lar, credential'lar, execution geçmişi) host makinede kalıcı tutar; container silinse/yeniden başlatılsa bile veri kaybolmaz.
- Container ayaktayken tarayıcıdan **http://localhost:5678** adresine git.
- İlk açılışta n8n bir **owner hesabı** oluşturmanı ister (e-posta + şifre) — bu hesap sadece bu local n8n instance'ına özel, üçüncü bir servise bağlı değil.

Container'ı durdurmak/tekrar başlatmak için:
```bash
docker stop n8n
docker start n8n
```

## 3. Projeyi Klonlama ve CLI Kontrolü

```bash
git clone https://github.com/denizddogru/n8n-job-search.git
cd n8n-job-search
```

`n8nac-config.json` dosyası zaten `localhost:5678`'e işaret edecek şekilde repoda hazır geliyor (environment adı: `local`, workflow'ların path'i: `workflows/local`). Ek bir konfigürasyon gerekmiyor.

`n8nac` global kurulmuyor, her komut `npx --yes n8nac ...` ile çalıştırılıyor (ilk çalıştırmada npm paketini indirir).

## 4. n8n'e API Erişimi Tanımlama

n8nac'ın workflow push/pull/execution komutlarını çalıştırabilmesi için n8n'in kendi API key'ini tanıması gerekiyor:

1. n8n UI'da sağ üstten **Settings → API** bölümüne git, yeni bir **API key** oluştur ve kopyala.
2. Terminalde:
   ```bash
   printf '%s' 'BURAYA_API_KEY' | npx --yes n8nac env auth set --env local --api-key-stdin
   ```
   (Key'i doğrudan komut satırına yazmak yerine `printf | ... --api-key-stdin` deseni kullanılıyor, shell geçmişinde düz metin olarak kalmasın diye.)

## 5. Credential'ları n8n'de Oluşturma

Aşağıdaki credential'ların hepsi **n8n UI üzerinden**, `localhost:5678` içinde oluşturulmalı (n8nac CLI'ın credential oluşturma komutları bu ortamda güvenilir sonuç vermiyor — bkz. `CLAUDE.md`).

| Credential | Tür | Nereden alınır | Nasıl eklenir |
|---|---|---|---|
| OpenAI | `openAiApi` | platform.openai.com → API keys | n8n UI → Credentials → New → "OpenAi" |
| Jina AI | `jinaAiApi` | jina.ai → API key (ücretsiz tier var) | n8n UI → Credentials → New → "Jina AI" |
| Gmail | `gmailOAuth2` | Google OAuth (kendi Gmail hesabın) — önce **5.1**'deki Cloud Console kurulumu yapılmalı | n8n UI → Credentials → New → "Gmail" → Client ID/Secret gir → "Sign in with Google" |
| Google Sheets | `googleSheetsOAuth2Api` | Aynı Google hesabı, aynı OAuth client | n8n UI → Credentials → New → "Google Sheets" → Client ID/Secret gir → "Sign in with Google" |
| SerpAPI (production) | `httpQueryAuth` (genel auth) | serpapi.com → API key | Bu tür global katalogda **görünmez** — `Get job results` node'unu aç → Authentication → "Generic Credential Type" → "HTTP Query Auth" → "Create New" |
| JSearch/RapidAPI (test workflow) | `httpHeaderAuth` (genel auth) | rapidapi.com → JSearch (OpenWeb Ninja) → Basic (Free) plana subscribe ol → `X-RapidAPI-Key` | Aynı şekilde: `Get JSearch Results (TR)` node'unu aç → Authentication → "Generic Credential Type" → "HTTP Header Auth" → "Create New" → Name: `X-RapidAPI-Key`, Value: kendi anahtarın |

**Not**: `httpQueryAuth`/`httpHeaderAuth` gibi "generic" auth tipleri n8n'in global "Add Credential" kataloğunda listelenmez — sadece onu kullanan bir node'un (HTTP Request node'u) Authentication alanından, o node'un içinden oluşturulabilir.

**Not — Gmail OAuth token'ı 7 günde bir düşüyor**: Google Cloud Console'daki OAuth uygulaması **Testing** modunda bırakıldı (bilinçli tercih — Production'a geçirmek isteniyorsa: APIs & Services → OAuth consent screen → **Publish App**). Testing modda Google, refresh token'ı 7 günde bir geçersiz kılıyor; bu yüzden n8n UI'da Gmail credential'ını periyodik olarak (yaklaşık haftada bir) "reconnect" etmen gerekiyor — n8n Credentials → "Gmail account" → tekrar "Sign in with Google".

### 5.1 Google Cloud Console: Gmail + Sheets için OAuth Client Kurulumu

Gmail ve Google Sheets credential'ları n8n'in kendi "Sign in with Google" akışıyla çalışmıyor (bu sadece n8n Cloud'da var) — self-hosted n8n'de **kendi OAuth client'ını Google Cloud Console'da oluşturman gerekiyor**. Tek bir OAuth client, hem Gmail hem Sheets credential'ı için kullanılabilir (tekrar oluşturmana gerek yok).

1. **Proje oluştur** — [console.cloud.google.com](https://console.cloud.google.com) → üstteki proje dropdown'ından **"New Project"** → bir isim ver (örn. "n8n-job-search") → **Create**. Oluşan projeyi dropdown'dan seçili hale getir.

2. **Gerekli API'leri etkinleştir** — sol menü **APIs & Services → Library**:
   - **Gmail API**'yi ara, aç, **Enable**'a bas.
   - **Google Sheets API**'yi ara, aç, **Enable**'a bas.
   - (Sheets node'undaki dosya seçim dropdown'ının çalışması için **Google Drive API**'yi de etkinleştirmen önerilir.)

3. **OAuth consent screen'i yapılandır** — **APIs & Services → OAuth consent screen**:
   - **User type**: "External" seç (Google Workspace hesabın yoksa tek seçenek bu).
   - **App name** (örn. "n8n Job Search"), **User support email** (kendi e-postan), **Developer contact email** (kendi e-postan) gir → **Save and Continue**.
   - **Scopes** adımında Gmail için `https://mail.google.com/` (veya `gmail.send`), Sheets için `https://www.googleapis.com/auth/spreadsheets` scope'larını ekle (n8n bunları OAuth akışı sırasında zaten talep eder; Google bazen bu adımda listede görmeni ister).
   - **Test users** adımında **kendi Gmail adresini ekle** — uygulama Testing modunda kaldığı için (bkz. yukarıdaki not), sadece buraya eklenen e-postalarla giriş yapılabilir. Bu adım atlanırsa "access blocked" hatası alınır.
   - **Save**.

4. **OAuth Client ID oluştur** — **APIs & Services → Credentials → + Create Credentials → OAuth client ID**:
   - **Application type**: "Web application".
   - **Name**: örn. "n8n local".
   - **Authorized redirect URIs**: n8n'de Gmail credential'ı oluştururken ekranda gösterilen **OAuth Redirect URL**'i buraya birebir yapıştır. Local Docker kurulumu için bu genelde `http://localhost:5678/rest/oauth2-credential/callback` şeklindedir — ama garantiye almak için n8n'in gösterdiği değeri kopyala/yapıştır kullan.
   - **Create**'e bas.

5. **Client ID / Client Secret'ı al** — açılan pencerede **Client ID** ve **Client Secret** görünür. **Bu pencereyi kapatmadan önce ikisini de kopyala** — Client Secret bir daha aynı şekilde gösterilmiyor (kaybedersen yeni bir secret oluşturman gerekir).

6. **n8n'e gir** — n8n UI → Credentials → "Gmail" (veya "Google Sheets") credential'ının **Client ID** / **Client Secret** alanlarına yapıştır → **"Sign in with Google"** → 3. adımda test user olarak eklediğin hesapla giriş yap → izinleri onayla.

## 6. Google Sheet Hazırlama (sadece production workflow için)

Boş bir Google Sheet oluştur, ilk satırına **tam bu sırayla** şu başlıkları yaz:

```
Tarih | URLS | İlan Adı | Şirket | Site | Çalışma Şekli | Ülke
```

Sheet'in ID'sini `job-application-assistant.workflow.ts` içindeki `AppendRowInSheet` ve `GetAlreadyProcessedJobsUrls` node'larının `documentId` alanına yaz (veya n8n UI'dan node açıp dropdown'dan seç).

## 7. Workflow'ları n8n'e Push Etme

```bash
npx --yes n8nac push workflows/local/job-application-assistant.workflow.ts --verify
npx --yes n8nac push workflows/local/jsearch-turkey-test.workflow.ts --verify
```

`--verify` bayrağı push sonrası workflow'u n8n'den tekrar çeker, node sayısını ve olası uyarıları/hataları gösterir.

## 8. Kişisel Bilgileri Girme

Her iki workflow'da da `⚙️ Configuration1` node'u (Set node) kişisel bilgileri tutar: `candidateName`, `cvUrlWeb`/`cvUrlPdf` (CV'nin herkese açık bir URL'i olmalı, örn. GitHub raw link), `linkedinUrl`, `githubUrl`, `targetLocation`, `remotePreference`, `minimumSalaryAnnual`. Bunları kendi bilgilerinle güncelleyip tekrar push et.

## 9. Çalıştırma

1. n8n UI'da (`localhost:5678`) ilgili workflow'u aç.
2. Sol üstten **"Execute Workflow"** butonuna bas (Manual Trigger).
3. Workflow bitince (production için ~1-2 dk, test workflow için ~30-60 sn):
   - Production: özet e-posta gelir, Google Sheets'e satırlar eklenir.
   - Test workflow: özet e-posta gelir (Hollanda/İngiltere .NET ilanları).

## 10. Faydalı CLI Komutları

```bash
# Workflow'u n8n'den local dosyaya çek (n8n UI'da elle değişiklik yaptıysan)
npx --yes n8nac pull <workflowId>

# Son çalıştırmaları listele
npx --yes n8nac execution list --workflow-id <workflowId> --limit 5 --json

# Bir çalıştırmanın tam verisini (hata dahil) incele
npx --yes n8nac execution get <executionId> --include-data --json

# Bir workflow'un hangi credential'lara ihtiyaç duyduğunu göster
npx --yes n8nac workflow credential-required <workflowId> --json
```

## 11. Farklı Bir Rol/Kişi İçin Özelleştirme

Bu otomasyon şu an **.NET/C# arayan bir aday** için sabitlenmiş durumda — bu sabitleme profil çıkarım ajanının kendiliğinden bulduğu bir şey değil, **elle eklenmiş bir kural**. Başka bir rol (örn. "Frontend React Developer" veya "Data Analyst") arayan biri için otomasyonu uyarlamak istersen:

### 1. Claude Code'a ne söylemeli

Şuna benzer bir talimat yeterli: *"Ben .NET değil, [X rolü/stack'i] arıyorum, bu üç sistem mesajındaki .NET/C# odağını ve Java/Python yasağını kaldırıp [X]'e göre güncelle."* Değişmesi gereken, her iki workflow'da da aynı **3 node'un sistem mesajı**:

| Node | Dosyadaki konum | Ne değişmeli |
|---|---|---|
| `🎯 Agent: Profile Generation` | `job-application-assistant.workflow.ts:827`, `jsearch-turkey-test.workflow.ts:363` | ".NET / C# (Microsoft stack) — always include '.NET Developer' as a primaryRole. Never include Java or Python..." cümlesi kaldırılıp hedef role göre yeniden yazılmalı |
| `🔎 Agent: Search Queries generation` | `job-application-assistant.workflow.ts:774,776`, `jsearch-turkey-test.workflow.ts:458-459` | "MUST be a close variant of '.NET developer'" ve "NEVER generate queries for Java or Python" kuralları yeni role göre değişmeli |
| `🔎 Agent: Jobs selection` (sadece production'da var) | `job-application-assistant.workflow.ts:932` | "TECH STACK FIT" kuralındaki `.NET, C#, ASP.NET` / `Ruby on Rails, Python-only, PHP-only, Java-only` karşılaştırması yeni role göre değişmeli |

Bunun dışında kalan her şey (profil okuma, sorgu üretimi, dijest e-posta, Sheets yazımı) role bağımlı değil — dokunmaya gerek yok.

### 2. CV GitHub'a mı yüklenmeli?

Hayır, GitHub zorunlu değil — tek şart **CV'nin herkese açık, doğrudan erişilebilir bir URL'i olması** (`📖 Jina: Read Profile Source` node'u bu URL'i okuyor, giriş/parola gerektiren bir sayfa okuyamaz). GitHub raw link (bizim kullandığımız yöntem) sadece **ücretsiz ve basit** olduğu için tercih edildi. Alternatifler:
- Kişisel bir web sitesi/portfolyo sayfasındaki CV linki
- Dropbox/Google Drive'da **"bağlantıya sahip olan herkes görüntüleyebilir"** olarak paylaşılmış, doğrudan indirme linki (Drive'ın normal paylaşım linki değil — "uc?export=download&id=..." formatına çevrilmesi gerekebilir, aksi halde Jina bir HTML önizleme sayfası okur, PDF içeriğini değil)
- Notion'da public yapılmış bir sayfa

Kısacası: CV verisi zaten paylaşılmak üzere var olduğu için "herkese açık olması" bir gizlilik riski değil, sadece **doğru formatta erişilebilir olması** önemli.

### 3. OpenAI yerine ücretsiz AI seçenekleri

Şu an `OpenaiChatModel` node'u (`lmChatOpenAi`, model: `gpt-4o-mini`) tüm ajanların beynini oluşturuyor ve **token bazlı ücretli**. Ücretsiz alternatifler (n8n'de ayrı bir "Chat Model" node tipi olarak mevcut, `OpenaiChatModel` node'unun yerine geçer, credential'ı ve tüm `.uses({ ai_languageModel: ... })` bağlantıları değişir):

| Sağlayıcı | n8n node tipi | Ücretsiz tier | Not |
|---|---|---|---|
| **Google Gemini** | `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | Evet, oldukça cömert (Gemini 2.0/2.5 Flash) — Google AI Studio'dan ücretsiz API key | En kolay geçiş, kalite OpenAI gpt-4o-mini'ye yakın/üstün. Önerilen ilk seçenek. |
| **Groq** | `@n8n/n8n-nodes-langchain.lmChatGroq` | Evet (Llama/Mixtral açık modelleri, çok hızlı) | Ücretsiz tier'da rate limit var ama bu otomasyonun hacmi için yeterli |
| **Ollama** | `@n8n/n8n-nodes-langchain.lmChatOllama` | Tamamen ücretsiz, sınırsız — ama **kendi makinende çalıştırman** gerekiyor (ek bir Docker container, model indirme, CPU/GPU kaynak tüketimi) | En bağımsız seçenek ama kurulumu en ağır olan |

Değiştirmek istersen Claude Code'a şöyle bir talimat yeterli: *"OpenaiChatModel node'unu Gemini'ye çevir, [X] credential'ını kullan, tüm ajanların bağlantısını güncelle."*

## Bilinen Kısıtlar

- **Türkiye kapsamı yok**: Hem SerpAPI (Google Jobs) hem JSearch (RapidAPI), Google'ın kendi "Jobs" özelliğine dayanıyor ve bu özellik Türkiye'de aktif değil — `country=tr` her iki API'de de sıfır sonuç döndürüyor. Bu bir konfigürasyon hatası değil, veri kaynağının kapsam dışı olması.
- **JSearch `language` parametresi kritik**: `country=nl` gibi İngilizce-olmayan bir pazarda `language=en` bırakılırsa sonuçlar sıfır dönüyor (o ülkenin kendi dilindeki ilanlar filtreleniyor); `language` de hedef ülkenin diline göre ayarlanmalı (örn. Hollanda için `nl`).
- **JSearch free tier**: ayda ~200 istek, kredi kartsız.
