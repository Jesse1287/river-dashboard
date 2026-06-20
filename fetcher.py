import urllib.request
import json

def get_weather(lat, lon):
    try:
        # Using your provided OpenWeatherMap API key
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=1&appid=2a95de8d0a53a380df2a6916b7d7582e"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            w = data['list'][0]
            
            # Extract rain probability if available
            pop_val = int(w.get('pop', 0) * 100)
            
            return {
                "temp": f"{int(w['main']['temp'])}°F",
                "feels": f"{int(w['main']['feels_like'])}°F",
                "desc": w['weather'][0]['description'].title(),
                "pop": f"{pop_val}%",
                "hum": f"{w['main']['humidity']}%",
                "wind": f"{round(w['wind']['speed'], 1)} mph"
            }
    except Exception as e:
        return {
            "temp": "N/A", "feels": "N/A", "desc": "Error fetching", 
            "pop": "N/A", "hum": "N/A", "wind": "N/A"
        }

def get_river():
    try:
        # USGS Amite River Gauge
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][0]['value'])
            return {"stage": f"{val:.2f} ft", "raw": val}
    except Exception as e:
        return {"stage": "N/A", "raw": 0.0}

# Build composite data structure
data = {
    "river": get_river(),
    "weather": {
        "denham": get_weather(30.48, -90.95),
        "donaldsonville": get_weather(30.10, -90.99)
    }
}

with open('data.json', 'w') as f:
    json.dump(data, f, indent=4)
