const getWMO = (code) => {
    const wmoCodes = {
        0: { desc: 'Clear Sky', icon: '☀️' },
        1: { desc: 'Mainly Clear', icon: '🌤️' },
        2: { desc: 'Partly Cloudy', icon: '⛅' },
        3: { desc: 'Overcast', icon: '☁️' },
        45: { desc: 'Fog', icon: '🌫️' },
        48: { desc: 'Depositing Rime Fog', icon: '🌫️' },
        51: { desc: 'Light Drizzle', icon: '🌧️' },
        53: { desc: 'Moderate Drizzle', icon: '🌧️' },
        55: { desc: 'Dense Drizzle', icon: '🌧️' },
        61: { desc: 'Slight Rain', icon: '🌦️' },
        63: { desc: 'Moderate Rain', icon: '🌧️' },
        65: { desc: 'Heavy Rain', icon: '🌧️' },
        71: { desc: 'Slight Snow', icon: '❄️' },
        73: { desc: 'Moderate Snow', icon: '❄️' },
        75: { desc: 'Heavy Snow', icon: '❄️' },
        77: { desc: 'Snow Grains', icon: '🌨️' },
        80: { desc: 'Slight Rain Showers', icon: '🌦️' },
        81: { desc: 'Moderate Rain Showers', icon: '🌧️' },
        82: { desc: 'Violent Rain Showers', icon: '⛈️' },
        95: { desc: 'Thunderstorm', icon: '⛈️' },
        96: { desc: 'Thunderstorm w/ Hail', icon: '🌩️' },
        99: { desc: 'Heavy Thunderstorm w/ Hail', icon: '🌩️' }
    };
    return wmoCodes[code] || { desc: 'Unknown', icon: '❓' };
};

const getWindDir = (degrees) => `transform: rotate(${degrees}deg); display: inline-block;`;

async function fetchWeather(lat, lon) {
const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const current = data.current;
        const wmo = getWMO(current.weather_code);
        return {
            current: {
                temp: Math.round(current.temperature_2m),
                feels: Math.round(current.apparent_temperature),
                hum: current.relative_humidity_2m,
                wind: current.wind_speed_10m,
                windDir: current.wind_direction_10m,
                desc: wmo.desc,
                icon: wmo.icon,
                pop: data.daily.precipitation_probability_max[0]
            },
            daily: data.daily
        };
    } catch (error) {
        console.error("Weather fetch failed:", error);
        return null;
    }
}

async function fetchAlerts(lat, lon) {
    const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
    try {
        const response = await fetch(url, {
            headers: { 
                'Accept': 'application/geo+json',
                'User-Agent': '(RouxFamilyDashboard, jesse@example.com)' 
            }
        });

        if (!response.ok) {
            console.error("NWS API Error:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        
        // Log the response to your browser console to see what's happening
        console.log("NWS API Response:", data);

        if (data.features && data.features.length > 0) {
            return data.features[0].properties.headline;
        } else {
            console.log("No active alerts for this location.");
            return null;
        }
    } catch (error) {
        console.error("Alert fetch failed:", error);
        return null;
    }
}

async function fetchRiver() {
    const url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=07378500&parameterCd=00065&period=P1D";
    try {
        const response = await fetch(url);
        const data = await response.json();
        const values = data.value.timeSeries[0].values[0].value;
        const currentStage = parseFloat(values[values.length - 1].value);
        const oldStage = parseFloat(values[0].value);
        const delta = (currentStage - oldStage).toFixed(2);
        return { stage: currentStage.toFixed(2), raw: currentStage, delta: delta > 0 ? `+${delta}` : delta };
    } catch (error) {
        console.error("USGS fetch failed:", error);
        return null;
    }
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute:'2-digit', timeZoneName: 'short' });
    document.querySelectorAll('.sys-clock').forEach(el => el.innerText = timeStr);
}
setInterval(updateClock, 1000);

function initChecklist() {
    const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    checkboxes.forEach(box => {
        const saved = localStorage.getItem(box.id);
        if (saved === 'true') {
            box.checked = true;
            box.parentElement.classList.add('done');
        }
        box.addEventListener('change', (e) => {
            localStorage.setItem(e.target.id, e.target.checked);
            if (e.target.checked) {
                e.target.parentElement.classList.add('done');
            } else {
                e.target.parentElement.classList.remove('done');
            }
        });
    });
}

