# Creek Water Quality Monitoring

A single-page web application for visualizing creek water quality monitoring data using interactive maps and time series charts. The application helps identify water quality issues by comparing measurements against EPA-standard acceptable ranges.

## Features

- **Interactive Map**: OpenStreetMap display with station markers color-coded by water quality status
- **Real-time Data Visualization**: Dynamic pin colors based on selected analyte and latest measurements
- **Time Series Charts**: Interactive charts showing historical trends for each monitoring station  
- **Multi-parameter Analysis**: Support for Dissolved Oxygen, pH, Conductivity, Temperature, Turbidity, and Nitrate
- **Responsive Design**: Mobile-friendly interface that works on all screen sizes
- **Static Deployment**: No backend required - runs entirely in the browser

## Quick Start

1. **View the Application**
   ```bash
   python3 -m http.server 8000 --directory src
   ```
   Then open http://localhost:8000 in your browser

2. **Process New Data** (if you have XLSX files)
   ```bash
   # Set up virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install pandas openpyxl
   
   # Place your Excel file in data/raw/
   python3 scripts/process_data.py
   ```

## Data Requirements

The application expects water quality monitoring data in Excel format with these sheets:
- **Observations**: Field observations and measurements
- **Measurements**: Laboratory measurements and field data

Required columns:
- `StationCode`: Station identifier
- `SampleDate`: Date of measurement
- `AnalyteName`: Parameter being measured
- `Result` or `VariableResult`: Measurement value

## Project Structure

```
creek-monitoring/
├── data/
│   ├── raw/                    # Original XLSX files
│   ├── processed/              # JSON output files  
│   └── mappings/               # Station coordinates, analyte ranges
├── scripts/
│   └── process_data.py         # Data preprocessing script
├── src/                        # Web application files
│   ├── index.html              # Main HTML file
│   ├── css/styles.css          # Styling
│   ├── js/                     # JavaScript modules
│   └── data/                   # Processed JSON data files
└── venv/                       # Python virtual environment
```

## Water Quality Parameters

The application monitors these key water quality indicators:

- **Dissolved Oxygen**: ≥5 mg/L (minimum for aquatic life)
- **pH**: 6.5-8.5 (acceptable range for creek ecosystems)  
- **Specific Conductivity**: 150-500 µS/cm (indicates proper dissolved solids)
- **Temperature**: ≤24°C (maximum for ecosystem health)
- **Turbidity**: ≤25 NTU (water clarity standard)
- **Nitrate**: ≤45 mg/L (prevents eutrophication)

## Usage

1. **Select an Analyte**: Choose a water quality parameter from the dropdown
2. **View Station Status**: Map pins show green (acceptable), red (outside range), or blue (no range defined)
3. **Explore Details**: Click any station pin to view:
   - Current measurements and status
   - Historical time series charts  
   - Interactive trend analysis
4. **Compare Parameters**: Use checkboxes to overlay multiple analytes on charts

## Development

### Adding New Parameters
1. Update `ACCEPTABLE_RANGES` in `scripts/process_data.py`
2. Add mappings for alternate names in `ANALYTE_MAPPINGS`
3. Reprocess data with `python3 scripts/process_data.py`

### Customizing Stations
Update station coordinates in `data/mappings/station_coordinates.json` or modify `STATION_COORDINATES` in the processing script.

### Styling Changes
Modify CSS variables in `src/css/styles.css` for colors, fonts, and layout.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+  
- Safari 14+
- Mobile browsers

## License

MIT License - see LICENSE file for details.

## Data Source

Water quality data provided by The Watershed Project and partner monitoring organizations.
