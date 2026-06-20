import json
import urllib.request

# 1. Fetch Weather Function
def get_weather(lat, lon):
    try:
        # REPLACE 'YOUR_API_KEY_HERE' with your real key
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=1&appid=YOUR_API_KEY_HERE"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            w = data['list'][0]
            return {
                "temp": f"{int(w['main']['temp'])}°F",
                "feels": f"{int(w['main']['feels_like'])}°F",
                "desc": w['weather'][0]['description'].title(),
                "pop": f"{int(float(w.get('pop', 0)) * 100)}%",
                "hum": f"{w['main']['humidity']}%",
                "press": f"{w['main']['pressure']} hPa",
                "wind": f"{w['wind']['speed']} mph",
                "vis": f"{round(w.get('visibility', 16093) / 1609.34, 1)} mi"
            }
    except:
        return {"temp": "N/A", "desc": "N/A", "feels": "N/A", "pop": "N/A", "hum": "N/A", "press": "N/A", "wind": "N/A", "vis": "N/A"}

# 2. Fetch River Function
def get_river():
    try:
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][0]['value'])
            return {"stage": f"{val:.2f} ft", "raw": val}
    except:
        return {"stage": "N/A", "raw": 0.0}

# 3. Assemble and Save
data = {
    "river": get_river(),
    "weather": {
        "denham": get_weather(30.48, -90.95),
        "donaldsonville": get_weather(30.10, -90.99)
    }
}

with open('data.json', 'w') as f:
    json.dump(data, f)
