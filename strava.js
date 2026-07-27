// ==========================================
// KONFIGURACJA STRAPKI
// ==========================================
const STRAVA_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',         // Podmień na Twój Client ID ze Stravy
  clientSecret: 'YOUR_CLIENT_SECRET', // Podmień na Twój Client Secret
  redirectUri: window.location.origin + window.location.pathname, // Twój URL na GitHub Pages
  scope: 'read,activity:read_all'
};

// ==========================================
// 1. INICJALIZACJA I PRZEKIEROWANIE
// ==========================================

// Przekierowuje użytkownika do ekranu logowania Stravy
export function loginWithStrava() {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CONFIG.clientId}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_CONFIG.redirectUri)}&approval_prompt=auto&scope=${STRAVA_CONFIG.scope}`;
  window.location.href = authUrl;
}

// Sprawdza, czy użytkownik wrócił ze Stravy z kodem autoryzacyjnym w URL (?code=...)
export async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    // Wymień kod na tokeny
    await exchangeCodeForToken(code);
    
    // Wyczyść parametr ?code= z adresu URL w przeglądarce bez odświeżania strony
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  return false;
}

// ==========================================
// 2. OBSŁUGA TOKENÓW (OAuth2)
// ==========================================

async function exchangeCodeForToken(code) {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    saveTokens(data);
  } catch (error) {
    console.error('Błąd podczas wymiany kodu na token:', error);
  }
}

function saveTokens(data) {
  localStorage.setItem('strava_access_token', data.access_token);
  localStorage.setItem('strava_refresh_token', data.refresh_token);
  // Zapisz czas wygaśnięcia tokenu w sekundach (dane w Unix timestamp)
  localStorage.setItem('strava_expires_at', data.expires_at);
}

// Zwraca ważny access_token (odświeża go automatycznie, jeśli wygasł)
async function getValidAccessToken() {
  const expiresAt = parseInt(localStorage.getItem('strava_expires_at') || '0', 10);
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Jeśli token wygasł (lub wygaśnie w ciągu najbliższych 5 minut), odśwież go
  if (nowInSeconds >= expiresAt - 300) {
    return await refreshAccessToken();
  }

  return localStorage.getItem('strava_access_token');
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('strava_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    saveTokens(data);
    return data.access_token;
  } catch (error) {
    console.error('Błąd podczas odświeżania tokenu:', error);
    return null;
  }
}

// ==========================================
// 3. POBIERANIE AKTYWNOŚCI (Treningów)
// ==========================================

export async function fetchLatestActivities(count = 10) {
  const token = await getValidAccessToken();
  if (!token) {
    console.warn('Brak autoryzacji w Stravie');
    return [];
  }

  try {
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${count}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const activities = await response.json();
    
    // Mapujemy surowe dane ze Stravy na prosty format dla Twojego PWA
    return activities.map(act => ({
      id: act.id,
      name: act.name,
      type: act.type, // np. 'Run', 'Ride', 'Walk'
      distanceKm: (act.distance / 1000).toFixed(2), // dystans w km
      durationMinutes: Math.round(act.moving_time / 60), // czas ruchu w min
      date: act.start_date_local,
      calories: act.kilojoules ? Math.round(act.kilojoules * 0.239) : null // szacowane kalorie z energii
    }));

  } catch (error) {
    console.error('Błąd podczas pobierania aktywności:', error);
    return [];
  }
}

export function isConnectedToStrava() {
  return !!localStorage.getItem('strava_refresh_token');
}
