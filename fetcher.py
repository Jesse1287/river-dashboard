import json
import urllib.request

# 1. Fetch River Data
def get_river_data():
    try:
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][0]['value'])
            return {"stage": f"{val:.2f} ft"}
    except:
        return {"stage": "N/A"}

# 2. Fetch Weather Data (Denham Springs)
def get_weather_data():
    try:
        # Note: I am using a placeholder for your API key. 
        # Make sure to replace the end of the URL with your actual OpenWeatherMap API key!
        url = "https://api.openweathermap.org/data/2.5/forecast?lat=30.48&lon=-90.95&units=imperial&cnt=1&appid=2a95de8d0a53a380df2a6916b7d7582e"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            temp = int(data['list'][0]['main']['temp'])
            return {"temp": f"{temp}°F", "desc": data['list'][0]['weather'][0]['description']}
    except:
        return {"temp": "N/A", "desc": "N/A"}

# 3. Save to data.json
data = {
    "river": get_river_data(),
    "weather": get_weather_data()
}

with open('data.json', 'w') as f:
    json.dump(data, f)
