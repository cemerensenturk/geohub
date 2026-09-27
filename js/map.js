/**
 * SatelCity - Map & Satellite Imagery Controller
 * Uses ESRI World Imagery with zero labels, strict North-Up geographic alignment,
 * and a locked "photo frame" viewport.
 * Pan and zoom are strictly disabled in both main view and expanded modal.
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
    // Initialize Leaflet in strict photo mode:
    // Panning, dragging, zooming are completely disabled
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

    // ESRI World Imagery - High-resolution label-free satellite tiles
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
   * Focuses on a target city and sets the locked viewport frame
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
