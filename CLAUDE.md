# n8n Job Search Automation — Proje Notları

## Amaç
GitHub'dan alınan "Job Application Assistant" n8n workflow'unu manuel tetiklemeli (Manual Trigger) bir iş başvurusu otomasyonuna dönüştürmek. Orijinal workflow Fransa'ya özgü France Travail API'sini kullanıyordu; bu proje onu SerpAPI (Google Jobs) tabanlı bir sürüme çevirdi. Teknik detaylar için `n8n.md`'ye bak — burası sadece proje geçmişi/karar günlüğü.

## Mevcut Durum (özet)

Workflow **çalışıyor** ve n8n'de deploy edilmiş durumda (remote ID: `1RApu6UgRmtLGFyT`, local: `workflows/local/job-application-assistant.workflow.ts`). Kurulum aşaması tamamlandı:
- n8n Docker instance ayakta (`localhost:5678`), n8n-as-code (`n8nac`) ile yönetiliyor.
- Tüm credential'lar bağlı: SerpAPI (`httpQueryAuth`), OpenAI (`gpt-4o-mini`), Jina AI, Gmail OAuth2, Google Sheets OAuth2.
- Manual Trigger'a geçildi, Gemini yerine OpenAI kullanılıyor.
- `⚙️ Configuration1` gerçek verilerle dolduruldu (CV GitHub'da public repo olarak barındırılıyor: `https://github.com/denizddogru/cv`).
- Henüz **git version kontrolüne alınmadı** — proje klasörü şu an sadece local git repo (`git init` + 1 commit), **GitHub'a push edilmedi** (kullanıcı push'tan önce bazı bug'ları çözmek istedi).

## Önemli Kararlar ve Kök Neden Analizleri (kronolojik)

Bunlar tekrar keşfedilmemesi gereken, zaten çözülmüş sorunlar:

1. **`queryAuth` credential type geçersiz** → doğrusu `httpQueryAuth`. SerpAPI node'unda düzeltildi.
2. **SerpAPI `gl=tr` desteklenmiyor** (`"Unsupported tr country - gl parameter"`) → `gl` parametresi tamamen kaldırıldı, sonra tekrar eklendi ama bu sefer `gl=us` olarak (bkz. madde 4).
3. **`alwaysOutputData: true`** gerekiyor `Get already processed jobs urls` node'unda — sheet boşken 0 item dönüyor, bu da n8n'in downstream node'ları (Remove already processed jobs, Agent: Jobs selection, ...) hiç çalıştırmadan atlamasına yol açıyordu.
4. **Google'ın "Jobs" özelliği Türkiye'de hiç yok** (Google'ın resmi desteklenen ülke listesinde Türkiye yok — `gl=tr` denemesi bu yüzden zaten baştan kaybedilmiş bir yaklaşımdı). Çözüm: `gl=us`, `hl=en` sabitlendi, `location` parametresi kaldırıldı, arama sorguları sadece `"remote"` odaklı üretiliyor artık. Yani bu araç **Türkiye'de yerel/hibrit ilan bulamaz**, sadece uluslararası remote ilanlar bulur — bu bilinçli bir tasarım kısıtı, bug değil.
5. **"Context window exceeded" hatası** (`Agent: Jobs selection`) → SerpAPI'nin ham ilan objeleri çok ağırdı (job_highlights, apply_options, extensions, thumbnail dahil). `Remove already processed jobs` node'unda ilanlar kırpıldı (sadece gerekli alanlar), aday sayısı 25 ile sınırlandı, sorgu sayısı 6-10'dan 4-6'ya düşürüldü.
6. **Gerçek başvuru linki bulunamıyor sorunu** — ilk versiyon `share_link` kullanıyordu (Google'ın kendi iç "job carousel" deep-link'i, tek başına açıldığında çalışmıyor). Düzeltildi: artık SerpAPI'nin `apply_options[0].link` alanı (gerçek iş ilanı sitesi linki, örn. Indeed/Monster/LinkedIn) kullanılıyor.
7. **`Agent: Generate Application` deprecated "agent" parametresi** (`agent: 'conversationalAgent'`) hem sürekli validation uyarısına hem de "Model output doesn't fit required format" hatalarına yol açıyordu. Node v1.7 → v3.1'e yükseltildi, deprecated parametre kaldırıldı.
8. **E-posta/Sheets mimarisi değişti**: Başlangıçta her ilan için ayrı ayrı e-posta + Sheets satırı loop içinde atılıyordu. Kullanıcı tercih etti: artık loop sadece cover letter üretiyor, loop bittikten sonra **tek bir özet (dijest) e-posta** + Sheets'e **toplu batch yazma** yapılıyor (`BuildDigestEmail` code node'u eklendi).
9. **Google Sheets "Column names were updated after the node's setup" hatası** — n8n'in Sheets node'u header sırasını kendi içinde cache'liyor; sheet'teki gerçek header sırası ile node'un beklediği sıra uyuşmazsa hata veriyor. **Kalıcı çözüm yerine manuel talimat verildi**: sheet'in 1. satırına tam bu sırayla yazılması gerekiyor: `Tarih, URLS, İlan Adı, Şirket, Site, Çalışma Şekli, Ülke`.

## Bilinen, Henüz Çözülmemiş Sorunlar (tartışıldı, karar bekliyor)

1. **Memory bleed (`Agent: Generate Application`)** — `MemoryApplicationPack.sessionKey` execution başına tek; loop'taki her ilan aynı hafızayı paylaşıyor → sonraki ilanlarda prompt token sayısı katlanıyor (gözlemlenen: 1.5K → 16K token), bazen model boş/geçersiz JSON döndürüyor ("Model output doesn't fit required format" hatasının kök nedeni). **Önerilen düzeltme**: `sessionKey`'e `$itemIndex` eklemek, henüz uygulanmadı.
2. **İlan seçim kalitesi** — `Agent: Jobs selection`, ilan başlığına bakıyor ama açıklamadaki gerçek teknoloji yığınını (örn. Ruby on Rails vs .NET/C#) yeterince ağırlıklandırmıyor. Örnek: "Lucky Rabbit" şirketi "Backend Developer" başlıklı ama Ruby on Rails istiyor, .NET/C# adayı için zayıf eşleşme. **Önerilen düzeltme**: sistem mesajına tech-stack ağırlıklandırma kuralı eklemek, henüz uygulanmadı.
3. **Gmail foldering** — Gelen özet e-postaların otomatik bir Gmail etiketine/klasörüne (`n8n/job application`) düşürülmesi isteniyor. Workflow'a dokunmadan Gmail tarafında filtre kurulumu önerildi, henüz uygulanmadı/teyit edilmedi.
4. **Git/GitHub** — Proje local'de git repo, henüz GitHub'a push edilmedi. Kullanıcı önce yukarıdaki bug'ları çözmek istiyor.

## Teknik Notlar (özet — detay için `n8n.md`)
- SerpAPI free tier ayda 250 arama.
- Adzuna ve LinkedIn resmi API'leri Türkiye/kullanım şartları nedeniyle tercih edilmedi.
- E-posta gönderimi ücretsiz (kullanıcının kendi Gmail hesabı, OAuth2) — ücretli bir transactional email servisi yok. Tek ücretli bileşen OpenAI (gpt-4o-mini, token bazlı).
- CV: `https://raw.githubusercontent.com/denizddogru/cv/main/DenizDogruCV.pdf` (public repo, Jina AI'ın okuyabilmesi için).

## Kullanıcı Tercihleri (nasıl çalışmak istiyor)
- Değişiklik yapmadan önce plan sunulmasını, mantıklı bir yol çizilmesini istiyor ("bu maddeleri iyice düşün ve mantıklı bir yol çiz").
- Bazen "şu an çözüm istemiyorum, sadece konuşalım" diyor — bu durumda sadece analiz/teşhis sunulmalı, kod değişikliği yapılmamalı, o onay verene kadar beklenmeli.
- git commit/push gibi görünür aksiyonlardan önce onay istiyor (proje hook'u da bunu zorunlu kılıyor: commit için önce göster, onay al).
- İlk aşamada gerçek başvuru göndermek yerine ilanları görüntülemek/gözden geçirmek istiyor (dry-run zihniyeti).
