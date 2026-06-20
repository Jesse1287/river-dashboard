fetch('data.json')
    .then(response => response.json())
    .then(data => {
        // Example: Update the status log on the index page
        const log = document.getElementById('status-log');
        if (log) {
            log.innerHTML = `
                <div class="log-line">⚡ [AUTH] Tunnel Active: ${data.weather.denham.temp}</div>
                <div class="log-line">⚡ [SYS] River Stage: ${data.river.stage}</div>
            `;
        }
        // Add similar logic for other pages here
    });
