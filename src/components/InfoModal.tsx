import { useEffect, useRef } from 'react';

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        tabIndex={-1}
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal__close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>

        <span className="panel__kicker">Yöntem & Bilgi</span>
        <h2 id="info-title" className="modal__title">
          Nükleer etkiler nasıl hesaplanıyor?
        </h2>

        <div className="disclaimer">
          <strong>Eğitim amaçlıdır.</strong> Bu araç bir saldırı planlama aracı değildir; nükleer
          silahların insanlık için oluşturduğu yıkımı görselleştirmek ve etkilerin ölçeğini
          anlatmak için hazırlanmıştır. Nükleer silahların yayılması ve kullanımı uluslararası
          hukuk kapsamında yasaktır.
        </div>

        <p className="modal__lead">
          Haritada seçtiğiniz noktaya, seçtiğiniz verimde bir patlama uygulanır. Şok dalgası, ısıl
          ışınım, krater, bulut yüksekliği ve serpinti; Glasstone &amp; Dolan (1977), Nuclear
          Weapons FAQ ve Fletcher (CEX-62.2) eğri uyarlamalarına dayanan ampirik ölçekleme
          bağıntılarıyla hesaplanır.
        </p>

        <div className="formula-grid">
          <div className="formula-card">
            <h3>Ateş topu</h3>
            <code>R ≈ 61 · Y^0,40 m</code>
            <p>Yüzey patlamasında yarıçap ≈ %13 daha büyüktür.</p>
          </div>
          <div className="formula-card">
            <h3>Şok dalgası</h3>
            <code>log R ↔ log Y</code>
            <p>
              20 / 5 / 1 psi yarıçapları, 1 kt – 20 Mt için tablolanmış ölçekleme değerleri
              arasında log-log enterpolasyonla bulunur.
            </p>
          </div>
          <div className="formula-card">
            <h3>Isıl ışınım</h3>
            <code>0,67 · Y^0,41 km</code>
            <p>3. derece yanık için; 2. derece 0,87·Y^0,40 km.</p>
          </div>
          <div className="formula-card">
            <h3>Krater</h3>
            <code>18,3 · Y^0,30 m</code>
            <p>Yüzey patlaması, kuru toprak. Derinlik ≈ yarıçapın yarısı.</p>
          </div>
        </div>

        <h3 className="modal__subtitle">Modelin sınırları</h3>
        <ul className="modal__list">
          <li>Formüller 0,1 kt – 20 Mt aralığında anlamlıdır; dışındaki değerler ekstrapolasyondur.</li>
          <li>
            Şok ve ısıl yarıçaplar optimum hava patlaması içindir. Gerçek etkiler patlama
            yüksekliğine, araziye, hava koşullarına ve bina tipine göre değişir.
          </li>
          <li>
            Can kaybı tahmini, seçtiğiniz sabit nüfus yoğunluğu ile 20/5/1 psi bantlarının
            üzerinden yapılır. Gerçek nüfus verisi, yaş dağılımı, yangın, radyasyon hastalığı ve
            tahliye modellenmez.
          </li>
          <li>Serpinti bantları yaklaşık yön ve ölçek gösterir; doz hesabı yapılmaz.</li>
          <li>Bulut yüksekliği G&amp;D Fig. 2.16 eğrisine yapılan iki bölgeli bir uyarlamadır.</li>
        </ul>

        <h3 className="modal__subtitle">Harita ve veri kaynakları</h3>
        <ul className="modal__list">
          <li>
            Varsayılan uydu görüntüsü: Esri World Imagery (Maxar, Earthstar Geographics, GIS User
            Community). Sokak ve karanlık katmanlar: CARTO / OpenStreetMap katkıcıları.
          </li>
          <li>
            Google Harita: Map Tiles API üzerinden isteğe bağlıdır. Google Maps Platform
            faturalandırması ve HTTP referrer kısıtlamalı bir API anahtarı gerekir; anahtar
            tarayıcınızda saklanır ve bu projeye gönderilmez.
          </li>
          <li>Yer arama: OpenStreetMap Nominatim. Sonuçlar üçüncü taraf servisten gelir.</li>
        </ul>

        <h3 className="modal__subtitle">Kullanım</h3>
        <ul className="modal__list">
          <li>Haritada bir noktaya tıklayın: patlama anında simüle edilir ve kaydedilir.</li>
          <li>Kayıtlar sekmesinden eski patlamaları seçebilir veya silebilirsiniz.</li>
          <li>Yakınlaştırma: fare tekerleği veya sağ alttaki +/− düğmeleri.</li>
          <li>Rüzgâr yönü, serpintinin gideceği yönü belirler.</li>
        </ul>

        <h3 className="modal__subtitle">Kaynaklar</h3>
        <ul className="modal__sources">
          <li>
            <a href="https://atomicarchive.com/resources/documents/effects/glasstone-dolan/" target="_blank" rel="noreferrer">
              Glasstone &amp; Dolan, The Effects of Nuclear Weapons (1977)
            </a>
          </li>
          <li>
            <a href="https://nuclearweaponarchive.org/Nwfaq/Nfaq5.html" target="_blank" rel="noreferrer">
              Carey Sublette, Nuclear Weapons FAQ §5
            </a>
          </li>
          <li>
            <a href="https://nuclearsecrecy.com/nukemap/faq/" target="_blank" rel="noreferrer">
              NUKEMAP SSS — etki modeli yaklaşımları
            </a>
          </li>
          <li>
            <a href="https://developers.google.com/maps/documentation/tile/2d-tiles-overview" target="_blank" rel="noreferrer">
              Google Maps Platform — Map Tiles API
            </a>
          </li>
        </ul>

        <div className="modal__footer">
          <span>NukeSim 3D Pro · v1.0</span>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Anladım, devam et
          </button>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
