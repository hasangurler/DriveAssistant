const NS = "http://www.w3.org/2000/svg";

// =========================================================
// KADRAN AYARLARI
// =========================================================

const cx = 300;
const cy = 215;

const maxSpeed = 240;

const startAngle = -130;
const endAngle = 130;

const arcRadius = 245;
const labelRadius = 202;

// =========================================================
// İBRE
// =========================================================

// Toyota tarzı kısa ibre.
// Merkezden başlamaz.
//
// Dış uç: 225
// İç uç: 140
//
const needleInner = 140;
const needleOuter = 225;

// =========================================================
// MESAFE / TRIP
// =========================================================

let tripDistance = 0;

// Son kabul edilen GPS konumu
let lastTripPosition = null;

// GPS konumunun mesafeye dahil edilmesi için
// kabul edilebilir maksimum doğruluk değeri.
const MAX_GPS_ACCURACY = 30;

// GPS'in küçük oynamalarını yok saymak için minimum hareket.
// Örneğin araç dururken 2-3 metrelik GPS oynamaları
// mesafeye eklenmez.
const MIN_DISTANCE_STEP = 5;

// =========================================================
// DOM
// =========================================================

const ticks = document.getElementById("ticks");
const labels = document.getElementById("labels");
const needle = document.getElementById("needle");
const digital = document.getElementById("digitalSpeed");
const altitudeElement = document.getElementById("altitude");
//const tripElement = document.getElementById("trip");
const gpsStatus = document.getElementById("gpsStatus");
const tripGaugeElement = document.getElementById("tripGauge");
const maxSpeedElement = document.getElementById("maxSpeed");

// =========================================================
// GPS
// =========================================================

let gpsWatchId = null;

// GPS hız filtreleme
let currentSpeed = 0;
let targetSpeed = 0;
let lastAnimationTime = performance.now();
let maxRecordedSpeed = 0;

// Rakım filtreleme
let filteredAltitude = null;


// Son GPS zamanı
let lastGpsTimestamp = null;


// =========================================================
// POLAR KOORDİNAT
// =========================================================

function polar(r, a) {

    const rad = (a - 90) * Math.PI / 180;

    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad)
    };
}

// =========================================================
// İKİ GPS NOKTASI ARASINDAKİ MESAFE
// Haversine Formula
// =========================================================

function calculateDistance(lat1, lon1, lat2, lon2) {

    const earthRadius = 6371000; // metre

    const lat1Rad =
        lat1 * Math.PI / 180;

    const lat2Rad =
        lat2 * Math.PI / 180;

    const deltaLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const deltaLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =
        Math.sin(deltaLat / 2) *
        Math.sin(deltaLat / 2) +

        Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *

        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;
}

// =========================================================
// TRIP MESAFESİNİ GÜNCELLE
// =========================================================

function updateTripDistance(position) {

    const coords =
        position.coords;


    // GPS doğruluğu bilinmiyorsa
    // mesafe hesabına dahil etmiyoruz.

    if (
        coords.accuracy === null ||
        !Number.isFinite(coords.accuracy)
    ) {
        return;
    }


    // GPS doğruluğu çok kötüyse
    // bu noktayı kullanma.

    if (
        coords.accuracy >
        MAX_GPS_ACCURACY
    ) {
        return;
    }


    const currentPosition = {

        latitude:
            coords.latitude,

        longitude:
            coords.longitude
    };


    // İlk geçerli GPS noktası.
    // Burada henüz mesafe eklemiyoruz.

    if (
        lastTripPosition === null
    ) {

        lastTripPosition =
            currentPosition;

        return;
    }


    // Önceki nokta ile mevcut nokta
    // arasındaki mesafeyi hesapla.

    const distance =
        calculateDistance(

            lastTripPosition.latitude,
            lastTripPosition.longitude,

            currentPosition.latitude,
            currentPosition.longitude
        );


    /*
        GPS'in küçük oynamalarını
        mesafeye dahil etme.
    */

    if (
        distance <
        MIN_DISTANCE_STEP
    ) {
        return;
    }

    // Mesafeyi metre olarak ekle.
    tripDistance += distance;

    // Yeni konumu kaydet.
    lastTripPosition =
        currentPosition;

    // Metre -> kilometre
    const tripKm =
        tripDistance / 1000;


    // Ekranda göster
    tripGaugeElement.textContent = tripKm.toFixed(2);
}

// =========================================================
// SVG ELEMENT
// =========================================================

function svg(tag, attrs) {

    const e = document.createElementNS(NS, tag);

    Object.entries(attrs).forEach(([key, value]) => {
        e.setAttribute(key, value);
    });

    return e;
}

// =========================================================
// ARC
// =========================================================

function arcPath(r, a1, a2) {

    const p1 = polar(r, a2);
    const p2 = polar(r, a1);

    const largeArc =
        Math.abs(a2 - a1) <= 180 ? 0 : 1;

    return `
        M ${p1.x} ${p1.y}
        A ${r} ${r} 0 ${largeArc} 0 ${p2.x} ${p2.y}
    `;
}


// =========================================================
// KADRANI OLUŞTUR
// =========================================================

function buildGauge() {

    // -----------------------------------------------------
    // Kadran yüzeyi
    // -----------------------------------------------------

    const p1 = polar(
        248,
        startAngle
    );

    const p2 = polar(
        248,
        endAngle
    );

    document
        .getElementById("gaugeFace")
        .setAttribute(
            "d",
            `
            M ${p1.x} ${p1.y}

            A 248 248
              0 0 0
              ${p2.x} ${p2.y}

            L ${cx} ${cy}

            Z
            `
        );


    // -----------------------------------------------------
    // Dış yay
    // -----------------------------------------------------

    document
        .getElementById("gaugeArc")
        .setAttribute(
            "d",
            arcPath(
                arcRadius,
                startAngle,
                endAngle
            )
        );


    // -----------------------------------------------------
    // Tick çizgileri
    // -----------------------------------------------------

    for (
        let speed = 0;
        speed <= maxSpeed;
        speed += 10
    ) {

        const angle =
            startAngle +
            speed / maxSpeed *
            (endAngle - startAngle);


        const major =
            speed % 20 === 0;


        const outerRadius = 239;

        const innerRadius =
            major ? 220 : 228;


        const outer =
            polar(
                outerRadius,
                angle
            );


        const inner =
            polar(
                innerRadius,
                angle
            );


        ticks.appendChild(

            svg(
                "line",
                {
                    x1: inner.x,
                    y1: inner.y,

                    x2: outer.x,
                    y2: outer.y,

                    class:
                        major
                            ? "tick-major"
                            : "tick-minor"
                }
            )
        );
    }


    // -----------------------------------------------------
    // Hız rakamları
    // -----------------------------------------------------

    for (
        let speed = 0;
        speed <= maxSpeed;
        speed += 20
    ) {

        const angle =
            startAngle +
            speed / maxSpeed *
            (endAngle - startAngle);


        const p =
            polar(
                labelRadius,
                angle
            );


        const text =
            svg(
                "text",
                {
                    x: p.x,
                    y: p.y + 7,

                    class: "speed-label",

                    "text-anchor": "middle"
                }
            );


        text.textContent = speed;

        labels.appendChild(text);
    }
}


// =========================================================
// HIZ → AÇI
// =========================================================

function speedAngle(speed) {

    speed = Math.max(
        0,
        Math.min(
            maxSpeed,
            Number(speed) || 0
        )
    );


    return startAngle +
        speed / maxSpeed *
        (endAngle - startAngle);
}


// =========================================================
// İBREYİ GÜNCELLE
// =========================================================

function updateNeedle(speed) {

    const angle =
        speedAngle(speed);


    const p1 =
        polar(
            needleInner,
            angle
        );


    const p2 =
        polar(
            needleOuter,
            angle
        );


    needle.setAttribute(
        "x1",
        p1.x
    );

    needle.setAttribute(
        "y1",
        p1.y
    );

    needle.setAttribute(
        "x2",
        p2.x
    );

    needle.setAttribute(
        "y2",
        p2.y
    );
}


// =========================================================
// DİJİTAL HIZ
// =========================================================

function updateDigitalSpeed(speed) {

    const value =
        Math.round(speed);


    digital.textContent =
        value;
}


// =========================================================
// HIZ GÖSTERGESİNİ GÜNCELLE
// =========================================================

function setSpeed(speed) {

    speed = Number(speed);


    if (!Number.isFinite(speed)) {

        speed = 0;
    }


    speed =
        Math.max(
            0,
            Math.min(
                maxSpeed,
                speed
            )
        );


    updateNeedle(speed);

    updateDigitalSpeed(speed);
}


// =========================================================
// GPS DURUMU
// =========================================================

function setGpsStatus(text, active = false) {

    gpsStatus.innerHTML = "";

    const dot =
        document.createElement("i");

    dot.className = "gps-dot";


    if (!active) {

        dot.style.background =
            "#ffb74d";

        dot.style.boxShadow =
            "0 0 8px rgba(255,183,77,.7)";
    }


    gpsStatus.appendChild(dot);

    gpsStatus.appendChild(
        document.createTextNode(
            text
        )
    );
}


// =========================================================
// GPS HIZ FİLTRELEME
// =========================================================

function setTargetSpeed(speed) {

    speed = Number(speed);

    if (!Number.isFinite(speed)) {
        speed = 0;
    }

    targetSpeed = Math.max(
        0,
        Math.min(maxSpeed, speed)
    );


    // -----------------------------------------------------
    // MAX HIZ
    // -----------------------------------------------------

    if (
        targetSpeed >
        maxRecordedSpeed
    ) {

        maxRecordedSpeed =
            targetSpeed;


        maxSpeedElement.textContent =
            Math.round(maxRecordedSpeed);
    }
}

function animateSpeed(timestamp) {

    const deltaTime =
        Math.min(
            0.05,
            (timestamp - lastAnimationTime) / 1000
        );

    lastAnimationTime = timestamp;


    const difference =
        targetSpeed - currentSpeed;


    /*
        Hızlı tepki + yumuşak geçiş.

        Değer büyüdükçe ibre hedefe daha hızlı yaklaşır.
    */

    const response = 12;


    const factor =
        1 - Math.exp(
            -response * deltaTime
        );


    currentSpeed +=
        difference * factor;


    /*
        Çok küçük farkları sıfırla.
    */

    if (Math.abs(targetSpeed - currentSpeed) < 0.05) 
    {
        currentSpeed = targetSpeed;
    }

    updateNeedle(currentSpeed);
    updateDigitalSpeed(currentSpeed);
    requestAnimationFrame(animateSpeed);
}

// =========================================================
// RAKIM FİLTRELEME
// =========================================================

function smoothAltitude(newAltitude) {

    if (filteredAltitude === null) {

        filteredAltitude =
            newAltitude;

        return filteredAltitude;
    }


    const alpha = 0.15;


    filteredAltitude =
        filteredAltitude +
        alpha *
        (newAltitude - filteredAltitude);


    return filteredAltitude;
}


// =========================================================
// GPS KONUMU
// =========================================================

function handlePosition(position) {

    const coords =
        position.coords;


    // -----------------------------------------------------
    // HIZ
    // -----------------------------------------------------

    let speedKmh = 0;


    /*
        coords.speed:
        metre / saniye
        km/h'ye çevirmek için:
        m/s × 3.6
    */

    if (
        coords.speed !== null &&
        Number.isFinite(coords.speed)
    ) {

        speedKmh =
            coords.speed * 3.6;
    }


    // Negatif olma ihtimaline karşı
    speedKmh =
        Math.max(
            0,
            speedKmh
        );


    // -----------------------------------------------------
    // HIZ
    // -----------------------------------------------------

    setTargetSpeed(
        speedKmh
    );


    // -----------------------------------------------------
    // RAKIM
    // -----------------------------------------------------

    if (
        coords.altitude !== null &&
        Number.isFinite(coords.altitude)
    ) {

        const altitude =
            smoothAltitude(
                coords.altitude
            );


        altitudeElement.textContent =
            Math.round(altitude);
    }

    // -----------------------------------------------------
    // MESAFE
    // -----------------------------------------------------

    updateTripDistance(position);

    // -----------------------------------------------------
    // GPS DURUMU
    // -----------------------------------------------------

    setGpsStatus(
        "GPS AKTİF",
        true
    );


    lastGpsTimestamp =
        position.timestamp;
}


// =========================================================
// GPS HATASI
// =========================================================

function handleGpsError(error) {

    console.error(
        "GPS Hatası:",
        error
    );


    switch (error.code) {

        case error.PERMISSION_DENIED:

            setGpsStatus(
                "GPS İZNİ YOK"
            );

            break;


        case error.POSITION_UNAVAILABLE:

            setGpsStatus(
                "GPS BULUNAMADI"
            );

            break;


        case error.TIMEOUT:

            setGpsStatus(
                "GPS ZAMAN AŞIMI"
            );

            break;


        default:

            setGpsStatus(
                "GPS HATASI"
            );
    }
}


// =========================================================
// GPS BAŞLAT
// =========================================================

function startGps() {

    if (!navigator.geolocation) {

        setGpsStatus(
            "GPS DESTEKLENMİYOR"
        );

        return;
    }


    setGpsStatus(
        "GPS ARANIYOR"
    );


    gpsWatchId =
        navigator.geolocation.watchPosition(

            handlePosition,

            handleGpsError,

            {
                enableHighAccuracy: true,

                maximumAge: 1000,

                timeout: 10000
            }
        );
}


// =========================================================
// BAŞLAT
// =========================================================

buildGauge();

currentSpeed = 0;
targetSpeed = 0;

updateNeedle(0);
updateDigitalSpeed(0);

requestAnimationFrame(animateSpeed);
startGps();