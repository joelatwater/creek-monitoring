/**
 * Main Application Module
 * Coordinates all components and handles application state
 */

class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarTitle = document.getElementById('sidebar-title');
        this.stationInfo = document.getElementById('station-info');
        this.chartControls = document.getElementById('chart-controls');
        this.chartContainer = document.getElementById('chart-container');
        this.currentValues = document.getElementById('current-values');
        this.analyteCheckboxes = document.getElementById('analyte-checkboxes');
        this.valuesList = document.getElementById('values-list');
        
        this.currentStation = null;
        this.data = null;
        this.selectedAnalytes = new Set(['Temperature']); // Global selection persistence

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('sidebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // ESC key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
                this.hide();
            }
        });
    }

    show() {
        this.sidebar.classList.add('open');
    }

    hide() {
        this.sidebar.classList.remove('open');
        if (window.chartManager) {
            window.chartManager.clearChart();
        }
    }

    showStation(stationCode, stationData, appData) {
        this.currentStation = stationCode;
        this.data = appData;

        // Update sidebar title
        this.sidebarTitle.textContent = stationData.name || `Station ${stationCode}`;

        // Update station info
        this.updateStationInfo(stationCode, stationData);

        // Update current values
        this.updateCurrentValues(stationCode);

        // Setup chart controls
        this.setupChartControls(stationCode);

        // Show sidebar
        this.show();
    }

    updateStationInfo(stationCode, stationData) {
        const measurementCount = stationData.measurement_count || 0;
        const analyteCount = stationData.analytes ? stationData.analytes.length : 0;

        this.stationInfo.innerHTML = `
            <h3>${stationData.name || stationCode}</h3>
            <p><strong>Station Code:</strong> ${stationCode}</p>
            <p><strong>Location:</strong> 
                <span class="station-coordinates">${stationData.latitude.toFixed(6)}, ${stationData.longitude.toFixed(6)}</span>
            </p>
            <p><strong>Total Measurements:</strong> ${measurementCount}</p>
            <p><strong>Monitored Parameters:</strong> ${analyteCount}</p>
        `;
    }

    updateCurrentValues(stationCode) {
        const latestValues = this.data.latestValues[stationCode];
        
        if (!latestValues || Object.keys(latestValues).length === 0) {
            this.currentValues.style.display = 'none';
            return;
        }

        let valuesHtml = '';
        Object.entries(latestValues).forEach(([analyte, valueData]) => {
            const unit = valueData.unit ? ` ${valueData.unit}` : '';
            const date = new Date(valueData.date).toLocaleDateString();
            const statusClass = valueData.status || 'no-data';

            valuesHtml += `
                <div class="value-item ${statusClass}">
                    <div class="value-label">${analyte}</div>
                    <div class="value-data">
                        <div class="value-number">${valueData.value}${unit}</div>
                        <div class="value-date">${date}</div>
                    </div>
                </div>
            `;
        });

        this.valuesList.innerHTML = valuesHtml;
        this.currentValues.style.display = 'block';
    }

    setupChartControls(stationCode) {
        const stationMeasurements = this.data.measurements[stationCode];
        
        if (!stationMeasurements) {
            this.chartControls.style.display = 'none';
            this.chartContainer.style.display = 'none';
            return;
        }

        const analytes = Object.keys(stationMeasurements);
        
        if (analytes.length === 0) {
            this.chartControls.style.display = 'none';
            this.chartContainer.style.display = 'none';
            return;
        }

        // Create checkboxes for each analyte
        let checkboxHtml = '';
        analytes.forEach(analyte => {
            const unit = this.data.analyteRanges?.[analyte]?.unit || '';
            const unitText = unit ? ` (${unit})` : '';
            const isSelected = this.selectedAnalytes.has(analyte);
            const checkedAttribute = isSelected ? 'checked' : '';
            
            checkboxHtml += `
                <div class="checkbox-item">
                    <input type="checkbox" id="analyte-${analyte}" value="${analyte}" ${checkedAttribute}>
                    <label for="analyte-${analyte}">
                        ${analyte}
                        <span class="analyte-unit">${unitText}</span>
                    </label>
                </div>
            `;
        });

        this.analyteCheckboxes.innerHTML = checkboxHtml;

        // Add event listeners to checkboxes
        analytes.forEach(analyte => {
            const checkbox = document.getElementById(`analyte-${analyte}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.toggleAnalyteChart(analyte, e.target.checked);
                });
            }
        });

        // Show controls and container
        this.chartControls.style.display = 'block';
        this.chartContainer.style.display = 'block';

        // Initialize chart with this station and currently selected analytes
        if (window.chartManager) {
            const selectedForStation = analytes.filter(analyte => this.selectedAnalytes.has(analyte));
            window.chartManager.showStation(stationCode, selectedForStation);
        }
    }

    toggleAnalyteChart(analyte, visible) {
        // Update global selection
        if (visible) {
            this.selectedAnalytes.add(analyte);
        } else {
            this.selectedAnalytes.delete(analyte);
        }
        
        // Update chart
        if (window.chartManager) {
            window.chartManager.toggleAnalyte(analyte, visible);
        }
    }
}

class CreekMonitoringApp {
    constructor() {
        this.data = null;
        this.currentAnalyte = null;
        this.loading = false;

        // Initialize managers
        this.sidebarManager = new SidebarManager();
        window.sidebarManager = this.sidebarManager;

        // DOM elements
        this.analyteSelect = document.getElementById('analyte-select');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorModal = document.getElementById('error-modal');

        this.setupEventListeners();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Creek Monitoring Application...');

        try {
            this.showLoading();
            
            // Load data
            this.data = await window.dataLoader.loadAllData();
            console.log('Application data loaded:', this.data);

            // Initialize map
            window.mapManager.initMap();
            window.mapManager.setData(this.data);

            // Initialize chart
            window.chartManager.initChart(this.data);

            // Setup UI
            this.setupAnalyteSelector();
            this.setupInitialMapView();

            this.hideLoading();
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoading();
            this.showError('Failed to load application data. Please check your connection and try again.');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Analyte selector change
        if (this.analyteSelect) {
            this.analyteSelect.addEventListener('change', (e) => {
                this.selectAnalyte(e.target.value);
            });
        }

        // Error modal
        const errorModalClose = document.getElementById('error-modal-close');
        const errorModalOk = document.getElementById('error-modal-ok');
        
        if (errorModalClose) {
            errorModalClose.addEventListener('click', () => this.hideError());
        }
        
        if (errorModalOk) {
            errorModalOk.addEventListener('click', () => this.hideError());
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            if (window.mapManager) {
                window.mapManager.invalidateSize();
            }
            if (window.chartManager) {
                window.chartManager.resize();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && window.mapManager) {
                // Refresh map when page becomes visible
                setTimeout(() => {
                    window.mapManager.invalidateSize();
                }, 100);
            }
        });
    }

    /**
     * Setup analyte selector dropdown
     */
    setupAnalyteSelector() {
        if (!this.analyteSelect || !this.data) return;

        const analytes = window.dataLoader.getAnalytes(this.data);
        
        // Clear existing options
        this.analyteSelect.innerHTML = '<option value="">Select an analyte...</option>';

        // Add analyte options
        analytes.forEach(analyte => {
            const option = document.createElement('option');
            option.value = analyte;
            option.textContent = analyte;
            this.analyteSelect.appendChild(option);
        });

        console.log(`Added ${analytes.length} analytes to selector`);
    }

    /**
     * Setup initial map view with all stations and default analyte
     */
    setupInitialMapView() {
        if (window.mapManager) {
            window.mapManager.addStationMarkers();
            
            // Set Temperature as default analyte
            if (this.analyteSelect) {
                this.analyteSelect.value = 'Temperature';
                this.selectAnalyte('Temperature');
            }
        }
    }

    /**
     * Select and display data for a specific analyte
     * @param {string} analyte - Selected analyte name
     */
    selectAnalyte(analyte) {
        this.currentAnalyte = analyte;
        console.log(`Selected analyte: ${analyte || 'none'}`);

        if (window.mapManager) {
            if (analyte) {
                window.mapManager.updateMarkerColors(analyte);
            } else {
                // Reset to show all stations without color coding
                window.mapManager.addStationMarkers(null);
            }
        }

        // Update sidebar if currently showing a station
        if (this.sidebarManager.currentStation && analyte) {
            const stationCode = this.sidebarManager.currentStation;
            const stationData = this.data.stations[stationCode];
            this.sidebarManager.showStation(stationCode, stationData, this.data);
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.loading = true;
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.loading = false;
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Show error modal
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (this.errorModal) {
            this.errorModal.style.display = 'flex';
        }
    }

    /**
     * Hide error modal
     */
    hideError() {
        if (this.errorModal) {
            this.errorModal.style.display = 'none';
        }
    }

    /**
     * Get current application state
     * @returns {Object} Current application state
     */
    getState() {
        return {
            currentAnalyte: this.currentAnalyte,
            mapCenter: window.mapManager ? window.mapManager.getCenter() : null,
            mapZoom: window.mapManager ? window.mapManager.getZoom() : null,
            sidebarOpen: this.sidebarManager.sidebar.classList.contains('open'),
            currentStation: this.sidebarManager.currentStation
        };
    }

    /**
     * Handle application cleanup
     */
    destroy() {
        if (window.mapManager) {
            window.mapManager.destroy();
        }
        
        if (window.chartManager) {
            window.chartManager.destroy();
        }

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    window.creekApp = new CreekMonitoringApp();
    window.creekApp.init();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.creekApp) {
        window.creekApp.destroy();
    }
});