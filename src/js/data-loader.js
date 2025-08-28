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
        // Use a relative path that works from the src directory
        return this.loadJSON('./data/analyte_ranges.json', 'analyteRanges');
    }

    /**
     * Load all data required for the application
     * @returns {Promise} Promise that resolves to object with all data
     */
    async loadAllData() {
        try {
            // Load analyte ranges first (they're needed for fallback data)
            const analyteRanges = await this.loadAnalyteRanges();
            
            // Try to load processed data, fall back to demo data if not available
            let stations, measurements, latestValues;
            
            try {
                [stations, measurements, latestValues] = await Promise.all([
                    this.loadStations(),
                    this.loadMeasurements(),
                    this.loadLatestValues()
                ]);
            } catch (error) {
                console.warn('Processed data files not found, using demo data');
                [stations, measurements, latestValues] = this.generateDemoData(analyteRanges);
            }

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
     * Generate demo data when processed data files are not available
     * @param {Object} analyteRanges - Analyte range definitions
     * @returns {Array} Array with [stations, measurements, latestValues]
     */
    generateDemoData(analyteRanges) {
        // Station coordinates from concept.md
        const stationCoords = {
            "SRA190": { "lon": -121.9883528, "lat": 37.7714199 },
            "SRA161": { "lon": -121.981522, "lat": 37.811637 },
            "SRA160": { "lon": -121.9852663, "lat": 37.8122981 },
            "SRA141": { "lon": -121.9976948, "lat": 37.8238159 },
            "SRA120": { "lon": -122.0205907, "lat": 37.8407117 },
            "SRA100": { "lon": -122.0391426, "lat": 37.8647308 }
        };

        const analytes = Object.keys(analyteRanges);
        const stations = {};
        const measurements = {};
        const latestValues = {};

        // Generate demo data for each station
        Object.entries(stationCoords).forEach(([stationCode, coords]) => {
            stations[stationCode] = {
                code: stationCode,
                name: `Station ${stationCode}`,
                longitude: coords.lon,
                latitude: coords.lat,
                analytes: analytes,
                measurement_count: 50
            };

            measurements[stationCode] = {};
            latestValues[stationCode] = {};

            // Generate demo measurements for each analyte
            analytes.forEach(analyte => {
                const range = analyteRanges[analyte];
                measurements[stationCode][analyte] = this.generateTimeSeries(analyte, range);
                
                // Get latest value and status
                const timeSeries = measurements[stationCode][analyte];
                const latest = timeSeries[timeSeries.length - 1];
                
                let status = 'no_range';
                if (range.min !== null || range.max !== null) {
                    const value = latest.value;
                    const withinRange = (range.min === null || value >= range.min) && 
                                       (range.max === null || value <= range.max);
                    status = withinRange ? 'acceptable' : 'outside_range';
                }

                latestValues[stationCode][analyte] = {
                    value: latest.value,
                    date: latest.date,
                    status: status,
                    unit: range.unit
                };
            });
        });

        return [stations, measurements, latestValues];
    }

    /**
     * Generate a realistic time series for an analyte
     * @param {string} analyte - Analyte name
     * @param {Object} range - Acceptable range for the analyte
     * @returns {Array} Array of measurement objects
     */
    generateTimeSeries(analyte, range) {
        const measurements = [];
        const now = new Date();
        const daysBack = 365; // Generate a year of data
        
        // Base values for different analytes (realistic for creek monitoring)
        const baseValues = {
            'Dissolved Oxygen': 7.5,
            'pH': 7.2,
            'Specific Conductivity': 300,
            'Temperature': 15,
            'Turbidity': 8,
            'Nitrate': 12
        };

        const baseValue = baseValues[analyte] || 10;
        let currentValue = baseValue;

        for (let i = daysBack; i >= 0; i -= 7) { // Weekly measurements
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Add seasonal variation
            const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.2;
            
            // Add random variation
            const randomFactor = (Math.random() - 0.5) * 0.3;
            
            // Calculate new value with trends
            currentValue = baseValue * (1 + seasonalFactor + randomFactor);
            
            // Add some outliers occasionally
            if (Math.random() < 0.05) { // 5% chance of outlier
                currentValue *= (Math.random() > 0.5) ? 1.5 : 0.7;
            }

            // Keep values positive
            currentValue = Math.max(0.1, currentValue);

            measurements.push({
                date: date.toISOString(),
                value: Math.round(currentValue * 100) / 100, // Round to 2 decimals
                source: 'demo'
            });
        }

        return measurements.sort((a, b) => new Date(a.date) - new Date(b.date));
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