/**
 * SatelCity - Harita ve Uydu Fotoğrafı Yöneticisi
 * ESRI World Imagery kullanarak sıfır etiketli, tam Kuzey-Yukarı (North-Up)
 * ve sabit "fotoğraf çerçevesi" sunar.
 * Hem ana ekranda hem de büyük ekranda kaydırma ve zoom tamamen yasaktır.
 */

export class SatelliteMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.tileLayer = null;
    this.currentCity = null;
    this.initMap();
  }

  initMap() {
    // Leaflet haritasını kesin foto modunda başlat:
    // Kaydırma, sürükleme, zoom in/out kesinlikle yasaktır!
    this.map = L.map(this.containerId, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    });

    // ESRI World Imagery - Tamamen etiketsiz, yüksek çözünürlüklü uydu görüntüsü
    const esriUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    
    this.tileLayer = L.tileLayer(esriUrl, {
      maxZoom: 18,
      minZoom: 3,
      attribution: "Tiles &copy; Esri"
    }).addTo(this.map);

    L.control.attribution({
      prefix: false,
      position: "bottomright"
    }).addAttribution("Esri Satellite").addTo(this.map);
  }

  /**
   * Yeni bir şehre odaklanır ve fotoğraf karesini ayarlar
   */
  setCity(city) {
    this.currentCity = city;
    if (!this.map) return;

    this.map.setView([city.lat, city.lng], city.zoom, {
      animate: false
    });

    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  invalidate() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

export default SatelliteMap;
