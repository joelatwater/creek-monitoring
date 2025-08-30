/**
 * Data Loader Module
 * Handles loading and caching of monitoring data from JSON files
 */

class DataLoader {
    constructor() {
        this.cache = {
            stations: null,
            measurements: null,
            latestValues: null,
            analyteRanges: null
        };
        this.loading = {};
    }

    /**
     * Load JSON data with caching and error handling
     * @param {string} url - URL to load
     * @param {string} cacheKey - Cache key for the data
     * @returns {Promise} Promise that resolves to the data
     */
    async loadJSON(url, cacheKey) {
        // Return cached data if available
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        // Return existing promise if already loading
        if (this.loading[cacheKey]) {
            return this.loading[cacheKey];
        }

        // Create loading promise
        this.loading[cacheKey] = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.cache[cacheKey] = data;
                delete this.loading[cacheKey];
                return data;
            })
            .catch(error => {
                delete this.loading[cacheKey];
                console.error(`Error loading ${url}:`, error);
                throw error;
            });

        return this.loading[cacheKey];
    }

    /**
     * Load station data (coordinates and metadata)
     * @returns {Promise} Promise that resolves to station data
     */
    async loadStations() {
        return this.loadJSON('data/stations.json', 'stations');
    }

    /**
     * Load measurement time series data
     * @returns {Promise} Promise that resolves to measurement data
     */
    async loadMeasurements() {
        return this.loadJSON('data/measurements.json', 'measurements');
    }

    /**
     * Load latest values for each station/analyte
     * @returns {Promise} Promise that resolves to latest values
     */
    async loadLatestValues() {
        return this.loadJSON('data/latest_values.json', 'latestValues');
    }

    /**
     * Load analyte acceptable ranges
     * @returns {Promise} Promise that resolves to analyte ranges
     */
    async loadAnalyteRanges() {
        return this.loadJSON('data/analyte_ranges.json', 'analyteRanges');
    }

    /**
     * Load all data required for the application
     * @returns {Promise} Promise that resolves to object with all data
     */
    async loadAllData() {
        try {
            const [stations, measurements, latestValues, analyteRanges] = await Promise.all([
                this.loadStations(),
                this.loadMeasurements(),
                this.loadLatestValues(),
                this.loadAnalyteRanges()
            ]);

            return {
                stations,
                measurements,
                latestValues,
                analyteRanges
            };
        } catch (error) {
            console.error('Failed to load application data:', error);
            throw error;
        }
    }

    /**
     * Get unique analytes from the data
     * @param {Object} data - Application data object
     * @returns {Array} Array of unique analyte names
     */
    getAnalytes(data) {
        const analytes = new Set();
        
        Object.values(data.stations).forEach(station => {
            station.analytes.forEach(analyte => analytes.add(analyte));
        });

        return Array.from(analytes).sort();
    }

    /**
     * Get stations that have data for a specific analyte
     * @param {Object} data - Application data object
     * @param {string} analyte - Analyte name
     * @returns {Array} Array of station codes
     */
    getStationsForAnalyte(data, analyte) {
        return Object.keys(data.stations).filter(stationCode => {
            return data.latestValues[stationCode] && 
                   data.latestValues[stationCode][analyte];
        });
    }

    /**
     * Clear all cached data (useful for development/testing)
     */
    clearCache() {
        this.cache = {
            stations: null,
            measurements: null,
            latestValues: null,
            analyteRanges: null
        };
    }
}

// Create global instance
window.dataLoader = new DataLoader();