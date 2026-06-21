import urllib.request
import json
import os
import datetime
import pytz
import random

# Fun messages for the dashboard
FUN_MESSAGES = [
    "🌊 The river is speaking... let's listen.",
    "☔ Mother Nature is in charge here.",
    "🚀 Data flowing like the Amite!",
    "⚡ Real-time hydro-updates, baby!",
    "🎯 Science rules! 🧪",
    "🌍 Stay dry out there!",
    "💧 Monitoring the flow since 2026",
    "🛰️ Satellite brain activated",
    "📊 Just some wet data for ya",
    "⛅ Check before you wreck"
]

def get_weather(lat, lon):
    try:
        # Simplified URL to get ONLY current weather, reducing API load
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=imperial&appid=2a95de8d0a53a380df2a6916b7d7582e"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return {
                "temp": f"{int(data['main']['temp'])}°F",
                "feels": f"{int(data['main']['feels_like'])}°F",
                "desc": data['weather'][0]['description'].title(),
                "hum": f"{data['main']['humidity']}%",
                "wind": f"{round(data['wind']['speed'], 1)} mph",
                "pop": "0%"  # Default to 0%, OpenWeather free tier doesn't have PoP
            }
    except Exception as e:
        print(f"Weather error for {lat}: {e}")
        return {
            "temp": "N/A",
            "feels": "N/A",
            "desc": "Offline",
            "hum": "N/A",
            "wind": "N/A",
            "pop": "N/A"
        }

def get_river():
    try:
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][-1]['value'])
            return {"stage": f"{val:.2f} ft", "raw": val}
    except:
        return {"stage": "N/A", "raw": 0.0}

def get_central_time():
    """Convert UTC to Central Time (handles CST/CDT automatically)"""
    central = pytz.timezone('America/Chicago')
    now = datetime.datetime.now(central)
    # Format: "2:34 PM CST" or "2:34 PM CDT"
    tz_label = now.strftime('%Z')
    time_str = now.strftime("%I:%M %p")
    return f"{time_str} {tz_label}"

if __name__ == "__main__":
    final_data = {
        "system": {
            "last_updated": get_central_time(),
            "message": random.choice(FUN_MESSAGES)
        },
        "river": get_river(),
        "weather": {
            "denham": get_weather(30.48, -90.95),
            "donaldsonville": get_weather(30.10, -90.99),
            "ponchatoula": get_weather(30.44, -90.40)
        }
    }
    try:
        with open('data.json', 'w') as f:
            json.dump(final_data, f, indent=4)
    except Exception as e:
        print(f"Critical error: {e}")
