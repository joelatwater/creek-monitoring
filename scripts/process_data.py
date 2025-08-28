#!/usr/bin/env python3
"""
Creek Water Quality Data Processing Script

This script processes water quality monitoring data from XLSX files and converts
it to JSON format for use in the web application.

Usage: python3 process_data.py [input_file.xlsx]
"""

import pandas as pd
import json
import sys
import os
from datetime import datetime
from pathlib import Path
import pytz

# Station coordinates (from concept.md)
STATION_COORDINATES = {
    "SRA190": {"lon": -121.9883528, "lat": 37.7714199},
    "SRA161": {"lon": -121.981522, "lat": 37.811637},
    "SRA160": {"lon": -121.9852663, "lat": 37.8122981},
    "SRA141": {"lon": -121.9976948, "lat": 37.8238159},
    "SRA120": {"lon": -122.0205907, "lat": 37.8407117},
    "SRA100": {"lon": -122.0391426, "lat": 37.8647308}
}

# Analyte name mappings (handle variations)
ANALYTE_MAPPINGS = {
    "Nitrate as NO3": "Nitrate",
    "Nitrate-N": "Nitrate",
    "DO": "Dissolved Oxygen",
    "Specific Conductance": "Specific Conductivity",
    "SpCond": "Specific Conductivity",
    "Temp": "Temperature",
    "Water Temperature": "Temperature"
}

# Acceptable ranges (from concept.md)
ACCEPTABLE_RANGES = {
    "Dissolved Oxygen": {"min": 5, "max": None, "unit": "mg/L"},
    "pH": {"min": 6.5, "max": 8.5, "unit": None},
    "Specific Conductivity": {"min": 150, "max": 500, "unit": "uS/cm"},
    "Temperature": {"min": None, "max": 24, "unit": "Deg C"},
    "Turbidity": {"min": None, "max": 25, "unit": "NTU"},
    "Nitrate": {"min": None, "max": 45, "unit": "mg/L"}
}

def normalize_analyte_name(name):
    """Normalize analyte names using the mapping table."""
    if not name:
        return name
    
    # Clean up whitespace first
    clean_name = str(name).strip()
    
    # Apply mappings
    return ANALYTE_MAPPINGS.get(clean_name, clean_name)

def combine_date_time_pacific(sample_date, collection_time):
    """Combine date and time, assuming Pacific timezone, and convert to UTC."""
    pacific_tz = pytz.timezone('America/Los_Angeles')
    
    if pd.isna(collection_time):
        # If no collection time, use midnight Pacific
        naive_datetime = pd.Timestamp.combine(sample_date.date(), pd.Timestamp('00:00:00').time())
    else:
        # Combine date and time
        naive_datetime = pd.Timestamp.combine(sample_date.date(), collection_time)
    
    # Localize to Pacific timezone (handles DST automatically)
    pacific_datetime = pacific_tz.localize(naive_datetime)
    
    # Convert to UTC
    utc_datetime = pacific_datetime.astimezone(pytz.UTC)
    
    # Return ISO format with Z
    return utc_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')

def load_excel_data(file_path):
    """Load data from Excel file with Observations and Measurements sheets."""
    try:
        observations_df = pd.read_excel(file_path, sheet_name='Observations')
        measurements_df = pd.read_excel(file_path, sheet_name='Measurements')
        return observations_df, measurements_df
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        sys.exit(1)

def process_observations_data(df):
    """Process the Observations sheet data."""
    # Expected columns: StationCode, AnalyteName, VariableResult, SampleDate, etc.
    processed_data = []
    
    for _, row in df.iterrows():
        station_code = row.get('StationCode')
        analyte_name = row.get('AnalyteName')
        result = row.get('VariableResult')
        sample_date = row.get('SampleDate')
        collection_time = row.get('CollectionTime')
        
        # Skip if missing essential data or unmapped station
        if not all([station_code, analyte_name]) or station_code not in STATION_COORDINATES:
            continue
        
        # Skip if no result value or not numeric
        if pd.isna(result):
            continue
        
        # Try to convert to float, skip if not possible
        try:
            result_value = float(result)
        except (ValueError, TypeError):
            continue
        
        # Normalize analyte name
        normalized_analyte = normalize_analyte_name(analyte_name)
        
        # Only include analytes that are in our acceptable ranges (water quality parameters)
        if normalized_analyte in ACCEPTABLE_RANGES:
            # Combine date and time with Pacific timezone
            utc_iso_date = combine_date_time_pacific(sample_date, collection_time) if sample_date else None
            
            processed_data.append({
                'station_code': station_code,
                'analyte': normalized_analyte,
                'value': result_value,
                'date': utc_iso_date,
                'source_sheet': 'Observations'
            })
    
    return processed_data

def process_measurements_data(df):
    """Process the Measurements sheet data."""
    # Expected columns: StationCode, AnalyteName, Result, SampleDate, etc.
    processed_data = []
    
    for _, row in df.iterrows():
        station_code = row.get('StationCode')
        analyte_name = row.get('AnalyteName')
        result = row.get('Result')
        sample_date = row.get('SampleDate')
        collection_time = row.get('CollectionTime')
        
        # Skip if missing essential data or unmapped station
        if not all([station_code, analyte_name]) or station_code not in STATION_COORDINATES:
            continue
        
        # Skip if no result value
        if pd.isna(result):
            continue
        
        # Try to convert to float, skip if not possible
        try:
            result_value = float(result)
        except (ValueError, TypeError):
            continue
        
        # Normalize analyte name
        normalized_analyte = normalize_analyte_name(analyte_name)
        
        # Only include analytes that are in our acceptable ranges (water quality parameters)
        if normalized_analyte in ACCEPTABLE_RANGES:
            # Combine date and time with Pacific timezone
            utc_iso_date = combine_date_time_pacific(sample_date, collection_time) if sample_date else None
            
            processed_data.append({
                'station_code': station_code,
                'analyte': normalized_analyte,
                'value': result_value,
                'date': utc_iso_date,
                'source_sheet': 'Measurements'
            })
    
    return processed_data

def generate_station_data(all_measurements):
    """Generate station metadata with coordinates."""
    stations = {}
    
    for station_code, coords in STATION_COORDINATES.items():
        # Find measurements for this station
        station_measurements = [m for m in all_measurements if m['station_code'] == station_code]
        
        # Get unique analytes for this station
        analytes = list(set(m['analyte'] for m in station_measurements))
        
        stations[station_code] = {
            'code': station_code,
            'name': f"Station {station_code}",
            'longitude': coords['lon'],
            'latitude': coords['lat'],
            'analytes': sorted(analytes),
            'measurement_count': len(station_measurements)
        }
    
    return stations

def generate_measurements_data(all_measurements):
    """Organize measurements by station and analyte."""
    measurements = {}
    
    for measurement in all_measurements:
        station_code = measurement['station_code']
        analyte = measurement['analyte']
        
        if station_code not in measurements:
            measurements[station_code] = {}
        
        if analyte not in measurements[station_code]:
            measurements[station_code][analyte] = []
        
        measurements[station_code][analyte].append({
            'date': measurement['date'],
            'value': measurement['value'],
            'source': measurement['source_sheet']
        })
    
    # Sort measurements by date for each analyte
    for station_code in measurements:
        for analyte in measurements[station_code]:
            measurements[station_code][analyte].sort(
                key=lambda x: x['date'] if x['date'] else '1900-01-01'
            )
    
    return measurements

def generate_latest_values(measurements_data):
    """Generate latest values for each station/analyte combination."""
    latest_values = {}
    
    for station_code, station_data in measurements_data.items():
        latest_values[station_code] = {}
        
        for analyte, measurements in station_data.items():
            if measurements:
                # Get the most recent measurement (already sorted by date)
                latest = measurements[-1]
                
                # Determine status based on acceptable ranges
                status = 'no_range'  # Default for analytes without defined ranges
                
                if analyte in ACCEPTABLE_RANGES:
                    ranges = ACCEPTABLE_RANGES[analyte]
                    value = latest['value']
                    
                    within_range = True
                    if ranges['min'] is not None and value < ranges['min']:
                        within_range = False
                    if ranges['max'] is not None and value > ranges['max']:
                        within_range = False
                    
                    status = 'acceptable' if within_range else 'outside_range'
                
                latest_values[station_code][analyte] = {
                    'value': latest['value'],
                    'date': latest['date'],
                    'status': status,
                    'unit': ACCEPTABLE_RANGES.get(analyte, {}).get('unit')
                }
    
    return latest_values

def main():
    """Main processing function."""
    # Get input file path
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        # Look for Excel files in data/raw directory
        raw_data_dir = Path(__file__).parent.parent / 'data' / 'raw'
        excel_files = list(raw_data_dir.glob('*.xlsx')) + list(raw_data_dir.glob('*.xls'))
        
        if not excel_files:
            print("No Excel files found in data/raw directory.")
            print("Usage: python3 process_data.py [input_file.xlsx]")
            sys.exit(1)
        
        input_file = excel_files[0]
        print(f"Using input file: {input_file}")
    
    # Load Excel data
    print("Loading Excel data...")
    observations_df, measurements_df = load_excel_data(input_file)
    
    print(f"Loaded {len(observations_df)} observations and {len(measurements_df)} measurements")
    
    # Process data
    print("Processing data...")
    observations_data = process_observations_data(observations_df)
    measurements_data = process_measurements_data(measurements_df)
    
    # Combine all measurements
    all_measurements = observations_data + measurements_data
    print(f"Total processed measurements: {len(all_measurements)}")
    
    # Generate output data structures
    stations = generate_station_data(all_measurements)
    measurements = generate_measurements_data(all_measurements)
    latest_values = generate_latest_values(measurements)
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / 'src' / 'data'
    output_dir.mkdir(exist_ok=True)
    
    # Save JSON files
    print("Saving JSON files...")
    
    with open(output_dir / 'stations.json', 'w') as f:
        json.dump(stations, f, indent=2)
    
    with open(output_dir / 'measurements.json', 'w') as f:
        json.dump(measurements, f, indent=2)
    
    with open(output_dir / 'latest_values.json', 'w') as f:
        json.dump(latest_values, f, indent=2)
    
    print("Data processing complete!")
    print(f"Generated files in {output_dir}:")
    print("  - stations.json")
    print("  - measurements.json")
    print("  - latest_values.json")

if __name__ == "__main__":
    main()