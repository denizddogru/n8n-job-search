# n8n Job Application Assistant — Teknik Doküman

Bu doküman, `workflows/local/job-application-assistant.workflow.ts` dosyasındaki n8n workflow'unun ne yaptığını, hangi node'un ne işe yaradığını ve veri akışının nasıl işlediğini anlatır. Kaynak kodun kendisi tek doğruluk kaynağıdır (source of truth); bu dosya sadece okunabilir bir harita sağlar.

- Remote workflow ID: `1RApu6UgRmtLGFyT`
- n8n instance: `localhost:5678` (Docker, n8n-as-code ile yönetiliyor)
- Tetikleyici: **Manual Trigger** (otomatik zamanlanmış değil, kullanıcı elle çalıştırıyor)

## Genel Akış (yüksek seviye)

1. **Profil okuma** — CV/LinkedIn/GitHub gibi kaynaklardan (Jina AI ile) profil verisi çekilir.
2. **Profil analizi** — AI, bu veriden birincil/ikincil roller, çekirdek beceriler, arama sorguları üretir.
3. **Arama sorgusu üretimi** — AI, Google Jobs için 4-6 adet "remote" odaklı arama sorgusu üretir.
4. **İlan çekme** — Her sorgu için SerpAPI üzerinden Google Jobs sonuçları çekilir.
5. **Dedup** — Google Sheets'te daha önce işlenmiş ilanlar elenir.
6. **İlan seçimi** — AI, adayın profiline en uygun (en fazla `maxJobsToProcess` adet) ilanı seçer.
7. **Başvuru paketi üretimi** — Seçilen her ilan için AI, kişiselleştirilmiş bir cover letter üretir (loop içinde, ilan başına bir kez).
8. **Raporlama** — Tüm üretilen paketler tek bir özet e-postada birleştirilip Gmail ile gönderilir; aynı zamanda Google Sheets'e (ilan başına bir satır olacak şekilde) toplu yazılır.

## Neden SerpAPI `gl=us` / `hl=en` ve "remote" zorunlu?

Google'ın "Google Jobs" özelliği (SerpAPI'nin `google_jobs` engine'inin kazıdığı arayüz) **Türkiye'de aktif değil** (Google'ın resmi desteklenen ülke listesinde Türkiye yok). Bu yüzden İstanbul/Türkiye konum bazlı hiçbir sorgu sonuç döndürmüyor — parametre hatası değil, bölgesel kısıtlama. Çözüm: `gl=us`, `hl=en` sabitlenmiş, `location` parametresi tamamen kaldırılmış, ve arama sorgusu üreten AI ajanı sadece `"remote"` kelimesini içeren, konumsuz sorgular üretecek şekilde talimatlandırılmış. Sonuç: İstanbul'a özgü değil, **global/uluslararası remote pozisyonlar**.

## Node'lar (işlevlerine göre gruplanmış)

### Tetikleyici ve konfigürasyon
- **Manual Trigger** — Workflow'u elle başlatır.
- **⚙️ Configuration1** (`set` node) — Tüm kişisel/işlevsel ayarların tutulduğu tek yer: `candidateName`, `candidateEmail`, `candidatePhone`, `targetLocation`, `remotePreference`, `minimumSalaryAnnual`, `maxJobsToProcess` (şu an **3**), `cvUrlWeb`, `linkedinUrl`, `githubUrl`, `targetCountryCode`, `targetLanguageCode`. GitHub/PDF pipeline'ından kalan kullanılmayan alanlar da burada duruyor (ileride geri eklenirse diye).

### Profil okuma
- **🧾 Build Profile Sources** (`code`) — CV/LinkedIn/GitHub URL'lerini bir listeye çevirir.
- **Loop Over profile sources** (`splitInBatches`) — Her kaynağı sırayla işler.
- **📖 Jina: Read Profile Source** (`jinaAi`) — Her URL'yi Jina AI ile okuyup düz metne çevirir.
- **📦 Aggregate: Profile Sources** (`aggregate`) — Tüm okunan kaynakları tek bir sonuçta birleştirir.

### Profil analizi ve arama stratejisi
- **🎯 Agent: Profile Generation** (AI agent) — Profil verisinden `primaryRoles`, `secondaryRoles`, `coreSkills`, `seniority`, `searchQueries`, `exclusions`, `locationQuery`, `rationale` üretir.
- **💾 Memory: Profile Intelligence1** — Bu ajanın konuşma hafızası (execution başına).
- **📋 Parse: Profile Intelligence1** — Yapılandırılmış çıktı parser'ı.
- **🔎 Agent: Search Queries generation** — Profil stratejisinden 4-6 adet `{q}` (remote odaklı) arama sorgusu üretir.
- **💾 Memory: Profile Intelligence**, **Structured Output Parser** — bu ajanın hafıza/parser çifti.
- **🧾 Build Search Queries** (`code`) — Üretilen sorguları `{q}` dizisine çevirir.

### İlan çekme
- **Loop Over Job results responses** (`splitInBatches`) — Her sorguyu sırayla SerpAPI'ye gönderir.
- **Get job results** (`httpRequest`, SerpAPI credential: `httpQueryAuth`) — `https://serpapi.com/search?engine=google_jobs&q=...&gl=us&hl=en`.
- **📦 Aggregate: Jobs** (`aggregate`) — Tüm sorgu sonuçlarını tek bir listede birleştirir.

### Dedup ve ön-işleme
- **Get already processed jobs urls** (`googleSheets`, `alwaysOutputData: true`) — Sheet boş olsa bile downstream node'ların atlanmaması için bu flag zorunlu.
- **Remove already processed jobs** (`code`) — İki iş yapar:
  1. Sheet'teki `URLS` sütunundan daha önce işlenmiş ilanları normalize edip bir Set'e toplar.
  2. Ham SerpAPI ilanlarını **gerçek başvuru linkiyle** (`apply_options[0].link` — SerpAPI'nin döndürdüğü site bazlı gerçek başvuru URL'leri; `share_link` **kullanılmaz**, çünkü o Google'ın kendi iç "job carousel" deep-link'idir ve tek başına açıldığında çalışmaz) zenginleştirir, gereksiz ağır alanları (job_highlights, apply_options'ın tamamı, thumbnail, extensions) atar, aynı ilanın bu çalıştırma içinde tekrarını da eler, ve toplam aday sayısını **25 ile sınırlar** (context window taşmasını önlemek için).

### İlan seçimi
- **🔎 Agent: Jobs selection** — Adayın profiline göre en fazla `maxJobsToProcess` ilan seçer. Her ilan için: `jobId`, `title`, `company`, `url` (gerçek başvuru linki), `applySite`, `location`, `workArrangement` (`detected_extensions.work_from_home`'dan), `country` (açıklamadan best-effort çıkarım, yoksa "Belirtilmemiş"), `whyMatch`.
- **💾 Memory: Search Indeed**, **📋 Parse: Search Results** — hafıza/parser çifti.
- **🧾 Build Selected Jobs Source** (`code`) — Seçilen ilanları `{job: {...}}` şeklinde ayrı item'lara böler (loop için).

### Başvuru paketi üretimi (loop, ilan başına)
- **Loop Over Application** (`splitInBatches`) — Her seçilen ilan için sırayla:
  - **✍️ Agent: Generate Application** — Adayın profili + ilan verisinden bir cover letter üretir (`email_subject`, `salutation`, `letter_body`, `key_selling_points`, ve `job_url`/`job_title`/`company`/`applySite`/`workArrangement`/`country` alanlarını JOB_DATA'dan **olduğu gibi kopyalar**).
  - **💾 Memory: Application Pack**, **📋 Parse: Application Pack** — hafıza/parser çifti. **Bilinen kısıt**: hafıza şu an execution başına tek (tüm ilanlar aynı oturumu paylaşıyor) — bu, sonraki ilanlarda prompt şişmesine ve bazen boş model çıktısına yol açabiliyor (bkz. "Bilinen Sorunlar").
  - Sonuç loop'a geri döner (`LoopOverApplication.in(0)`), bir sonraki ilana geçilir.

### Toplu raporlama (loop bittikten sonra, tek seferlik)
- **AppendRowInSheet** — Loop'un `out(0)` (bitti) çıkışından gelen **her ilan için bir satır**, tek bir batch API çağrısıyla Google Sheets'e yazılır. Sütunlar: `Tarih`, `URLS`, `İlan Adı`, `Şirket`, `Site`, `Çalışma Şekli`, `Ülke`.
- **📦 Aggregate: Job Applications** — Aynı `out(0)` çıkışından gelen tüm ilanları tek bir item'da toplar (dijest mail için).
- **🧾 Build Digest Email** (`code`) — Toplanan tüm ilanlardan **tek bir HTML özet e-postası** kurar (`subject`, `html`).
- **📧 Send: Application Output** (`gmail`) — Bu özet e-postayı `denizdogru97@gmail.com` adresine gönderir (kullanıcı hem gönderen hem alıcı — bu bir taslak/özet, otomatik gerçek başvuru göndermez).

## Credential'lar

| Node | Credential türü | Amaç |
|---|---|---|
| Get job results | `httpQueryAuth` (SerpAPI account) | Google Jobs arama |
| 📖 Jina: Read Profile Source | `jinaAiApi` | Profil sayfalarını okuma |
| OpenAI Chat Model | `openAiApi` | Tüm AI ajanlarının LLM'i (gpt-4o-mini) |
| 📧 Send: Application Output | `gmailOAuth2` | E-posta gönderimi (kullanıcının kendi Gmail hesabı, ücretsiz) |
| Append row in sheet / Get already processed jobs urls | `googleSheetsOAuth2Api` | Dedup + loglama |

## Bilinen Sorunlar / Açık Konular

1. **Memory bleed (Application Pack)** — `MemoryApplicationPack.sessionKey` execution başına tek; loop'taki her ilan aynı hafızayı paylaşıyor, bu da sonraki ilanlar için prompt token sayısını katlıyor (gözlemlenen: 1.5K → 16K token) ve bazen modelin boş/geçersiz JSON döndürmesine yol açıyor. **Önerilen düzeltme**: `sessionKey`'e `$itemIndex` eklemek.
2. **İlan seçim kalitesi** — `Agent: Jobs selection`, ilan başlığına göre eşleştiriyor ama açıklamadaki gerçek teknoloji yığınını (örn. Ruby on Rails vs .NET/C#) yeterince ağırlıklandırmıyor; başlığı uyan ama stack'i uymayan ilanlar seçilebiliyor.
3. **Pre-existing validation uyarısı** — `📖 Jina: Read Profile Source` node'unda `requestOptions` parametresi n8n tarafından "unknown" olarak işaretleniyor (orijinal şablondan kalma, workflow'u bloklamıyor).
4. **Google Sheets header'ı manuel** — Sheet'in 1. satırına şu 7 başlığın tam bu sırayla girilmesi gerekiyor: `Tarih`, `URLS`, `İlan Adı`, `Şirket`, `Site`, `Çalışma Şekli`, `Ülke`. Bu otomatik yazılmıyor (n8n'in Sheets node'u header sırasını kendi içinde cache'liyor, uyuşmazlıkta hata veriyor).

## Kapsam Dışı (Ertelendi)

- CV/GitHub → PDF derleme pipeline'ı (orijinal Fransız şablondaki ~15 node) kaldırıldı, geri istenirse ayrı bir görev.
- Gmail'de gelen özet maillerin otomatik bir etikete/klasöre düşürülmesi — Gmail tarafında bir filtre kurulması gerekiyor (workflow'a dokunmuyor).
