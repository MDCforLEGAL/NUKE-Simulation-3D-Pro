# NukeSim 3D Pro

Harita üzerinde istediğiniz noktaya, istediğiniz güçte nükleer patlama uygulayan **eğitim amaçlı** etki simülatörü. Tam ekran uydu haritası, sonsuz sayıda patlama ve gerçek ölçekleme bağıntılarına dayanan şok, ısı, krater, mantar bulutu ve serpinti analizi.

> **Bu araç yalnızca eğitim ve görselleştirme amaçlıdır.** Bir saldırı planlama aracı değildir. Nükleer silahların kullanımı uluslararası hukuk kapsamında yasaktır.

## Özellikler

- **Sınırsız verim:** logaritmik 0,01 kt – 100.000 kt kaydırıcı, hazır değerler (Hiroşima, Nagazaki, Castle Bravo, Tsar Bomba) ve kt / Mt / Gt / Tt birimleriyle serbest giriş (1e10 kt'e kadar).
- **Sınırsız patlama:** her tıklama ayrı bir kayıt olarak saklanır; kayıtlar arasında gezinme, tek tek silme ve tümünü temizleme.
- **Harita tabanlı hedefleme:** tam ekran Leaflet haritası; tıkla → patlat. Yer arama (Nominatim), hedefe uçma, yakınlaştırma.
- **Etki katmanları:** 20 / 5 / 1 psi şok dalgası, 1.–3. derece yanık yarıçapları, ateş topu, krater, bulut tepesi ve yerel serpinti bulutu.
- **Canlı ayarlar:** hava/yüzey patlaması, rüzgâr yönü ve hızı, nüfus yoğunluğu, katman görünürlüğü.
- **Animasyon:** patlama flaşı, genişleyen şok dalgası ve yükselen mantar bulutu.
- **Türkçe arayüz**, masaüstünde üç sütunlu savaş odası düzeni, mobilde çekmece paneller.

## Hızlı başlangıç

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ üretir
npm run preview
```

Gereksinimler: Node 20+ ve npm. Proje Vite + React 19 + TypeScript + Leaflet kullanır.

## Kullanım

1. Sol panelden patlama gücünü, patlama tipini, rüzgârı ve nüfus yoğunluğunu ayarlayın.
2. Haritada bir hedefe tıklayın; patlama anında hesaplanır ve sağdaki rapora düşer.
3. **Kayıtlar** sekmesinden önceki patlamaları seçin, silin veya tümünü temizleyin.
4. **Etkiler** sekmesinde yarıçaplar, krater, bulut, sismik tahmin, serpinti ve can kaybı özetlenir.

Ayarlar tarayıcıda (`localStorage`) saklanır. Patlama kayıtları oturum boyunca tutulur.

## Model ve kaynaklar

Değerler; Glasstone & Dolan, *The Effects of Nuclear Weapons* (1977), Carey Sublette'in *Nuclear Weapons FAQ* §5'i ve Fletcher (CEX-62.2) eğri uyarlamalarına dayanır. Arayüzdeki “?” düğmesi modelin özetini ve sınırlarını gösterir.

| Etki | Bağıntı |
| --- | --- |
| Ateş topu yarıçapı | `61 · Y^0.40 m` (hava), yüzeyde ×1,13 |
| 20 / 5 / 1 psi | 1 kt – 20 Mt tablo değerleri arasında log-log enterpolasyon |
| 3. derece yanık | `0,67 · Y^0.41 km` (yüzeyde ×0,8) |
| 2. derece yanık | `0,87 · Y^0.40 km` |
| Krater (yüzey) | yarıçap `18,3 · Y^0.30 m`, derinlik ≈ yarıçap / 2 |
| Sismik | `m_b ≈ 4,75 + 0,75 · log10(Y / 20)` (yüzey, kaba tahmin) |
| Serpinti | `L ≈ 28 · √Y · (15 / rüzgâr) km`, yaklaşık bantlar |

`Y` kiloton cinsindendir. Model 0,1 kt – 20 Mt aralığında doğrulanmıştır; dışındaki değerler ekstrapolasyondur ve arayüzde uyarı gösterilir.

### Sınırlar

- Şok ve ısıl yarıçaplar optimum hava patlaması içindir; gerçek patlama yüksekliği, arazi ve hava koşulları hesaba katılmaz.
- Can kaybı tahmini sabit nüfus yoğunluğu ve 20/5/1 psi bantlarıyla yapılır; gerçek nüfus, yangın, radyasyon hastalığı ve tahliye modellenmez.
- Serpinti bantları yaklaşık yön/ölçek gösterir; doz hesabı yapılmaz.
- Hava patlamalarında yerel serpinti gösterilmez.

## Harita sağlayıcıları

- **Varsayılan uydu:** Esri World Imagery (Maxar, Earthstar Geographics, GIS User Community).
- **Sokak / karanlık:** CARTO + OpenStreetMap katkıcıları.
- **Google (isteğe bağlı):** Google Maps Platform **Map Tiles API** üzerinden. Faturalandırması açık bir proje ve HTTP referrer kısıtlamalı API anahtarı gerekir. Anahtarı arayüzdeki “Google Harita API anahtarı” alanına girin veya derleme sırasında `VITE_GOOGLE_MAPS_API_KEY` tanımlayın. Anahtar yalnızca tarayıcıda saklanır; sunucuya gönderilmez. EEA faturalandırma adreslerinde Google 2D uydu karoları kullanılamaz.
- **Arama:** OpenStreetMap Nominatim (düşük hacimli kullanım).

## Dağıtım

`npm run build` sonrası `dist/` klasörü herhangi bir statik barındırıcıya yüklenebilir. Depodaki `deploy.manifest.json` + `worker.js` ikilisi, statik dosyaları `env.ASSETS` üzerinden sunan minimal bir Cloudflare Worker tanımıdır:

```json
{
  "entrypoint": "worker.js",
  "modules": [{ "name": "worker.js", "type": "esm", "path": "./worker.js" }],
  "assetsDirectory": "./dist",
  "spa": true
}
```

## Lisans

MIT — bkz. [LICENSE](LICENSE).
