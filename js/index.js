// 1. دالة جلب الطقس من Open-Meteo API
async function fetchWeather() {
    const weatherEl = document.getElementById('weather-info');
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=31.95&longitude=35.91&current_weather=true');
        const data = await response.json();
        
        if (data && data.current_weather) {
            const temp = data.current_weather.temperature;
            const windspeed = data.current_weather.windspeed;
            weatherEl.innerHTML = `🌡️ Temperature: <strong>${temp}°C</strong> | 💨 Wind: ${windspeed} km/h`;
        } else {
            weatherEl.innerHTML = "Weather data unavailable.";
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
        weatherEl.innerHTML = "Could not load weather.";
    }
}

// 2. دالة جلب الصور الديناميكية من Picsum Image API
async function loadApiImages() {
    const galleryContainer = document.getElementById('api-images');
    try {
        const response = await fetch('https://picsum.photos/v2/list?page=3&limit=3');
        const images = await response.json();

        galleryContainer.innerHTML = '';
        images.forEach(imgData => {
            const img = document.createElement('img');
            img.src = `https://picsum.photos/id/${imgData.id}/400/300`;
            img.alt = "EduTrack API Image";
            img.className = 'gallery-img';
            galleryContainer.appendChild(img);
        });
    } catch (error) {
        console.error("Error loading images from API:", error);
        galleryContainer.innerHTML = "<p style='grid-column: span 3; color: #64748b;'>Failed to load gallery images.</p>";
    }
}

// تشغيل الدوال عند تحميل الصفحة
fetchWeather();
loadApiImages();