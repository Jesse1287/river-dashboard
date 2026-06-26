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

function nwsShortForecastIcon(text) {
    if (!text) return { desc: 'Unknown', icon: '❓' };
    const t = text.toLowerCase();
    if (t.includes('sunny') && (t.includes('mostly') || t.includes('partly'))) return { desc: text, icon: '🌤️' };
    if (t.includes('sunny') || t.includes('clear') || t.includes('fair')) return { desc: text, icon: '☀️' };
    if (t.includes('partly')) return { desc: text, icon: '⛅' };
    if (t.includes('cloudy') || t.includes('overcast')) return { desc: text, icon: '☁️' };
    if (t.includes('fog') || t.includes('mist') || t.includes('haze')) return { desc: text, icon: '🌫️' };
    if (t.includes('thunderstorm') || (t.includes('thunder') && t.includes('storm'))) return { desc: text, icon: '⛈️' };
    if (t.includes('rain') || t.includes('shower') || t.includes('drizzle')) return { desc: text, icon: '🌧️' };
    if (t.includes('snow') || t.includes('flurries')) return { desc: text, icon: '❄️' };
    if (t.includes('sleet') || t.includes('ice') || t.includes('freezing')) return { desc: text, icon: '🌨️' };
    return { desc: text, icon: '❓' };
}

function compassDeg(dir) {
    const m = { 'N':0,'NNE':22.5,'NE':45,'ENE':67.5,'E':90,'ESE':112.5,'SE':135,'SSE':157.5,'S':180,'SSW':202.5,'SW':225,'WSW':247.5,'W':270,'WNW':292.5,'NW':315,'NNW':337.5 };
    return m[(dir||'').toUpperCase().trim()] || 0;
}

const getWindDir = (degrees) => `transform: rotate(${degrees}deg); display: inline-block;`;

async function fetchWeather(lat, lon) {
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;
    let om = null;
    try { const r = await fetch(omUrl); om = await r.json(); } catch (e) { console.error("OM failed:", e); }
    if (!om) return null;
    const cur = om.current;
    const wmo = getWMO(cur.weather_code);
    const res = {
        current: { temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature), hum: cur.relative_humidity_2m, wind: cur.wind_speed_10m, windDir: cur.wind_direction_10m, desc: wmo.desc, icon: wmo.icon, pop: om.daily.precipitation_probability_max[0] },
        daily: om.daily
    };
    const llat=+lat, llon=+lon;
    let g = null;
    if (Math.abs(llat-30.48)<.05 && Math.abs(llon-(-90.95))<.05) g={o:'LIX',x:34,y:110};
    else if (Math.abs(llat-30.10)<.05 && Math.abs(llon-(-90.99))<.05) g={o:'LIX',x:32,y:94};
    else if (Math.abs(llat-30.44)<.05 && Math.abs(llon-(-90.40))<.05) g={o:'LIX',x:54,y:109};
    if (g) {
        try {
            const r = await fetch(`https://api.weather.gov/gridpoints/${g.o}/${g.x},${g.y}/forecast/hourly`, { headers: { Accept:'application/geo+json', 'User-Agent':'(RouxFamilyDashboard, jesse@example.com)' } });
            if (r.ok) {
                const d = await r.json();
                const p = d.properties.periods[0];
                if (p) {
                    res.current.temp = p.temperature;
                    if (p.relativeHumidity && p.relativeHumidity.value !== null) res.current.hum = p.relativeHumidity.value;
                    const wn = parseFloat(p.windSpeed); if (!isNaN(wn)) res.current.wind = wn;
                    res.current.windDir = compassDeg(p.windDirection);
                    if (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value !== null) res.current.pop = p.probabilityOfPrecipitation.value;
                    const ns = nwsShortForecastIcon(p.shortForecast);
                    res.current.desc = ns.desc; res.current.icon = ns.icon;
                }
            }
        } catch (e) { console.error("NWS hourly failed:", e); }
    }
    return res;
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

// Register Service Worker for Progressive Web App (PWA) support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('[PWA] Service Worker registered successfully:', reg.scope))
            .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    });
}


