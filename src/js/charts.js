/**
 * Charts Module
 * Handles Chart.js time series visualization and chart interactions
 */

class ChartManager {
    constructor(canvasId = 'time-series-chart') {
        this.canvasId = canvasId;
        this.chart = null;
        this.data = null;
        this.currentStation = null;
        this.visibleAnalytes = new Set();
        
        // Chart configuration
        this.config = {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Water Quality Time Series',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#2c5530'
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#333',
                        borderColor: '#dee2e6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].parsed.x).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            },
                            label: function(context) {
                                const analyte = context.dataset.label;
                                const value = context.parsed.y.toFixed(2);
                                const unit = context.dataset.unit || '';
                                return `${analyte}: ${value}${unit ? ' ' + unit : ''}`;
                            },
                            afterBody: function(context) {
                                // Add acceptable range info if available
                                const dataset = context[0].dataset;
                                if (dataset.acceptableRange) {
                                    const range = dataset.acceptableRange;
                                    let rangeText = 'Acceptable: ';
                                    if (range.min !== null && range.max !== null) {
                                        rangeText += `${range.min} - ${range.max}`;
                                    } else if (range.min !== null) {
                                        rangeText += `≥ ${range.min}`;
                                    } else if (range.max !== null) {
                                        rangeText += `≤ ${range.max}`;
                                    } else {
                                        rangeText += 'Not defined';
                                    }
                                    if (range.unit) rangeText += ` ${range.unit}`;
                                    return [rangeText];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'MMM dd, yyyy',
                            displayFormats: {
                                day: 'MMM dd',
                                month: 'MMM yyyy',
                                year: 'yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Value'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 1,
                        hoverRadius: 2,
                        borderWidth: 1
                    },
                    line: {
                        borderWidth: 2,
                        tension: 0.1
                    }
                }
            }
        };

        // Color palette for different analytes
        this.colorPalette = [
            '#28a745', // Green
            '#007bff', // Blue  
            '#ffc107', // Yellow
            '#dc3545', // Red
            '#6f42c1', // Purple
            '#fd7e14', // Orange
            '#20c997', // Teal
            '#e83e8c', // Pink
            '#6c757d', // Gray
            '#17a2b8'  // Cyan
        ];

        this.analyteColors = {};
    }

    /**
     * Initialize the chart
     * @param {Object} data - Application data object
     */
    initChart(data) {
        this.data = data;
        
        const ctx = document.getElementById(this.canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${this.canvasId}' not found`);
            return;
        }

        this.chart = new Chart(ctx, this.config);
        console.log('Chart initialized');
    }

    /**
     * Show chart for a specific station
     * @param {string} stationCode - Station code
     * @param {Array} visibleAnalytes - Array of analyte names to show
     */
    showStation(stationCode, visibleAnalytes = []) {
        this.currentStation = stationCode;
        this.visibleAnalytes = new Set(visibleAnalytes);

        if (!this.chart) {
            console.warn('Chart not initialized');
            return;
        }

        if (!this.data || !this.data.measurements[stationCode]) {
            console.warn(`No measurement data for station ${stationCode}`);
            this.clearChart();
            return;
        }

        this.updateChart();
    }

    /**
     * Update chart data and display
     */
    updateChart() {
        if (!this.chart || !this.currentStation) return;

        const stationData = this.data.measurements[this.currentStation];
        const stationInfo = this.data.stations[this.currentStation];
        
        // Clear existing datasets
        this.chart.data.datasets = [];

        // Create datasets for visible analytes
        const datasets = [];
        let colorIndex = 0;

        this.visibleAnalytes.forEach(analyte => {
            if (stationData[analyte] && stationData[analyte].length > 0) {
                const dataset = this.createDataset(analyte, stationData[analyte], colorIndex);
                datasets.push(dataset);
                colorIndex++;
            }
        });

        this.chart.data.datasets = datasets;

        // Update chart title
        const stationName = stationInfo ? stationInfo.name : this.currentStation;
        this.chart.options.plugins.title.text = `Water Quality Time Series - ${stationName}`;

        // Update y-axis title based on visible analytes
        this.updateYAxisTitle();

        // Update the chart without animation for immediate response
        this.chart.update('none');

        // Always fit axes to current data after any change
        this.fitAxesToData();
    }

    /**
     * Create a dataset for a specific analyte
     * @param {string} analyte - Analyte name
     * @param {Array} measurements - Array of measurement objects
     * @param {number} colorIndex - Index for color selection
     * @returns {Object} Chart.js dataset object
     */
    createDataset(analyte, measurements, colorIndex) {
        // Get or assign color for this analyte
        if (!this.analyteColors[analyte]) {
            this.analyteColors[analyte] = this.colorPalette[colorIndex % this.colorPalette.length];
        }
        const color = this.analyteColors[analyte];

        // Get acceptable range for this analyte
        const acceptableRange = this.data.analyteRanges ? this.data.analyteRanges[analyte] : null;
        const unit = acceptableRange ? acceptableRange.unit : '';

        // Transform data for Chart.js
        const chartData = measurements.map(measurement => ({
            x: measurement.date ? new Date(measurement.date) : null,
            y: measurement.value
        })).filter(point => point.x !== null); // Filter out null dates

        const dataset = {
            label: analyte,
            data: chartData,
            borderColor: color,
            backgroundColor: color + '20', // Add transparency
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#ffffff',
            unit: unit,
            acceptableRange: acceptableRange,
            fill: false,
            tension: 0.1
        };

        return dataset;
    }

    /**
     * Update Y-axis title based on visible analytes
     */
    updateYAxisTitle() {
        let yAxisTitle = 'Value';
        
        if (this.visibleAnalytes.size === 1) {
            const analyte = Array.from(this.visibleAnalytes)[0];
            const unit = this.data.analyteRanges?.[analyte]?.unit;
            yAxisTitle = analyte + (unit ? ` (${unit})` : '');
        } else if (this.visibleAnalytes.size > 1) {
            // Check if all visible analytes have the same unit
            const units = Array.from(this.visibleAnalytes).map(analyte => 
                this.data.analyteRanges?.[analyte]?.unit
            ).filter(unit => unit);
            
            const uniqueUnits = [...new Set(units)];
            if (uniqueUnits.length === 1) {
                yAxisTitle = `Value (${uniqueUnits[0]})`;
            }
        }

        this.chart.options.scales.y.title.text = yAxisTitle;
    }

    /**
     * Fit chart axes to the current data
     */
    fitAxesToData() {
        if (!this.chart.data.datasets.length) {
            // Reset scales if no data
            this.chart.options.scales.y.min = undefined;
            this.chart.options.scales.y.max = undefined;
            this.chart.update();
            return;
        }

        // Get all data points from visible datasets
        const allValues = [];
        this.chart.data.datasets.forEach(dataset => {
            dataset.data.forEach(point => allValues.push(point.y));
        });

        if (allValues.length === 0) {
            // Reset if no actual data points
            this.chart.options.scales.y.min = undefined;
            this.chart.options.scales.y.max = undefined;
        } else {
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            const range = max - min;
            const padding = range > 0 ? range * 0.1 : Math.abs(min * 0.1) || 1; // 10% padding

            // Update y-axis range with padding
            this.chart.options.scales.y.min = Math.max(0, min - padding);
            this.chart.options.scales.y.max = max + padding;
        }
        
        // Apply the scale changes immediately
        this.chart.update();
    }

    /**
     * Toggle analyte visibility
     * @param {string} analyte - Analyte name
     * @param {boolean} visible - Whether to show the analyte
     */
    toggleAnalyte(analyte, visible) {
        if (visible) {
            this.visibleAnalytes.add(analyte);
        } else {
            this.visibleAnalytes.delete(analyte);
        }
        
        // Update chart and rescale immediately
        this.updateChart();
    }

    /**
     * Set which analytes are visible
     * @param {Array} analytes - Array of analyte names to show
     */
    setVisibleAnalytes(analytes) {
        this.visibleAnalytes = new Set(analytes);
        // Update chart and rescale when changing analyte set
        this.updateChart();
    }

    /**
     * Get currently visible analytes
     * @returns {Array} Array of visible analyte names
     */
    getVisibleAnalytes() {
        return Array.from(this.visibleAnalytes);
    }

    /**
     * Clear chart data
     */
    clearChart() {
        if (this.chart) {
            this.chart.data.datasets = [];
            this.chart.options.plugins.title.text = 'Water Quality Time Series';
            this.chart.options.scales.y.title.text = 'Value';
            this.chart.update();
        }
        this.currentStation = null;
        this.visibleAnalytes.clear();
    }

    /**
     * Add acceptable range bands to the chart
     * This adds background shading to show acceptable ranges
     */
    addAcceptableRangeBands() {
        // This would require additional Chart.js plugins
        // For now, range information is shown in tooltips
        console.log('Acceptable range bands - feature for future enhancement');
    }

    /**
     * Export chart as image
     * @returns {string} Base64 encoded image data
     */
    exportAsImage() {
        if (this.chart) {
            return this.chart.toBase64Image();
        }
        return null;
    }

    /**
     * Destroy chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.currentStation = null;
        this.visibleAnalytes.clear();
    }

    /**
     * Resize chart (call after container size change)
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    /**
     * Get chart statistics for current data
     * @returns {Object} Statistics object
     */
    getStatistics() {
        if (!this.currentStation || !this.visibleAnalytes.size) {
            return null;
        }

        const stats = {};
        
        this.visibleAnalytes.forEach(analyte => {
            const measurements = this.data.measurements[this.currentStation][analyte];
            if (measurements && measurements.length > 0) {
                const values = measurements.map(m => m.value);
                stats[analyte] = {
                    count: values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    average: values.reduce((sum, val) => sum + val, 0) / values.length,
                    latest: values[values.length - 1],
                    unit: this.data.analyteRanges?.[analyte]?.unit || ''
                };
            }
        });

        return stats;
    }
}

// Create global instance
window.chartManager = new ChartManager();