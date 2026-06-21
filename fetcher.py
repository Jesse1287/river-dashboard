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
            
            forecast_list = []
            for item in data['list'][1:4]:
                utc_ts = datetime.datetime.fromtimestamp(item['dt'], datetime.timezone.utc)
                local_ts = utc_ts - datetime.timedelta(hours=5)
                hour_str = local_ts.strftime('%I %p').lstrip('0')
                
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
        url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            time_series = data['value']['timeSeries'][0]['values'][0]['value']
            
            current_val = float(time_series[-1]['value'])
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
        return {"stage": "N
