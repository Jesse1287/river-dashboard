import urllib.request
import json
import os
import datetime

def get_weather(lat, lon):
    try:
        # Requesting 4 data points (current + next three 3-hour forecast blocks)
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=4&appid=2a95de8d0a53a380df2a6916b7d7582e"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            
            # 1. Map Current Metrics (Index 0)
            current_raw = data['list'][0]
            current_pack = {
                "temp": f"{int(current_raw['main']['temp'])}°F",
                "feels": f"{int(current_raw['main']['feels_like'])}°F",
                "desc": current_raw['weather'][0]['description'].title(),
                "pop": f"{int(current_raw.get('pop', 0) * 100)}%",
                "hum": f"{current_raw['main']['humidity']}%",
                "wind": f"{round(current_raw['wind']['speed'], 1)} mph"
            }
            
            # 2. Map Next Three 3-Hour Timelines
            forecast_list = []
            for item in data['list'][1:4]:
                # Convert standard API epoch timestamps cleanly to display hours safely across all systems
                timestamp = datetime.datetime.fromtimestamp(item['dt'])
                hour_str = timestamp.strftime('%I %p').lstrip('0')
                
                forecast_list.append({
                    "time": hour_str,
                    "temp": f"{int(item['main']['temp'])}°F",
                    "desc": item['weather'][0]['main'],
                    "pop": f"{int(item.get('pop', 0) * 100)}%"
                })
                
            return {
                "current": current_pack,
                "forecast": forecast_list
            }
    except Exception as e:
        print(f"Weather error for {lat}, {lon}: {e}")
        blank_current = {"temp": "N/A", "feels": "N/A", "desc": "Error", "pop": "N/A", "hum": "N/A", "wind": "N/A"}
        return {"current": blank_current, "forecast": []}

def get_river():
    try:
        # Appending period=P1D pulls the array of values tracked over the trailing 24 hours
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            time_series = data['value']['timeSeries'][0]['values'][0]['value']
            
            # Extract current level (the last node in the time array)
            current_val = float(time_series[-1]['value'])
            # Extract historical baseline (the very first node tracked 24 hours ago)
            historical_val = float(time_series[0]['value'])
            
            delta_val = current_val - historical_val
            delta_str = f"+{delta_val:.2f} ft" if delta_val >= 0 else f"{delta_val:.2f} ft"
            
            return {
                "stage": f"{current_val:.2f} ft",
                "raw": current_val,
                "delta": delta_str
            }
    except Exception as e:
        print(f"River extraction error: {e}")
        return {"stage": "N/A", "raw": 0.0, "delta": "--"}

def check_river_alerts(river_val):
    state_file = 'alert_state.txt'
    already_alerted = os.path.exists(state_file)
    ntfy_topic = "my_private_dashboard_river_alerts" 
    url = f"https://ntfy.sh/{ntfy_topic}"

    if river_val >= 29.0:
        if not already_alerted:
            try:
                req = urllib.request.Request(
                    url, 
                    data=f"⚠️ ALERT: Amite River has crossed action stage! Level: {river_val} ft.".encode('utf-8'),
                    headers={'Title': 'River Level Warning', 'Priority': 'high', 'Tags': 'warning,ocean'}
                )
                urllib.request.urlopen(req, timeout=5)
                with open(state_file, 'w') as f: f.write('alerted')
            except Exception as e: print("Alert notification failed:", e)
    else:
        if already_alerted:
            try:
                req = urllib.request.Request(
                    url, 
                    data=f"🟢 All Clear: Amite River has receded to {river_val} ft.".encode('utf-8'),
                    headers={'Title': 'River Level Normal', 'Priority': 'default', 'Tags': 'white_check_mark'}
                )
                urllib.request.urlopen(req, timeout=5)
            except: pass
            if os.path.exists(state_file): os.remove(state_file)

if __name__ == "__main__":
    river_pack = get_river()
    check_river_alerts(river_pack["raw"])

    # Append structural local system timestamps during execution assembly
    local_now = datetime.datetime.now().strftime("%I:%M %p").lstrip('0')

    composite_data = {
        "system": {
            "last_updated": local_now
        },
        "river": river_pack,
        "weather": {
            "denham": get_weather(30.48, -90.95),
            "donaldsonville": get_weather(30.10, -90.99)
        }
    }

    with open('data.json', 'w') as f:
        json.dump(composite_data, f, indent=4)
