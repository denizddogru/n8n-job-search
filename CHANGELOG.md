# Changelog

Bu proje [Semantic Versioning](https://semver.org/) kullanır.

## [0.2.0] - 2026-07-26

### Fixed
- **Memory bleed**: `Agent: Generate Application` için hafıza oturumu (`MemoryApplicationPack.sessionKey`) artık loop'taki her ilan için izole (`$itemIndex` eklendi). Önceden tüm ilanlar aynı hafızayı paylaşıyordu, bu da sonraki ilanlarda prompt token sayısının katlanmasına (1.5K → 16K) ve bazen modelin boş/geçersiz JSON döndürmesine yol açıyordu.
- **İlan seçim kalitesi**: `Agent: Jobs selection` artık sadece başlık eşleşmesine değil, ilan açıklamasındaki gerçek teknoloji yığınına (.NET/C# vs Ruby/Python/PHP/Java) da bakıyor; stack uyuşmazlığı olan ilanlar düşük öncelikli sayılıyor.
- Gerçek başvuru linki: `share_link` (Google'ın çalışmayan iç deep-link'i) yerine `apply_options[0].link` (gerçek iş ilanı sitesi linki) kullanılıyor.
- Deprecated `agent: 'conversationalAgent'` parametresi kaldırıldı (`Agent: Generate Application` node'u v1.7 → v3.1).
- SerpAPI context window taşması: ilan verileri kırpıldı, aday sayısı 25 ile sınırlandı, sorgu sayısı 4-6'ya düşürüldü.
- Google Sheets "Column names were updated" hatası: sabit 7 sütunlu şema (`Tarih, URLS, İlan Adı, Şirket, Site, Çalışma Şekli, Ülke`).

### Changed
- E-posta/Sheets mimarisi: artık ilan başına ayrı e-posta yerine, tek çalıştırmada seçilen tüm ilanlar **tek bir özet (dijest) e-postada** birleştiriliyor (`BuildDigestEmail` node'u eklendi); Sheets'e de toplu (batch) yazılıyor.
- `maxJobsToProcess`: 5 → 3.

### Added
- `n8n.md`: workflow'un tam teknik dokümantasyonu (node'lar, veri akışı, bilinen kısıtlar).
- `CHANGELOG.md`: bu dosya.

## [0.1.0] - 2026-07-21

### Added
- İlk çalışan sürüm: France Travail bağımlılığı kaldırıldı, SerpAPI (Google Jobs) entegrasyonu eklendi.
- Manual Trigger'a geçildi (Schedule Trigger yerine).
- OpenAI (gpt-4o-mini) entegrasyonu (Gemini yerine).
- Tüm credential'lar bağlandı: SerpAPI, OpenAI, Jina AI, Gmail OAuth2, Google Sheets OAuth2.
- CV/GitHub → PDF pipeline'ı kaldırıldı (51 node'dan 30 node'a indirildi).

### Fixed
- `queryAuth` → `httpQueryAuth` credential type düzeltmesi.
- SerpAPI `gl=tr` desteklenmiyor hatası — Google Jobs'un Türkiye'de hiç aktif olmadığı keşfedildi, `gl=us`/`hl=en` + remote-odaklı arama stratejisine geçildi.
- `alwaysOutputData: true` eklendi (`Get already processed jobs urls`) — boş sheet'te downstream node'ların atlanması sorunu.
