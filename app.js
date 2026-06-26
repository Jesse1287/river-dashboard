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

const getNwsIconAndDesc = (textDescription, iconUrl) => {
    let desc = textDescription || 'Unknown';
    let icon = '❓';
    
    const descLower = desc.toLowerCase();
    
    // Parse standard condition from iconUrl path if possible
    let iconKey = '';
    if (iconUrl) {
        const parts = iconUrl.split('/');
        const filename = parts[parts.length - 1];
        iconKey = filename.split('?')[0].split(',')[0].toLowerCase();
    }
    
    if (iconKey === 'skc' || iconKey === 'clear' || descLower.includes('clear') || descLower.includes('fair')) {
        icon = '☀️';
        desc = 'Clear Sky';
    } else if (iconKey === 'few' || descLower.includes('few clouds')) {
        icon = '🌤️';
        desc = 'Mainly Clear';
    } else if (iconKey === 'sct' || descLower.includes('partly cloudy')) {
        icon = '⛅';
        desc = 'Partly Cloudy';
    } else if (iconKey === 'bkn' || descLower.includes('mostly cloudy')) {
        icon = '☁️';
        desc = 'Mostly Cloudy';
    } else if (iconKey === 'ovc' || descLower.includes('overcast') || descLower.includes('cloudy')) {
        icon = '☁️';
        desc = 'Overcast';
    } else if (iconKey === 'fog' || iconKey === 'fg' || descLower.includes('fog') || descLower.includes('mist') || descLower.includes('haze')) {
        icon = '🌫️';
        desc = 'Fog';
    } else if (iconKey === 'rain' || iconKey === 'shra' || descLower.includes('rain') || descLower.includes('drizzle') || descLower.includes('shower')) {
        icon = '🌧️';
        desc = 'Rain';
    } else if (iconKey === 'tsra' || iconKey === 'scttsra' || descLower.includes('thunderstorm') || descLower.includes('storm')) {
        icon = '⛈️';
        desc = textDescription || 'Thunderstorm';
    } else if (iconKey === 'snow' || descLower.includes('snow') || descLower.includes('flurries')) {
        icon = '❄️';
        desc = 'Snow';
    } else if (iconKey === 'fzra' || iconKey === 'ip' || descLower.includes('sleet') || descLower.includes('ice')) {
        icon = '🌨️';
        desc = 'Freezing Rain';
    } else {
        // Fallback matching on text description
        if (descLower.includes('sunny')) {
            icon = '☀️';
            desc = 'Clear Sky';
        } else if (descLower.includes('partly')) {
            icon = '⛅';
            desc = 'Partly Cloudy';
        } else if (descLower.includes('cloudy') || descLower.includes('clouds')) {
            icon = '☁️';
            desc = 'Cloudy';
        } else if (descLower.includes('rain') || descLower.includes('drizzle') || descLower.includes('shower')) {
            icon = '🌧️';
            desc = 'Rain';
        } else if (descLower.includes('thunder') || descLower.includes('storm')) {
            icon = '⛈️';
            desc = 'Thunderstorm';
        }
    }
    
    return { desc, icon };
};

const getWindDir = (degrees) => `transform: rotate(${degrees}deg); display: inline-block;`;

async function fetchWeather(lat, lon) {
    // 1. Fetch Open-Meteo forecast first (essential for forecast panels and initial current fallback)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;
    
    let baseData = null;
    try {
        const response = await fetch(url);
        baseData = await response.json();
    } catch (error) {
        console.error("Open-Meteo forecast fetch failed:", error);
    }

    if (!baseData) return null;

    const current = baseData.current;
    const wmo = getWMO(current.weather_code);

    // Initial weather object using Open-Meteo data
    const weatherResult = {
        current: {
            temp: Math.round(current.temperature_2m),
            feels: Math.round(current.apparent_temperature),
            hum: current.relative_humidity_2m,
            wind: current.wind_speed_10m,
            windDir: current.wind_direction_10m,
            desc: wmo.desc,
            icon: wmo.icon,
            pop: baseData.daily.precipitation_probability_max[0]
        },
        daily: baseData.daily
    };

    // 2. Identify the closest official NWS airport station for real-time local physical observations
    let stationId = null;
    const lLat = parseFloat(lat);
    const lLon = parseFloat(lon);
    
    if (Math.abs(lLat - 30.48) < 0.05 && Math.abs(lLon - (-90.95)) < 0.05) {
        stationId = 'KBTR'; // Denham Springs -> Baton Rouge Airport
    } else if (Math.abs(lLat - 30.10) < 0.05 && Math.abs(lLon - (-90.99)) < 0.05) {
        stationId = 'KREG'; // Donaldsonville -> Louisiana Regional Airport
    } else if (Math.abs(lLat - 30.44) < 0.05 && Math.abs(lLon - (-90.40)) < 0.05) {
        stationId = 'KHDC'; // Ponchatoula -> Hammond Airport
    }

    // 3. Query the National Weather Service API for high-precision, real-time observations
    if (stationId) {
        try {
            const nwsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
            const response = await fetch(nwsUrl, {
                headers: { 
                    'Accept': 'application/geo+json',
                    'User-Agent': '(RouxFamilyDashboard, jesse@example.com)' 
                }
            });

            if (response.ok) {
                const data = await response.json();
                const obs = data.properties;

                if (obs) {
                    // Update current temperature if available
                    if (obs.temperature && obs.temperature.value !== null) {
                        weatherResult.current.temp = Math.round((obs.temperature.value * 9/5) + 32);
                    }
                    
                    // Update current feels-like (using heatIndex, windChill, or falling back to temperature)
                    if (obs.heatIndex && obs.heatIndex.value !== null) {
                        weatherResult.current.feels = Math.round((obs.heatIndex.value * 9/5) + 32);
                    } else if (obs.windChill && obs.windChill.value !== null) {
                        weatherResult.current.feels = Math.round((obs.windChill.value * 9/5) + 32);
                    } else if (obs.temperature && obs.temperature.value !== null) {
                        weatherResult.current.feels = weatherResult.current.temp;
                    }

                    // Update humidity
                    if (obs.relativeHumidity && obs.relativeHumidity.value !== null) {
                        weatherResult.current.hum = Math.round(obs.relativeHumidity.value);
                    }

                    // Update wind (converting km/h to mph)
                    if (obs.windSpeed && obs.windSpeed.value !== null) {
                        weatherResult.current.wind = Math.round(obs.windSpeed.value * 0.621371);
                    }

                    // Update wind direction
                    if (obs.windDirection && obs.windDirection.value !== null) {
                        weatherResult.current.windDir = obs.windDirection.value;
                    }

                    // Update weather description and icon using our smart mapper
                    const nwsStyle = getNwsIconAndDesc(obs.textDescription, obs.icon);
                    weatherResult.current.desc = nwsStyle.desc;
                    weatherResult.current.icon = nwsStyle.icon;
                    
                    console.log(`Successfully merged high-fidelity NWS observations from ${stationId}:`, weatherResult.current);
                }
            } else {
                console.warn(`NWS API returned non-OK status: ${response.status} for ${stationId}. Falling back to Open-Meteo.`);
            }
        } catch (error) {
            console.error(`Failed to fetch NWS real-time observations for ${stationId}:`, error);
        }
    }

    return weatherResult;
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


