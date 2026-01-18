# MADLEN CASE STUDY - Full Stack AI Assistant

## Demo Video
[![Demoyu YouTube'dan izleyebilirsiniz](https://img.youtube.com/vi/M1XDz9tht_Y/0.jpg)](https://www.youtube.com/watch?v=M1XDz9tht_Y)

Bu doküman, Madlen AI projesinin mimari kararlarını, teknik altyapısını, kullanıcı deneyimi (UX) prensiplerini ve çalıştırma talimatlarını içerir. Proje, modern yazılım prensipleri gözetilerek geliştirilmiş, uçtan uca izlenebilir (observable) ve çok modlu (multi-modal) bir yapay zeka asistanıdır.

## 1. Proje Özeti

Madlen AI; kullanıcıların farklı yapay zeka modelleriyle (Vision, Text, Coding) etkileşime girmesini sağlayan, görsel analiz yeteneğine sahip, modern ve ölçeklenebilir bir sohbet uygulamasıdır.

Sistem, OpenRouter API üzerinden en stabil ve performanslı modelleri (AllenAI Molmo, Mistral, Qwen) kullanır. Kullanıcı dostu arayüzü, hata durumlarında teknik kodlar yerine anlamlı geri bildirimler sunar (örn: "Model şu an yoğun") ve tüm sistem trafiği OpenTelemetry üzerinden izlenir.

## 2. Teknik Seçimler ve Tasarım Kararları

Projede kullanılan teknolojiler ve mimari yaklaşımlar rastgele seçilmemiş; ölçeklenebilirlik, bakım kolaylığı ve kullanıcı psikolojisi (UX Laws) göz önünde bulundurularak belirlenmiştir.

### A. Backend Mimarisi: NestJS & TypeScript
Basit bir Express.js yapısı yerine, kurumsal standartlarda bir framework olan **NestJS** tercih edilmiştir.
* **Modülerlik & Microservice Hazırlığı:** NestJS'in modüler yapısı (Module/Service/Controller) ve Dependency Injection (DI) mekanizması, uygulamanın ileride monolitik yapıdan mikroservis mimarisine geçişini (Microservices Ready) garanti altına alır.
* **Hata Yönetimi:** Standart sunucu hataları yerine, API limitleri (Rate Limiting 429) ve kesintiler (404) için özel `HttpException` katmanı oluşturulmuştur.

### B. Veritabanı Stratejisi: Prisma ORM
Projede veritabanı erişimi için **Prisma ORM** kullanılmıştır.
* **Neden Prisma?** Ham SQL sorguları yerine Prisma kullanmak, geliştirme hızını artırırken tip güvenliğini (Type-safety) sağlar.
* **Esneklik (SQL vs NoSQL):** Mevcut yapıda ilişkisel veritabanı (SQLite) tercih edilmiştir. Ancak mimari, ileride kullanıcı logları gibi yapısal olmayan verilerin **MongoDB** gibi NoSQL sistemlere taşınmasına veya PostgreSQL geçişine olanak tanıyacak esneklikte tasarlanmıştır.

### C. Frontend UX/UI ve Tasarım Yasaları
Arayüz, sadece görsel değil, İnsan-Bilgisayar Etkileşimi (HCI) prensipleri gözetilerek tasarlanmıştır:
* **Hick Yasası (Hick's Law):** Kullanıcının karar verme süresini kısaltmak adına, arayüzde gereksiz butonlar (Pro plan, gereksiz ayarlar) kaldırılmış, sadece "Chat" ve "Model Seçimi"ne odaklanılmıştır.
* **Fitts Yasası (Fitts's Law):** Chat input alanı ve gönder butonu, ulaşılabilirliği maksimize edecek büyüklükte ve konumda tasarlanmıştır.
* **Geri Bildirim:** Kullanıcı boş ekrana bakmasın diye "Loading..." durumları ve modelin meşguliyet durumunu açıklayan dostane hata mesajları entegre edilmiştir.
* **Kişiselleştirme:** Chat geçmişi, kullanıcıya özel olarak silinebilir ve başlıkları düzenlenebilir (Rename/Delete) şekilde kurgulanmıştır.

### D. Gözlemlenebilirlik (Observability)
Sistem, **OpenTelemetry** ile enstrümante edilmiştir. Backend'deki tüm API çağrıları, veritabanı sorguları ve hatalar, gRPC protokolü üzerinden **Jaeger**'a aktarılır. Bu sayede hangi modelin ne kadar sürede yanıt verdiği şeffaf bir şekilde izlenebilir.

## 3. Kurulum ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için **Node.js (v18+)** ve **Docker**'ın (Jaeger için) kurulu olması gerekmektedir.

### Adım 1: Backend Kurulumu

1.  Terminalde `server` klasörüne gidin ve bağımlılıkları yükleyin:
    ```bash
    cd server
    npm install
    ```

2.  **Ortam Değişkenleri (.env):**
    * **Not:** Değerlendirme ve test sürecini hızlandırmak adına, gerekli `.env` dosyası projeye dahil edilmiştir (`push` edilmiştir). Doğrudan kullanabilirsiniz.
    * **Güvenlik Uyarısı:** Normal bir geliştirme sürecinde (Production), `.env` dosyaları hassas veriler içerdiği için `.gitignore` listesine eklenir ve asla versiyon kontrol sistemine (Git) gönderilmez. Fakat burada Case Study tecrübesini hızlandırmak stedim güvenlikten feregat ederek. 
3.  Veritabanını ve Prisma istemcisini hazırlayın:
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```

4.  Backend servisini başlatın:
    ```bash
    npm run start:dev
    ```
    *Backend başarıyla başladığında terminalde şu çıktıyı göreceksiniz:* `Backend running on: http://localhost:3001`

### Adım 2: Frontend Kurulumu

1.  Yeni bir terminal penceresi açın ve `client` klasörüne gidin:
    ```bash
    cd client
    npm install
    ```

2.  Arayüzü başlatın:
    ```bash
    npm run dev
    ```
    *Uygulama `http://localhost:3000` adresinde çalışacaktır. Tarayıcınızdan bu adrese giderek kullanmaya başlayabilirsiniz.*

## 4. Jaeger ile Trace İzleme

Uygulama üzerindeki API isteklerinin performansını, hangi modelin ne kadar sürede yanıt verdiğini ve olası hataları izlemek için Jaeger kullanılır.

1.  **Jaeger'ı Başlatma:**
    `server` klasöründeyken Docker Compose komutunu çalıştırın:
    ```bash
    docker-compose up -d
    ```

2.  **Arayüze Erişim:**
    Tarayıcınızda şu adrese gidin:
    **http://localhost:16686**

3.  **Trace'leri Görüntüleme:**
    * Sol menüdeki **Service** kısmından `madlen-backend`'i seçin.
    * **Find Traces** butonuna basın.
    * Listelenen isteklere tıklayarak, isteğin veritabanında ve dış API'lerde (OpenRouter) geçirdiği süreleri detaylı şelale (waterfall) grafiği olarak inceleyebilirsiniz.
