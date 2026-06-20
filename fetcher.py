import json
import urllib.request

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

data = {
    "river": {"stage": "Checking..."}, # You can keep your river logic here
    "weather": {
        "denham": get_weather(30.48, -90.95),
        "donaldsonville": get_weather(30.10, -90.99)
    }
}

with open('data.json', 'w') as f:
    json.dump(data, f)
