# n8n Job Search Automation — Proje Notları

## Amaç
GitHub'dan alınan "Job Application Assistant" n8n workflow'unu manuel tetiklemeli (Manual Trigger) bir iş başvurusu otomasyonuna dönüştürmek. Orijinal workflow Fransa'ya özgü France Travail API'sini kullanıyordu; bu proje onu SerpAPI (Google Jobs) tabanlı, Türkiye/İstanbul odaklı bir sürüme çeviriyor.

## Mevcut Durum
- `job-search-workflow.json` dosyası güncellendi: France Travail bağımlılığı kaldırıldı, SerpAPI (Google Jobs) entegrasyonu eklendi.
- CV/GitHub pipeline (branch oluşturma, YAML düzenleme, GitHub Action ile PDF derleme) **kaldırıldı** — 51 node'dan 30 node'a indirildi. Bu pipeline'ı sonradan geri eklemek istersek ayrı bir görev olarak ele alınacak.
- `⚙️ Configuration1` node'undaki GitHub değişkenleri (githubOwner, githubToken, vb.) şu an kullanılmıyor ama pipeline'ı geri eklersek diye dosyada bırakıldı.
- Şu anki e-posta gönderim adımı (`📧 Send: Application Output`) PDF eki göndermiyor; sadece HTML gövdeli başvuru metni gönderiyor.

## Yapılacaklar (öncelik sırasıyla)

### 1. n8n instance kurulumu
- [ ] Docker ile n8n ayağa kaldır (n8n-as-code plugin ile birlikte çalışacak şekilde)
- [ ] `job-search-workflow.json` dosyasını n8n'e import et (Import from File)
- [ ] Workflow adını, tag'lerini gerekiyorsa düzenle

### 2. Credential kurulumu (n8n arayüzünden, OAuth gerektirenler tarayıcı onayı ister)
- [ ] **SerpAPI**: Query Auth credential oluştur, key adı `api_key`, değer SerpAPI hesabından alınan anahtar. `Get job results` node'undaki credential referansını (`REPLACE_WITH_SERPAPI_CREDENTIAL_ID`) bu yeni credential ile değiştir.
- [ ] **OpenAI**: $5 kredi mevcut. `Google Gemini Chat Model` node'unu `OpenAI Chat Model` node'u ile değiştir, model olarak `gpt-4o-mini` seç (maliyet kontrolü için). Bu node 6 farklı ajana bağlı (`ai_languageModel` bağlantılarına dikkat — hepsini yeni node'a yeniden bağlamak gerekiyor).
- [ ] **Gmail**: OAuth2 credential oluştur, `📧 Send: Application Output` node'una bağla, `sendTo` alanını gerçek adresle güncelle.
- [ ] **Google Sheets**: OAuth2 credential oluştur, `Get already processed jobs urls` ve `Append row in sheet` node'larındaki `documentId`/`sheetName` alanlarını gerçek Google Sheet ile değiştir (şu an placeholder `xxxx`).
- [ ] **Jina AI**: API key credential oluştur, `📖 Jina: Read Profile Source` node'una bağla (CV/LinkedIn/GitHub sayfalarını okumak için).

### 3. Kişisel/işlevsel yapılandırma
- [ ] `⚙️ Configuration1` node'undaki tüm placeholder değerleri gerçek verilerle değiştir: candidateName, candidateEmail, candidatePhone, targetLocation, remotePreference, minimumSalaryAnnual, maxJobsToProcess, cvUrlWeb, linkedinUrl, githubUrl.
- [ ] `targetCountryCode` (tr) ve `targetLanguageCode` (tr) değerlerini SerpAPI'nin `gl`/`hl` parametrelerine uygunluğu açısından teyit et.
- [ ] Tetikleyiciyi `🕘 Schedule Trigger`'dan **Manual Trigger**'a çevir (kullanıcı manuel tetikleme istiyor). Schedule Trigger node'unu Manual Trigger ile değiştir, bağlantıyı `⚙️ Configuration1`'e yeniden kur.

### 4. Test ve doğrulama
- [ ] `🔎 Agent: Search Queries generation` node'unu tek başına çalıştırıp üretilen sorguların mantıklı olduğunu kontrol et (6-10 adet, tekrar yok, İstanbul/hybrid/remote varyasyonları doğru).
- [ ] `Get job results` node'unun SerpAPI'den gerçek veri döndürdüğünü doğrula (jobs_results dizisi dolu mu).
- [ ] `🔎 Agent: Jobs selection` node'unun `jobs_results` alanlarını (job_id, title, company_name, location, description, related_links) doğru okuduğunu kontrol et.
- [ ] Uçtan uca bir manuel çalıştırma yap, e-postanın doğru içerik ve formatla geldiğini kontrol et.
- [ ] Google Sheets'e satırın doğru eklendiğini ve bir sonraki çalıştırmada aynı ilanın tekrar işlenmediğini doğrula.

### 5. Sonraki adım (opsiyonel, ertelendi)
- [ ] CV/GitHub pipeline'ını (branch oluşturma, YAML düzenleme, GitHub Action ile PDF derleme, PDF'i e-postaya ekleme) geri eklemek istenirse, orijinal workflow'daki ilgili ~15 node referans alınarak yeniden kurulacak. Bu adım şimdilik kapsam dışı.

## Teknik Notlar
- SerpAPI Google Jobs endpoint: `https://serpapi.com/search?engine=google_jobs`, parametreler: `q`, `location`, `gl`, `hl`, `api_key`.
- SerpAPI free tier ayda 250 arama; manuel/seyrek tetikleme için yeterli, günlük otomatik çalıştırmada hızla tükenir.
- Adzuna API Türkiye'yi desteklemediği için (12 ülke listesinde yok) kullanılmadı.
- LinkedIn için resmi bir Job Search API yok; üçüncü parti scraper'lar LinkedIn kullanım şartlarına aykırı, bu yüzden tercih edilmedi.
- Workflow dosyasındaki tüm credential ID'leri (`id` alanları) orijinal sahibine ait — n8n'e import ettikten sonra her credential'ı yeniden seçmek/oluşturmak gerekiyor.

## Bu Workflow'un Amacı (What it does)

1. Profilini kaynaklardan okur (LinkedIn, portfolyo, vb.) — Jina AI üzerinden
2. Beceri/tercihlerine göre arama sorguları üretir
3. API üzerinden iş ilanlarını çeker, daha önce işlenmiş olanları eler (Google Sheets ile dedup)
4. AI en uygun eşleşmeleri seçer
5. Her ilan için özelleştirilmiş bir cover letter + başvuru paketi üretir
6. Başvuruları Gmail üzerinden e-posta ile gönderir
7. Her şeyi bir Google Sheet'e loglar

## Kullanıcının (Benim) Yapması Gerekenler

### Hesap / API key işlemleri
- [ ] **SerpAPI**: Hesap oluştur, API key al (serpapi.com). Free tier ayda 250 arama.
- [ ] **Gemini (veya OpenAI)**: Google AI Studio'dan Gemini API key al — mevcut workflow Gemini kullanıyor, değiştirmezsek bu yeterli. OpenAI'a geçersek platform.openai.com'daki $5 kredi ile API key oluşturulacak.
- [ ] **Google Sheets**: Boş bir Google Sheet oluştur ("job offers processed" gibi), sütun adı `URLS` olacak şekilde bir sekme hazırla. n8n'de Google OAuth2 credential'ı bu hesapla bağla.
- [ ] **Gmail**: n8n'de Google OAuth2 credential'ı bağla (başvuru e-postalarının gönderileceği hesap).
- [ ] **Jina AI**: jina.ai üzerinden ücretsiz API key al (profil sayfalarını okumak için).

### İçerik / profil hazırlığı
- [ ] **CV**: CV'ni yükle. Mevcut workflow CV'yi bir URL üzerinden (`cvUrlWeb`) okuyor — yani CV'nin herkese açık bir web sayfası/PDF linki olması gerekiyor (örneğin kişisel site, Google Drive paylaşım linki, veya GitHub'da barındırılan bir sayfa). Dosya olarak yüklemek istersen bunun için ayrı bir adım (Google Drive/S3 üzerinden link üretme) eklememiz gerekecek — bunu birlikte konuşalım.
- [ ] **Cover letter**: Şu anki workflow cover letter'ı senin yazdığın bir şablondan değil, AI'ın CV/profil verisinden üretmesiyle oluşturuyor (`✍️ Agent: Generate Application` node'u). Eğer kendi cover letter şablonunu esas alıp AI'a onu uyarlatmak istersen, şablonunu paylaşman ve node prompt'una eklememiz gerekiyor. Şu an için varsayım: AI sıfırdan üretiyor.
- [ ] **LinkedIn/GitHub/portfolyo linkleri**: `⚙️ Configuration1` node'undaki `linkedinUrl`, `githubUrl`, `cvUrlWeb` alanlarına gerçek, herkese açık linklerini gir.
- [ ] **Kişisel bilgiler**: `candidateName`, `candidateEmail`, `candidatePhone` alanlarını doldur.
- [ ] **Arama tercihleri**: `targetLocation`, `remotePreference`, `minimumSalaryAnnual`, `maxJobsToProcess` alanlarını gerçek tercihlerinle güncelle.

### Karar bekleyen noktalar
- [ ] CV'yi URL olarak mı sunacaksın, yoksa dosya yükleme + link üretme adımını workflow'a ekleyelim mi?
- [ ] Kendi cover letter metnini AI'a şablon olarak mı vereceksin, yoksa tamamen AI üretimine mi bırakacaksın?
