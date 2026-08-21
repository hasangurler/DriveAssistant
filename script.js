// --- KADRAN BİLEŞENLERİNİ OLUŞTURMA (Toyota Corolla Tarzı: -120° ile +120° Arası) ---
const MIN_ANGLE = -120;
const MAX_ANGLE = 120;
const MAX_SPEED = 220; // Maksimum gösterge hızı (km/h)

const ticksGroup = document.getElementById('ticks');
const numbersGroup = document.getElementById('numbers');

function createDial() {
  for (let i = 0; i <= MAX_SPEED; i += 10) {
    // Açıyı hesapla
    const angle = MIN_ANGLE + (i / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
    const rad = (angle - 90) * (Math.PI / 180);

    const isMajor = i % 20 === 0;
    const r1 = 120;
    const r2 = isMajor ? 104 : 112;

    // Çizgiler
    const x1 = 150 + r1 * Math.cos(rad);
    const y1 = 150 + r1 * Math.sin(rad);
    const x2 = 150 + r2 * Math.cos(rad);
    const y2 = 150 + r2 * Math.sin(rad);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", isMajor ? "tick-major" : "tick");
    ticksGroup.appendChild(line);

    // Rakamlar (Her 20 km/h için)
    if (isMajor) {
      const rText = 90;
      const xt = 150 + rText * Math.cos(rad);
      const yt = 150 + rText * Math.sin(rad);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", xt);
      text.setAttribute("y", yt);
      text.setAttribute("class", "tick-text");
      text.textContent = i;
      numbersGroup.appendChild(text);
    }
  }
}
createDial();

// --- GPS VE HESAPLAMA MANTIĞI ---
let totalDistance = 0; // Metre cinsinden
let lastCoords = null;

const digitalSpeedEl = document.getElementById('digital-speed');
const needleGroup = document.getElementById('needle-group');
const altitudeEl = document.getElementById('altitude');
const distanceEl = document.getElementById('distance');
const gpsStatusEl = document.getElementById('gps-status');
const resetBtn = document.getElementById('reset-btn');

// İki koordinat arası mesafe hesaplama (Haversine Formülü)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Dünya yarıçapı (metre)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Metre
}

// GPS Verilerini Güncelleme
function updatePosition(position) {
  const coords = position.coords;

  // 1. HIZ (m/s -> km/h)
  let speedKmH = 0;
  if (coords.speed !== null && coords.speed > 0) {
    speedKmH = Math.round(coords.speed * 3.6);
  }

  // Göstergeleri Güncelle
  digitalSpeedEl.textContent = speedKmH;
  
  // Analog İbre Açısını Hesapla ve Uygula
  const currentSpeedClamped = Math.min(speedKmH, MAX_SPEED);
  const needleAngle = MIN_ANGLE + (currentSpeedClamped / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
  needleGroup.style.transform = `rotate(${needleAngle}deg)`;

  // 2. RAKIM
  if (coords.altitude !== null) {
    altitudeEl.innerHTML = `${Math.round(coords.altitude)} <small class="unit">m</small>`;
  } else {
    altitudeEl.innerHTML = `-- <small class="unit">m</small>`;
  }

  // 3. KAT EDİLEN MESAFE
  if (lastCoords) {
    const dist = calculateDistance(
      lastCoords.latitude,
      lastCoords.longitude,
      coords.latitude,
      coords.longitude
    );
    
    // Yanlış GPS sıçramalarını engellemek için eşik değeri (örn. 2 metreden büyük ve hıza paralel)
    if (dist > 2 && dist < 100) {
      totalDistance += dist;
      distanceEl.innerHTML = `${(totalDistance / 1000).toFixed(1)} <small class="unit">km</small>`;
    }
  }

  lastCoords = coords;
  gpsStatusEl.textContent = "GPS Bağlantısı Aktif";
  gpsStatusEl.className = "text-success d-block fw-bold";
}

function handleError(error) {
  let msg = "GPS Hatası";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      msg = "Konum İzni Reddedildi";
      break;
    case error.POSITION_UNAVAILABLE:
      msg = "Konum Alınamıyor";
      break;
    case error.TIMEOUT:
      msg = "GPS Zaman Aşımı";
      break;
  }
  gpsStatusEl.textContent = msg;
  gpsStatusEl.className = "text-danger d-block fw-bold";
}

// Geolocation Başlat
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(updatePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000
  });
} else {
  gpsStatusEl.textContent = "Tarayıcı GPS Desteklemiyor";
}

// Trip Sıfırlama
resetBtn.addEventListener('click', () => {
  totalDistance = 0;
  distanceEl.innerHTML = `0.0 <small class="unit">km</small>`;
});