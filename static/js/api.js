const API_URL = "http://localhost:8080";

// Endpoint configurations
const LOGIN_URL = "/api/auth/login";
const REGISTER_URL = "/api/auth/register";
const GOOGLE_REGISTER_URL = "/api/auth/google-register";
const GET_USER_DATA_URL = "/api/user_info";
const GET_USER_SOLVES_URL = "/api/solves_info";

/**
 * Perform an asynchronous POST request
 * @param {string} endpoint - The API endpoint relative to API_URL
 * @param {object} data - The data payload to send as JSON
 * @returns {Promise<object>} The parsed JSON response
 */
async function postData(endpoint, data) {
    const url = API_URL + endpoint;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || `POST request failed with status ${response.status}`);
    }

    return await response.json();
}

/**
 * Perform an asynchronous POST request with an optional authentication token
 * @param {string} endpoint - The API endpoint relative to API_URL
 * @param {object} data - The data payload to send as JSON
 * @param {string} token - Optional authentication token
 * @returns {Promise<object>} The parsed JSON response
 */
async function postDataWithToken(endpoint, data, token = null) {
    const url = API_URL + endpoint;
    const headers = {
        'Content-Type': 'application/json'
    };

    console.log("[AUTH_TOKEN]: " + token);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn("[API] postDataWithToken: No authentication token provided.");
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || `POST request failed with status ${response.status}`);
    }

    return await response.json();
}


/**
 * Perform an asynchronous GET request
 * @param {string} endpoint - The API endpoint relative to API_URL
 * @param {string} token - Optional authentication token
 * @returns {Promise<object>} The parsed JSON response
 */
async function getData(endpoint, token = null) {
    const url = API_URL + endpoint;
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || `GET request failed with status ${response.status}`);
    }

    return await response.json();
}

/**
 * Save the auth token to a cookie
 * @param {string} token - The plain text token
 * @param {number} days - Cookie expiration in days
 */
function setAuthToken(token, days = 7) {
    if (!token) {
        console.error("[API] setAuthToken: Attempted to set a null or undefined token.");
        return;
    }
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = "auth_token=" + token + ";" + expires + ";path=/;SameSite=Strict";
    console.log("[API] setAuthToken: Token saved to cookie.");
}

/**
 * Retrieve the auth token from a cookie
 * @returns {string|null} The token or null
 */
function getAuthToken() {
    const name = "auth_token=";
    const decodedCookie = decodeURIComponent(document.cookie);
    if (!decodedCookie) {
        console.warn("[API] getAuthToken: document.cookie is empty.");
        return null;
    }
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            const token = c.substring(name.length, c.length);
            console.log("[API] getAuthToken: " + token);
            return token;
        }
    }
    console.warn("[API] getAuthToken: 'auth_token' cookie not found in:", decodedCookie);
    return null;
}

// Compatibility aliases
const setEncryptedToken = setAuthToken;
const getDecryptedToken = getAuthToken;


