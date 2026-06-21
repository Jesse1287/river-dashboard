import urllib.request
import json
import os
import datetime
import random

def get_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=4&appid=2a95de8d0a53a380df2a6916b7d7582e"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            curr = data['list'][0]
            return {
                "temp": f"{int(curr['main']['temp'])}°F",
                "desc": curr['weather'][0]['description'].title()
            }
    except:
        return {"temp": "N/A", "desc": "Offline"}

def get_river():
    try:
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][-1]['value'])
            return {"stage": f"{val:.2f} ft", "raw": val}
    except:
        return {"stage": "N/A", "raw": 0.0}

if __name__ == "__main__":
    try:
        final_data = {
            "system": {"last_updated": datetime.datetime.now().strftime("%I:%M %p")},
            "river": get_river(),
            "weather": {
                "denham": get_weather(30.48, -90.95),
                "donaldsonville": get_weather(30.10, -90.99),
                "ponchatoula": get_weather(30.44, -90.40)
            }
        }
        with open('data.json', 'w') as f:
            json.dump(final_data, f, indent=4)
    except Exception as e:
        print(f"Critical error: {e}")
