import urllib.request
import json
import os
import datetime
import random

def get_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=4&appid=2a95de8d0a53a380df2a6916b7d7582e"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            current_raw = data['list'][0]
            current_pack = {
                "temp": f"{int(current_raw['main']['temp'])}°F",
                "feels": f"{int(current_raw['main']['feels_like'])}°F",
                "desc": current_raw['weather'][0]['description'].title(),
                "pop": f"{int(current_raw.get('pop', 0) * 100)}%",
                "hum": f"{current_raw['main']['humidity']}%",
                "wind": f"{round(current_raw['wind']['speed'], 1)} mph"
            }
            return {"current": current_pack, "forecast": []}
    except Exception as e:
        print(f"Weather error: {e}")
        return {"current": {"temp": "N/A", "desc": "Error"}, "forecast": []}

def get_river():
    try:
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            val_list = data['value']['timeSeries'][0]['values'][0]['value']
            curr = float(val_list[-1]['value'])
            prev = float(val_list[0]['value'])
            delta = f"{'+' if curr-prev >=0 else ''}{(curr-prev):.2f} ft"
            return {"stage": f"{curr:.2f} ft", "raw": curr, "delta": delta}
    except Exception as e:
        print(f"River error: {e}")
        return {"stage": "N/A", "raw": 0.0, "delta": "--"}

def check_river_alerts(river_val):
    state_file = 'alert_state.txt'
    url = "https://ntfy.sh/roux-amite-alerts-8821"
    if float(river_val) >= 29.0:
        if not os.path.exists(state_file):
            try:
                msg = f"⚠️ ACTION STAGE: Amite River is at {river_val} ft!"
                req = urllib.request.Request(url, data=msg.encode('utf-8'), headers={'Title': 'Amite Alert', 'Priority': 'high'})
                urllib.request.urlopen(req, timeout=5)
                with open(state_file, 'w') as f: f.write(str(river_val))
            except: pass
    elif os.path.exists(state_file):
        os.remove(state_file)

if __name__ == "__main__":
    r = get_river()
    check_river_alerts(r["raw"])
    data = {
        "system": {"last_updated": datetime.datetime.now().strftime("%I:%M %p")},
        "river": r,
        "weather": {"denham": get_weather(30.48, -90.95)}
    }
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=4)
