import urllib.request
import json
import os # 👈 Added to manage the alert state tracking

# Keep your existing get_weather() and get_river() functions exactly the same...

def check_river_alerts(river_val):
    state_file = 'alert_state.txt'
    already_alerted = os.path.exists(state_file)
    
    # Change this topic name to something completely unique to you
    ntfy_topic = "my_private_dashboard_river_alerts" 
    url = f"https://ntfy.sh/{ntfy_topic}"

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
                
                # Create the file so it doesn't alert again next run
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
            
            # Remove the state file so it's ready to trip the alarm next time
            if os.path.exists(state_file):
                os.remove(state_file)

# --- MAIN EXECUTION BLOCK ---
if __name__ == "__main__":
    river_data = get_river()
    
    # Run the check on the raw number
    check_river_alerts(river_data["raw"])

    data = {
        "river": river_data,
        "weather": {
            "denham": get_weather(30.48, -90.95),
            "donaldsonville": get_weather(30.10, -90.99)
        }
    }

    with open('data.json', 'w') as f:
        json.dump(data, f, indent=4)
