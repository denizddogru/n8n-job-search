# Handoff Dökümanı — n8n Job Search Automation

Bu dosya, yeni bir Claude oturumunun bu projeye sıfırdan context kaybı olmadan devam edebilmesi için yazıldı. Detaylı teknik dokümantasyon için `n8n.md`, karar günlüğü için `CLAUDE.md`, sürüm geçmişi için `CHANGELOG.md`'ye bak. Bu dosya sadece **güncel durum + hemen sonraki adım** özetidir — CLAUDE.md'nin yerine geçmez, onu tekrar etmez.

Son güncelleme: 2026-08-02

## Proje Nedir
GitHub'dan alınan Fransa'ya özgü "Job Application Assistant" n8n workflow'u, SerpAPI (Google Jobs) tabanlı, manuel tetiklemeli bir iş başvurusu asistanına dönüştürüldü. Şu an sadece **uluslararası remote .NET/C# ilanlarını** buluyor, taslak cover letter üretiyor, tek bir özet e-posta + Google Sheets kaydı atıyor. Otomatik başvuru göndermiyor (dry-run / taslak modu).

- Local dosya: `workflows/local/job-application-assistant.workflow.ts` (n8n-as-code / `@n8n-as-code/transformer` ile TypeScript'ten n8n workflow JSON'ına derleniyor)
- Remote n8n instance: Docker, `localhost:5678`, workflow ID `1RApu6UgRmtLGFyT`
- Credential'lar bağlı: SerpAPI (`httpQueryAuth`), OpenAI (`gpt-4o-mini`), Jina AI, Gmail OAuth2, Google Sheets OAuth2

## Şu Anki Git Durumu
- Repo GitHub'a push edildi: private repo `denizddogru/n8n-job-search` (branch: `master`)
- **Uncommitted değişiklik var**: `workflows/local/job-application-assistant.workflow.ts` — bir önceki oturumda yapılan, henüz commit edilmemiş fix'ler:
  - 4 agent node'una (`AgentSearchQueriesGeneration`, `AgentProfileGeneration`, `AgentJobsSelection`, `AgentGenerateApplication`) `retryOnFail: true, maxTries: 2, waitBetweenTries: 2000` eklendi
  - 2 output parser node'una (`ParseProfileIntelligence1`, `StructuredOutputParser`) eksik `ai_languageModel` bağlantısı (`OpenaiChatModel`) eklendi — "A Model sub-node must be connected and enabled" hatasının kök nedeniydi
  - `StructuredOutputParser` ve `ParseProfileIntelligence1` şemalarına `autoFix: true` eklendi, `queries` şemasından `location` alanı kaldırıldı, `minItems/maxItems` 6-10'dan 4-6'ya düşürüldü
  - `AgentSearchQueriesGeneration` ve `AgentProfileGeneration` prompt'larına: .NET/C# odağı zorunlu kılındı, Java/Python yasaklandı, "AI Native / AI Driven" varyant kuralı eklendi
- Bu değişiklikler n8n'e push edildi ve doğrulandı (workflow clean validate ediyor) ama **git commit henüz yapılmadı** — kullanıcı önce commit/push'tan önce onay istiyor.

## Çözülmüş Sorunlar (tekrar keşfetme, `CLAUDE.md`'de tam liste var)
1-9 numaralı maddeler `CLAUDE.md` → "Önemli Kararlar ve Kök Neden Analizleri" bölümünde. Özet: `httpQueryAuth` credential fix, `gl=tr` desteklenmiyor → `gl=us/hl=en` sabitlendi, `alwaysOutputData`, context window aşımı (ilan kırpma), `apply_options[0].link` kullanımı (share_link değil), deprecated agent parametresi, dijest e-posta mimarisi, Sheets header sırası sorunu.

Ayrıca bu oturumdan önceki oturumda çözülenler (memory'den, henüz CLAUDE.md'ye tam işlenmemiş olabilir — kontrol et):
- **Memory bleed düzeltildi**: `MemoryApplicationPack.sessionKey`'e `$itemIndex` eklendi (loop'taki her ilan artık izole hafıza kullanıyor)
- **Tech-stack ağırlıklandırma eklendi**: `Agent: Jobs Selection` prompt'una zorunlu eşleşme kuralı eklendi
- **"Model sub-node must be connected" hatası** kök nedeniyle çözüldü (yukarıda, uncommitted diff'te)
- **Retry + autoFix** dört agent node'una ve tüm output parser'lara eklendi

## Açık Sorunlar / Kararlar (öncelik sırasına göre değil, hepsi bekliyor)

### 1. Türkçe iş ilanı desteği — BU OTURUMUN ANA KONUSU
Şu an sistem **sadece İngilizce, uluslararası remote ilanları buluyor** (Google Jobs'ın Türkiye desteği yok — `gl=tr` SerpAPI'de reddediliyor, bu Google'ın kendi kısıtı). Kullanıcı Türkçe/Türkiye iş ilanlarını da filtreleyebilmek istiyor. Bu oturumda brainstorm yapıldı, seçenekler araştırıldı (Reddit'te doğrudan ilgili tartışma bulunamadı, genel web araştırması yapıldı):

| Seçenek | Değerlendirme |
|---|---|
| **Apify "Kariyer.net Scraper" actörü** | En güçlü seçenek. Türkiye'nin en büyük iş ilanı sitesini doğrudan tarıyor, 50+ alanlı yapılandırılmış JSON. n8n'e entegrasyon: ayrı node gerekmez, Apify'ın REST API'si (`run-sync-get-dataset-items`) düz `httpRequest` node'uyla çağrılabilir — mevcut SerpAPI çağrı pattern'ine benzer. Kullanım başına ücretli. |
| **JSearch (RapidAPI/OpenWeb Ninja)** | Google Jobs'ın farklı bir aggregator'ı, SerpAPI'den farklı backend. Dokümantasyonda `country=tr` destekleniyor gibi görünüyor ama **teyit edilmedi** — ilk adım bir test çağrısı olmalı. Aynı zamanda Indeed/LinkedIn/Glassdoor/ZipRecruiter'ı da tarıyor. Mimari değişikliği minimal (sadece endpoint/credential). |
| **RapidAPI Indeed-özel realtime API'ler** | Daha dar kapsam, sadece Indeed, ülke filtresi belirsiz. JSearch'ten muhtemelen daha az esnek. |
| **İŞKUR (devlet)** | Resmi açık API bulunamadı. Sadece web sayfası (`esube.iskur.gov.tr`) var — entegrasyon ancak kırılgan HTML scraping ile mümkün, ToS belirsiz. **Önerilmiyor.** |

**Önemli düzeltme**: Mevcut sistemde "Indeed'den çekiyoruz" algısı yanlış — şu an Indeed linkleri sadece SerpAPI'nin Google Jobs sonuçlarındaki `apply_options` alanından geliyor (Google'ın kendi agregasyonu). Doğrudan bir Indeed API/scraping adımı yok.

**Karar bekleniyor**: Kullanıcı hangi seçeneği (Apify Kariyer.net / JSearch denemesi / başka) tercih ediyor, henüz seçilmedi. Sonraki oturum burada devam etmeli.

### 2. Otomatik başvuru sistemi (büyük, henüz kapsam kararı yok)
Önceki oturumda derin brainstorm yapıldı, 3 alt-sisteme ayrıldı:
- (A) CV'nin ilana göre otomatik güncellenmesi — mevcut sistemde CV PDF'i hiç değişmiyor, eski YAML→PDF pipeline silinmiş, yeniden kurulması gerekiyor
- (B) Otomatik başvuru gönderimi — ATS heterojenliği (Indeed, Monster, Greenhouse, Lever, Workday, BeBee, Jobgether) + CAPTCHA/login engelleri nedeniyle zor. Kapsam seçenekleri kullanıcıya sunuldu: (1) tam otonom, (2) yarı-otomatik dar kapsamlı, (3) sadece hazırlık/gönderim yok. **Kullanıcının cevabı bekleniyor.**
- (C) Başvurunun alındığının doğrulanması — sinyal tutarsız (bazı sitelerde e-posta, bazılarında hiçbir şey), en sona bırakıldı

Önerilen sıralama: B ile başla → A, B'nin bağımlılığı → C en son.

### 3. Gmail foldering
Özet e-postaların otomatik `n8n/job application` Gmail etiketine düşürülmesi isteniyor. Workflow'a dokunmadan Gmail tarafında filtre kurulumu önerildi, henüz uygulanmadı/teyit edilmedi.

### 4. Git commit/push
Yukarıdaki uncommitted diff commit edilmeyi bekliyor — kullanıcı önce bug'ları/kararları netleştirmek istiyor.

## Kullanıcı Tercihleri (nasıl çalışmak istiyor)
- Değişiklik yapmadan önce plan sunulmasını istiyor, mantıklı bir yol çizilmeli
- Bazen "şu an çözüm istemiyorum, sadece konuşalım" diyor — o zaman sadece analiz/teşhis, kod değişikliği yok
- git commit/push gibi görünür aksiyonlardan önce onay istiyor
- İlk aşamada gerçek başvuru göndermek yerine ilanları görüntülemek/gözden geçirmek istiyor (dry-run zihniyeti)
- Brainstorm isterken net teyit edilmemiş bilgiyi ("test edilmedi", "teyit edilmedi" gibi) açıkça işaretlemesini istiyor, kesin bilgi gibi sunulmasını istemiyor

## Yeni Oturuma Öneri
Muhtemel ilk soru: "Türkçe ilan seçeneklerinden hangisiyle devam edelim?" — kullanıcı cevap vermediyse önce buradan devam et, cevap verdiyse doğrudan o yönde teknik plan yaz (n8n-architect skill'i workflow node ekleme/düzenleme için kullanılabilir).
