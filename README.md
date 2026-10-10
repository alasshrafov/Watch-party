# 🎬 Cütlüklər Üçün Kino Otağı (Watch Party - Rave Alternativi) 🍿💖

Bu layihə sevgilinizlə məsafələrdən asılı olmayaraq eyni anda, tam sinxron film, serial və video izləmək üçün hazırlanmış xüsusi veb tətbiqidir.

---

## ✨ Əsas Xüsusiyyətlər

1. **💻 İstənilən Film Saytından Canlı İzləmə (WebRTC Tab Yayımı):**
   * Brauzerdə sevdiyiniz film saytını açın (*hdfilmcehennemi, dizipal və s.*).
   * Otaqda **"Film Tabını Yayımla"** düyməsinə basıb həmin səhifəni seçin.
   * Qarşı tərəf filmi kristal təmiz HD görüntü və səslə canlı izləyir. Heç bir saytın bloklaması və ya reklam problemi olmur!

2. **🔴 YouTube Sinxronizasiyası:**
   * İstənilən YouTube linkini atın.
   * Play, Pause və saniyə dəyişikliyi hər iki tərəfdə millisaniyə dəqiqliyi ilə eyni anda baş verir.

3. **🎬 Birbaşa Video / Film Linki (.mp4 / HLS):**
   * Birbaşa video URL-lərini daxil edərək sinxron pleyerdə izləyin.

4. **📁 Ortaq Lokal Fayl Rejimi:**
   * Eyni filmi hər ikiniz kompüterinizdən seçdikdə, pleyer bir-biri ilə internet trafikini yükləmədən tam sinxron işləyir.

5. **💬 Canlı Çat & Uçan Sevgi Emojiləri:**
   * Filmə baxarkən ekrana sevgi emojiləri uçurun (❤️, 🍿, 😂, 🥺, 🎬).
   * Hər iki ekranda canlı animasiya ilə görünür.

6. **🎙️ Daxili Səsli Zəng (Mikrofon):**
   * Filmə baxarkən bir-birinizi eşitmək üçün mikrofonu bir kliklə aktivləşdirin.

---

## 🚀 Kompüterdə İşə Salmaq

1. Terminalda `watch-party` qovluğuna keçin:
   ```powershell
   cd watch-party
   ```
2. Serveri başladın:
   ```powershell
   node server.js
   ```
3. Brauzerinizdə daxil olun:
   👉 **http://localhost:3000**

---

## 🌐 Sevgilinizlə Birlikdə Necə İzləmək Olar? (Tam Pulsuz İnternetə Açmaq)

Kompüterinizdəki bu serveri sevgilinizin internetdən aça bilməsi üçün ən asan və sürətli 2 üsul:

### Variant 1: Cloudflare Tunnel (1 dəqiqəyə, quraşdırmasız link)
Terminalda sadəcə bu əmri yazın (heç bir qeydiyyat tələb etmir):
```powershell
npx localtunnel --port 3000
```
və ya:
```powershell
npx cloudflared tunnel --url http://localhost:3000
```
Sizə dərhal `https://xxxx.loca.lt` kimi link verəcək. Həmin linki sevgilinizə atın, otaq kodunu daxil edib dərhal birlikdə baxa bilərsiniz!

### Variant 2: Render.com və ya Railway (24/7 Daimi Pulsuz Sayt)
1. Bu `watch-party` qovluğunu GitHub-a yükləyin.
2. [Render.com](https://render.com) saytında "New Web Service" seçin və reponuzu qoşun.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Artıq daimi özünüzə məxsus saytınız olacaq (məsələn: `bizim-kino.onrender.com`).
