import urllib.request
import json
import os

def get_weather(lat, lon):
    try:
        # Using OpenWeatherMap 5-day/3-hour forecast API to extract the 'pop' (rain chance) field
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=imperial&cnt=1&appid=2a95de8d0a53a380df2a6916b7d7582e"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            w = data['list'][0]
            
            # Extract rain probability (pop is given as a float between 0 and 1)
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
        print(f"Weather fetch error for {lat}, {lon}: {e}")
        return {
            "temp": "N/A", "feels": "N/A", "desc": "Error fetching", 
            "pop": "N/A", "hum": "N/A", "wind": "N/A"
        }

def get_river():
    try:
        # USGS Amite River Gauge at Denham Springs
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            val = float(data['value']['timeSeries'][0]['values'][0]['value'][0]['value'])
            return {"stage": f"{val:.2f} ft", "raw": val}
    except Exception as e:
        print(f"River fetch error: {e}")
        return {"stage": "N/A", "raw": 0.0}

def check_river_alerts(river_val):
    state_file = 'alert_state.txt'
    already_alerted = os.path.exists(state_file)
    
    # Custom topic name for ntfy phone notifications
    ntfy_topic = "my_private_dashboard_river_alerts" 
    url = f"https://ntfy.sh/{ntfy_topic}"

    # Trigger alert if river hits or crosses action/flood stage (29.0 ft)
    if river_val >= 29.0:
        if not already_alerted:
            try:
                # Send the high water push notification
                req = urllib.request.Request(
                    url, 
                    data=f"⚠️ ALERT: Amite River has crossed action stage! Current Level: {river_val} ft.".encode('utf-8'),
                    headers={'Title': 'River Level Warning', 'Priority': 'high', 'Tags': 'warning,ocean'}
                )
                urllib.request.urlopen(req, timeout=5)
                
                # Create the temporary state file so it doesn't spam every 5 minutes
                with open(state_file, 'w') as f:
                    f.write('alerted')
            except Exception as e:
                print("Alert notification failed:", e)
    else:
        # If the river dropped below flood stage but we had previously alerted, send an all-clear
        if already_alerted:
            try:
                req = urllib.request.Request(
                    url, 
                    data=f"🟢 All Clear: Amite River has receded back down to {river_val} ft.".encode('utf-8'),
                    headers={'Title': 'River Level Normal', 'Priority': 'default', 'Tags': 'white_check_mark'}
                )
                urllib.request.urlopen(req, timeout=5)
            except:
                pass
            
            # Remove the temporary state file so it's ready to trip the alarm next time
            if os.path.exists(state_file):
                os.remove(state_file)

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    river_data = get_river()
    
    # Run the live alert check logic
    check_river_alerts(river_data["raw"])

    # Build composite data structure for data.json
    data = {
        "river": river_data,
        "weather": {
            "denham": get_weather(30.48, -90.95),
            "donaldsonville": get_weather(30.10, -90.99)
        }
    }

    # Safely write out the JSON file with clean formatting
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=4)
