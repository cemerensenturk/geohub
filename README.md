# SatelCity 🛰️🌲

> **Dünyanın şehirlerini uzaydan çekilmiş etiketsiz uydu fotoğraflarıyla tanıyabilir misiniz?**  
> *Can you identify world cities from high-resolution, label-free satellite imagery?*

[![Live Demo](https://img.shields.io/badge/Demo-cemeren.dev%2Fsatelcity-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://cemeren.dev/satelcity)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS_ES6+-yellow.svg?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependency](https://img.shields.io/badge/Zero-Build_Steps-brightgreen.svg?style=for-the-badge)](https://leafletjs.com/)

**SatelCity**, oyuncuların dünya şehirlerini gerçek ve etiketsiz uydu fotoğraflarına bakarak tahmin ettiği, tamamen ücretsiz, sıfır API anahtarı gerektiren ve modern web teknolojileriyle geliştirilmiş coğrafya tahmin oyunudur.

---

## ✨ Temel Özellikler

### 🛰️ 1. Etiketsiz Gerçek Uydu Görüntüleri (ESRI World Imagery)
- **Sıfır Etiket (No Labels):** Şehir, cadde veya sınır isimleri fotoğrafta yer almaz; saf hava ve uydu fotoğrafı gösterilir.
- **Gerçek Coğrafi Yönelim (North-Up):** Standart Web Mercator açısı ile tam **Kuzey Yukarısı** kilitlidir. Şehrin güneydoğusunda deniz varsa fotoğrafta da tam güneydoğuda görünür. Köşede `🧭 KUZEY YUKARI` pusula rozeti mevcuttur.
- **Sabit Fotoğraf Deneyimi & Hile Koruması:** Haritada sürükleme (pan) veya kontrolsüz zoom yapılamaz. **🔍 Büyüt** modalı açıldığında da aynı sabit kadraj büyük ekranda net şekilde incelenir.

### 🎮 2. İki Farklı Oyun Modu
- **🔠 4 Seçenekli Mod (Multiple Choice):**
  - Akıllı çeldirici algoritması: Şıklar sadece aynı zorluk seviyesinden ve benzer coğrafi karakterden (kıyı ise kıyı, dağ/vadi ise dağ/vadi) seçilir.
  - Klavye kısayolları: `1, 2, 3, 4` veya `A, B, C, D` ile hızlı cevaplama; `Enter` ile bir sonraki soruya geçiş.
- **✍️ Yazarak Tahmin Modu (Search & Distance Clues):**
  - Türkçe ve yabancı karakterlere duyarlı (diacritic-insensitive) akıllı otomatik tamamlama.
  - 5 tahmin hakkı; her yanlış tahminde Haversine formülüyle kuş uçuşu **mesafe (km)** ve **8 yönlü pusula oku (⬆️, ↗️, ➡️, ↘️ vb.)** ipucu olarak verilir.

### 🎯 3. Üç Ayrık Zorluk Seviyesi
Şehirler birbiriyle çakışmayan (disjoint) 3 seviyeye ayrılmıştır:
- **🟢 Kolay (Easy):** Dünyanın en ikonik metropolleri *(İstanbul, Paris, Londra, New York, Tokyo, Roma, Venedik, Kahire, Sidney, Dubai...)*
- **🟡 Orta (Medium):** Tanınan büyük başkentler ve popüler coğrafyalar *(Prag, Viyana, Budapeşte, Lizbon, Madrid, Seul, Buenos Aires, Atina, Dublin...)*
- **🔴 Zor (Hard):** Niş, özel coğrafyalı veya zorlayıcı şehirler *(Reykjavik, Ulanbatur, Kigali, Tiflis, Bakü, Saraybosna, Dubrovnik, Valparaíso, Katmandu, Auckland...)*

### 🛡️ 4. Tam Kapsamlı Kaçış ve Hile Koruması
- Soruyu bilmeden **"← Menü"** butonuna basılırsa,
- Sayfa yenilenirse (**F5 / Cmd+R**),
- Veya sekme/tarayıcı aniden kapatılırsa,
soru **otomatik olarak YANLIŞ** sayılır ve istatistiklere işlenir. Zor sorulardan kaçarak isabet oranı koruma taktiği engellenmiştir.

### 🌐 5. 6 Dilli Uluslararası Destek (i18n)
Hiçbir harici kütüphane olmadan, ultra hafif yerel sözlük mimarisiyle:
- 🇹🇷 **Türkçe (TR)**
- 🇬🇧 **English (EN)**
- 🇪🇸 **Español (ES)**
- 🇫🇷 **Français (FR)**
- 🇩🇪 **Deutsch (DE)**
- 🇮🇹 **Italiano (IT)**

### 🌲 6. Deep Forest & Earth Explorer Tasarım
- Koyu çam ormanı yeşili (`#060a07`), adaçayı (`#86efac`) ve ılık toprak/amber dokunuşları.
- Buzlu cam (glassmorphism, `backdrop-filter: blur(18px)`).
- Emojiler yerine özel el yapımı vektör SVG mod ikonları.

### 📤 7. Web Share API & Pano ile Skor Paylaşımı
- Soruyu bildikten sonra tek tıkla mobil cihazlarda yerel paylaşım sayfası (WhatsApp, Twitter/X, Telegram vb.), masaüstünde ise panoya kopyalama çalışır.
- Başarı yüzdesi, deneme sayısı ve `cemeren.dev/satelcity` bağlantısı içeren şık paylaşım metni oluşturur.

---

## 📁 Proje Mimarisi

```
satelcity/
├── index.html              # Semantik HTML5, meta etiketleri ve SVG mod ikonları
├── satelcity.jpeg          # Logo, favicon ve OpenGraph paylaşım görseli
├── LICENSE                 # MIT Açık Kaynak Lisansı
├── .gitignore              # Git yoksayma dosyası
├── README.md               # Proje dökümantasyonu
├── css/
│   └── style.css           # Deep Forest Green Explorer glassmorphism tasarım sistemi
└── js/
    ├── app.js              # Oyun ana kontrolcüsü, kaçış koruması, klavye kısayolları, paylaşım
    ├── cities.js           # 60+ dünya şehri (koordinat, zoom, kıta, zorluk, geo tipi)
    ├── i18n.js             # 6 dilli çeviri motoru ve dinamik nüfus/yüzde formatlayıcı
    ├── map.js              # Leaflet + ESRI World Imagery kilitli fotoğraf motoru
    ├── stats.js            # Bağımsız mod istatistikleri ve görülen şehir takibi
    └── modes/
        ├── multipleChoice.js # 4 seçenekli akıllı çeldirici modu
        └── textGuess.js     # Otomatik tamamlama, Haversine mesafe ve yön hesaplama
```

---

## 🚀 Yerel Olarak Çalıştırma

Projede Node.js veya webpack/vite gibi derleme (build) adımlarına gerek yoktur. Modern ES modülleri kullandığı için herhangi bir statik HTTP sunucusuyla anında çalışır:

### Python 3 ile:
```bash
python3 -m http.server 8080
```
Tarayıcınızda açın: **`http://localhost:8080`**

### Node / npx ile:
```bash
npx serve .
```

---

## 🐙 GitHub'a Gönderme (Push to GitHub)

Projeyi GitHub'a göndermek için terminalde sırasıyla:

```bash
# 1. Git deposunu başlat
git init -b main

# 2. Tüm dosyaları sahneye al ve ilk sürüm commit'ini at
git add .
git commit -m "feat: SatelCity v1.0.0 initial release 🛰️"

# 3. GitHub üzerinde oluşturduğunuz depoyu uzak sunucu (remote) olarak bağlayın:
# (Kullanıcı adınızı ve repo adınızı girin)
git remote add origin https://github.com/cemerensenturk/satelcity.git

# 4. GitHub'a push edin
git push -u origin main
```

---

## 🌐 Canlıya Alma (cemeren.dev/satelcity)

Projedeki tüm dosya yolları göreceli (`./`) tasarlandığından hem ana kök dizinde (`domain.com`) hem de alt dizinde (`cemeren.dev/satelcity/`) sıfır konfigürasyonla çalışır.

### Nginx Alt Dizin Örneği:
```nginx
location /satelcity/ {
    alias /var/www/satelcity/;
    index index.html;
    try_files $uri $uri/ /satelcity/index.html;
}
```

### Sunucuya Dosya Aktarımı (rsync / scp):
```bash
# Projeyi cemeren.dev sunucusuna tek komutla aktarmak için:
rsync -avz --exclude '.git' ./ user@cemeren.dev:/var/www/satelcity/
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında açık kaynak olarak sunulmaktadır.
İstediğiniz gibi geliştirebilir, yeni şehirler ekleyebilir ve paylaşabilirsiniz.
