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
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,dew_point_2m,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;
    let om = null;
    try { const r = await fetch(omUrl); om = await r.json(); } catch (e) { console.error("OM failed:", e); }
    if (!om) return null;
    const cur = om.current;
    const wmo = getWMO(cur.weather_code);
    const res = {
        current: {
            temp: Math.round(cur.temperature_2m),
            feels: Math.round(cur.apparent_temperature),
            hum: cur.relative_humidity_2m,
            wind: cur.wind_speed_10m,
            windDir: cur.wind_direction_10m,
            desc: wmo.desc,
            icon: wmo.icon,
            pop: om.daily.precipitation_probability_max[0],
            pressure: cur.pressure_msl != null ? Math.round(cur.pressure_msl) : null,
            visibility: cur.visibility != null ? (cur.visibility / 1609.34).toFixed(1) : null,
            dewPoint: cur.dew_point_2m != null ? Math.round(cur.dew_point_2m) : null,
            cloudCover: cur.cloud_cover != null ? cur.cloud_cover : null
        },
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
        try {
            const dr = await fetch(`https://api.weather.gov/gridpoints/${g.o}/${g.x},${g.y}/forecast`, { headers: { Accept:'application/geo+json', 'User-Agent':'(RouxFamilyDashboard, jesse@example.com)' } });
            if (dr.ok) {
                const dd = await dr.json();
                const dayP = dd.properties.periods.filter(p => p.isDaytime).slice(0, 5);
                res.daily.shortForecast = dayP.map(p => p.shortForecast);
                dayP.forEach((p, i) => {
                    if (p.temperature !== undefined) res.daily.temperature_2m_max[i] = p.temperature;
                    if (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value !== null) res.daily.precipitation_probability_max[i] = p.probabilityOfPrecipitation.value;
                });
            }
        } catch (e) { console.error("NWS 7-day failed:", e); }
    }
    return res;
}

async function fetchForecast(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=5`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Forecast fetch failed:", error);
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
        if (!response.ok) return null;
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            return data.features[0].properties.headline;
        }
        return null;
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

async function fetchAirQuality(lat, lon) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10`;
    try {
        const r = await fetch(url);
        const d = await r.json();
        const aqi = d.current;
        try {
            const u = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index`);
            const ud = await u.json();
            aqi.uv_index = ud.current.uv_index;
        } catch (e) {}
        return aqi;
    } catch (e) { console.error("AQI fetch failed:", e); return null; }
}

async function fetchPollen(lat, lon) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`;
    try {
        const r = await fetch(url);
        const d = await r.json();
        const levels = { 0: 'None', 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };
        const cur = d.current;
        const types = [
            { key: 'alder_pollen', label: 'Alder' },
            { key: 'birch_pollen', label: 'Birch' },
            { key: 'grass_pollen', label: 'Grass' },
            { key: 'mugwort_pollen', label: 'Mugwort' },
            { key: 'olive_pollen', label: 'Olive' },
            { key: 'ragweed_pollen', label: 'Ragweed' }
        ];
        const active = types
            .map(t => ({ label: t.label, value: cur[t.key], level: levels[cur[t.key]] || 'Unknown' }))
            .filter(t => t.value && t.value > 0);
        const highest = active.length > 0 ? active.reduce((a, b) => (a.value > b.value ? a : b)) : null;
        return { active, highest, all: cur };
    } catch (e) { console.error("Pollen fetch failed:", e); return null; }
}

function getMoonPhase(date) {
    const y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate();
    const jd=367*y-Math.floor(7*(y+Math.floor((m+9)/12))/4)+Math.floor(275*m/9)+d+1721013.5;
    const p=(jd-2451550.1)/29.530588853%1*29.530588853;
    if(p<1.85) return {n:'New Moon',i:'🌑'}; if(p<5.54) return {n:'Waxing Crescent',i:'🌒'};
    if(p<9.23) return {n:'First Quarter',i:'🌓'}; if(p<12.92) return {n:'Waxing Gibbous',i:'🌔'};
    if(p<16.61) return {n:'Full Moon',i:'🌕'}; if(p<20.30) return {n:'Waning Gibbous',i:'🌖'};
    if(p<23.99) return {n:'Last Quarter',i:'🌗'}; if(p<27.68) return {n:'Waning Crescent',i:'🌘'};
    return {n:'New Moon',i:'🌑'};
}

async function fetchAstro(lat, lon) {
    try {
        const r = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { Accept:'application/geo+json', 'User-Agent':'(RouxFamilyDashboard, jesse@example.com)' } });
        if (!r.ok) return null;
        const d = await r.json();
        const a = d.properties.astronomicalData;
        const sr=new Date(a.sunrise),ss=new Date(a.sunset);
        const dl=Math.round((ss-sr)/60000);
        const moon=getMoonPhase(new Date());
        const fmt = { hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago' };
        return { sunrise:sr.toLocaleTimeString('en-US',fmt), sunset:ss.toLocaleTimeString('en-US',fmt), dayLength:`${Math.floor(dl/60)}h ${dl%60}m`, moon };
    } catch (e) { console.error("Astro failed:", e); return null; }
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

const RIVER_FACTS = [
    "The Amite River flows approximately 117 miles through Mississippi and Louisiana.",
    "Denham Springs recorded its highest crest at 46.2 feet during The Great Flood of August 2016.",
    "The name 'Amite' comes from a Choctaw word meaning 'little river' or 'young river.'",
    "The Amite River basin drains over 2,000 square miles of watershed.",
    "Flood stage at the Denham Springs gauge is 26.0 feet. Major flood stage begins at 39.0 feet.",
    "The USGS gauge 07378500 has been monitoring the Amite since 1974.",
    "The Amite River flows into Lake Maurepas, then into Lake Pontchartrain.",
    "Alligators in the Amite basin can grow up to 14 feet long.",
    "The Amite River is home to over 50 species of fish including bass, catfish, and crappie.",
    "French settlers named the area 'Denham Springs' after the natural springs found along the river.",
    "The 2016 Louisiana flood was a 1-in-1,000-year event that damaged over 150,000 homes.",
    "Bald cypress trees along the Amite can live for over 1,000 years.",
    "The Amite River's flow can increase 100x during major flood events.",
    "Blue herons, egrets, and ospreys are common sights along the Amite River.",
    "The river's name has also been spelled 'Amity' and 'Amit' on historical maps."
];

function getRiverFact() {
    const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getFullYear(), 0, 1)) / 86400000);
    return RIVER_FACTS[dayOfYear % RIVER_FACTS.length];
}

// Register Service Worker for Progressive Web App (PWA) support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('[PWA] Service Worker registered successfully:', reg.scope))
            .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    });
}
