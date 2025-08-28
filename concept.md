- Single page applicaiton
- Main frame is a map (open street maps)
- Underlying data is static in html/js/json files. No back end.
- Map has Water sampling locations are overlayed as pins
- User has selector box that choose a sampled analyte
- Pins change color (red/green) depending on if the most recent sample for that analyte is inside or outside the acceptable bounds. Pin should be blue if range of analyte not set.
- Data is currently stored in a xlsx file . These will need to be pre processed. Have this code as a separate python file - use pandas for import
	- data is in two sheets "Observations" and "Measurement"
	- Location is based on "StationCode" - we'll need a file to translate station codes to lon/lat
	- "AnalyteName" tells the analyte
	- Values are "Result" on measurement sheet and "VariableResult" on observations sheet
 
- Ignore stations in the data file not mapping json.
- When a user clicks on a location, it should open a side-bar with a time series graph measurements for that location.
	- There should be checkboxes to allow the user to select which series are plotted.
	- Axes should resize depending on the scale of the plotted data
- Locations mapping is
{
  "SRA190": {
   "lon": -121.9883528,
   "lat": 37.7714199
  },
  "SRA161": {
   "lon": -121.981522,
   "lat": 37.811637
  },
  "SRA160": {
   "lon": -121.9852663,
   "lat": 37.8122981
  },
  "SRA141": {
   "lon": -121.9976948,
   "lat": 37.8238159
  },
  "SRA120": {
   "lon": -122.0205907,
   "lat": 37.8407117
  },
  "SRA100": {
   "lon": -122.0391426,
   "lat": 37.8647308
  }
 }

 
 - Acceptable ranges are (You may need to map between analyte names "Nitrate" vs "Nitrate as NO3")
 {
   "Dissolved Oxygen": {
   "min": 5,
   "max": null,
   "unit": "mg/L"
   },
   "pH": {
   "min": 6.5,
   "max": 8.5,
   "unit": null
   },
   "Specific Conductivity": {
   "min": 150,
   "max": 500,
   "unit": "uS/cm"
   },
   "Temperature": {
   "min": null,
   "max": 24,
   "unit": "Deg C"
   },
   "Turbidity": {
   "min": null,
   "max": 25,
   "unit": "NTU"
   },
   "Nitrate": {
   "min": null,
   "max": 45,
   "unit": "mg/L"
   }
  }