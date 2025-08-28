/**
 * Map Module
 * Handles Leaflet map initialization, station markers, and map interactions
 */

class MapManager {
    constructor(containerId = 'map') {
        this.containerId = containerId;
        this.map = null;
        this.markers = {};
        this.currentAnalyte = null;
        this.data = null;
        
        // Default map configuration
        this.config = {
            center: [37.82, -121.99], // Center around the creek monitoring area
            zoom: 13,
            minZoom: 10,
            maxZoom: 18
        };

        // Marker colors based on water quality status
        this.markerColors = {
            acceptable: '#28a745',
            outside_range: '#dc3545',
            no_range: '#007bff',
            no_data: '#6c757d'
        };
    }

    /**
     * Initialize the Leaflet map
     */
    initMap() {
        // Create map instance
        this.map = L.map(this.containerId, {
            center: this.config.center,
            zoom: this.config.zoom,
            minZoom: this.config.minZoom,
            maxZoom: this.config.maxZoom,
            zoomControl: true
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add scale control
        L.control.scale({
            position: 'bottomright',
            metric: true,
            imperial: true
        }).addTo(this.map);

        // Set up map event listeners
        this.setupMapEvents();

        console.log('Map initialized');
    }

    /**
     * Set up map event listeners
     */
    setupMapEvents() {
        // Handle map clicks to close sidebar
        this.map.on('click', (e) => {
            // Only close sidebar if clicking on the map itself (not markers)
            if (e.originalEvent.target === e.originalEvent.currentTarget) {
                this.closeSidebar();
            }
        });

        // Handle zoom events for marker sizing
        this.map.on('zoomend', () => {
            this.updateMarkerSizes();
        });
    }

    /**
     * Set application data
     * @param {Object} data - Application data object
     */
    setData(data) {
        this.data = data;
    }

    /**
     * Add station markers to the map
     * @param {string} analyte - Current selected analyte
     */
    addStationMarkers(analyte = null) {
        this.currentAnalyte = analyte;

        if (!this.data || !this.data.stations) {
            console.warn('No station data available for markers');
            return;
        }

        // Clear existing markers
        this.clearMarkers();

        // Add markers for each station
        Object.entries(this.data.stations).forEach(([stationCode, station]) => {
            this.addStationMarker(stationCode, station, analyte);
        });

        // Fit map to show all markers without animation
        this.fitToMarkers();
    }

    /**
     * Add a single station marker
     * @param {string} stationCode - Station code
     * @param {Object} station - Station data object
     * @param {string} analyte - Current selected analyte
     */
    addStationMarker(stationCode, station, analyte) {
        // Determine marker color based on latest value status
        let status = 'no_data';
        let latestValue = null;

        if (analyte && this.data.latestValues[stationCode] && 
            this.data.latestValues[stationCode][analyte]) {
            latestValue = this.data.latestValues[stationCode][analyte];
            status = latestValue.status;
        }

        // Create custom marker
        const marker = this.createStationMarker(station.latitude, station.longitude, status);
        
        // Create popup content
        const popupContent = this.createPopupContent(stationCode, station, analyte, latestValue);
        
        // Bind popup and events
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            closeButton: true
        });

        // Add click event to show detailed sidebar
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.showStationDetails(stationCode, station);
        });

        // Add marker to map and store reference
        marker.addTo(this.map);
        this.markers[stationCode] = marker;
    }

    /**
     * Create a custom station marker with color coding
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude  
     * @param {string} status - Water quality status
     * @returns {L.CircleMarker} Leaflet circle marker
     */
    createStationMarker(lat, lng, status) {
        const color = this.markerColors[status] || this.markerColors.no_data;
        
        return L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
            className: 'station-marker'
        });
    }

    /**
     * Create popup content for a station marker
     * @param {string} stationCode - Station code
     * @param {Object} station - Station data
     * @param {string} analyte - Current analyte
     * @param {Object} latestValue - Latest measurement value
     * @returns {string} HTML popup content
     */
    createPopupContent(stationCode, station, analyte, latestValue) {
        let content = `
            <div class="station-popup">
                <h4>${station.name || stationCode}</h4>
                <p><strong>Code:</strong> ${stationCode}</p>
                <p><strong>Location:</strong> ${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}</p>
        `;

        if (analyte && latestValue) {
            const statusText = {
                acceptable: 'Within Range',
                outside_range: 'Outside Range', 
                no_range: 'No Range Defined'
            }[latestValue.status] || 'No Data';

            const statusClass = latestValue.status || 'no_data';
            const unit = latestValue.unit ? ` ${latestValue.unit}` : '';
            const date = new Date(latestValue.date).toLocaleDateString();

            content += `
                <div class="current-measurement">
                    <p><strong>Latest ${analyte}:</strong></p>
                    <p class="value-display ${statusClass}">
                        ${latestValue.value}${unit}
                        <span class="status">(${statusText})</span>
                    </p>
                    <p class="measurement-date">Measured: ${date}</p>
                </div>
            `;
        } else if (analyte) {
            content += `<p class="no-data">No ${analyte} data available</p>`;
        }

        content += `
                <p class="click-hint">Click marker for detailed view</p>
            </div>
        `;

        return content;
    }

    /**
     * Update marker colors based on current analyte selection
     * @param {string} analyte - Selected analyte
     */
    updateMarkerColors(analyte) {
        this.currentAnalyte = analyte;

        Object.entries(this.markers).forEach(([stationCode, marker]) => {
            let status = 'no_data';

            if (analyte && this.data.latestValues[stationCode] && 
                this.data.latestValues[stationCode][analyte]) {
                status = this.data.latestValues[stationCode][analyte].status;
            }

            const color = this.markerColors[status] || this.markerColors.no_data;
            marker.setStyle({
                fillColor: color
            });

            // Update popup content
            const station = this.data.stations[stationCode];
            const latestValue = analyte ? this.data.latestValues[stationCode]?.[analyte] : null;
            const popupContent = this.createPopupContent(stationCode, station, analyte, latestValue);
            marker.setPopupContent(popupContent);
        });
    }

    /**
     * Update marker sizes based on zoom level
     */
    updateMarkerSizes() {
        const zoom = this.map.getZoom();
        const baseRadius = 8;
        const scaleFactor = Math.max(0.5, Math.min(1.5, zoom / 13));
        const newRadius = baseRadius * scaleFactor;

        Object.values(this.markers).forEach(marker => {
            marker.setRadius(newRadius);
        });
    }

    /**
     * Clear all station markers from the map
     */
    clearMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};
    }

    /**
     * Fit map view to show all markers without animation
     */
    fitToMarkers() {
        const markerPositions = Object.values(this.markers).map(marker => marker.getLatLng());
        
        if (markerPositions.length > 0) {
            const group = new L.featureGroup(Object.values(this.markers));
            this.map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 15,
                animate: false  // Disable animation
            });
        }
    }

    /**
     * Show detailed station information in sidebar
     * @param {string} stationCode - Station code
     * @param {Object} station - Station data
     */
    showStationDetails(stationCode, station) {
        if (window.sidebarManager) {
            window.sidebarManager.showStation(stationCode, station, this.data);
        }
    }

    /**
     * Close sidebar panel
     */
    closeSidebar() {
        if (window.sidebarManager) {
            window.sidebarManager.hide();
        }
    }

    /**
     * Highlight a specific station marker
     * @param {string} stationCode - Station code to highlight
     */
    highlightStation(stationCode) {
        const marker = this.markers[stationCode];
        if (marker) {
            // Pan to marker without animation
            this.map.panTo(marker.getLatLng());
        }
    }

    /**
     * Get current map bounds
     * @returns {L.LatLngBounds} Current map bounds
     */
    getBounds() {
        return this.map.getBounds();
    }

    /**
     * Get map center
     * @returns {L.LatLng} Current map center
     */
    getCenter() {
        return this.map.getCenter();
    }

    /**
     * Get current zoom level
     * @returns {number} Current zoom level
     */
    getZoom() {
        return this.map.getZoom();
    }

    /**
     * Resize map (useful after container size changes)
     */
    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    /**
     * Destroy map instance
     */
    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.map.remove();
            this.map = null;
        }
    }
}

// Create global instance
window.mapManager = new MapManager();