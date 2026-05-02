const API_URL = "http://localhost:8080/api";

// Endpoint configurations
const LOGIN_URL = "/auth/login";
const REGISTER_URL = "/auth/register";
const GOOGLE_REGISTER_URL = "/auth/google-register";
const GET_USER_DATA_URL = "/user_info";
const GET_USER_SOLVES_URL = "/solves_info";
const ADD_SOLVE_URL = "/add_solve";
const EDIT_SOLVES_URL = "/edit_solves";
const DELETE_SOLVES_URL = "/delete_solves";
const UPDATE_USER_DATA_URL = "/update_user";
const DELETE_USER_URL = "/delete_user";
const GET_FRIENDS_URL = "/get_friends";
const ALL_USERS_URL = "/all_users";
const ADD_FRIEND_URL = "/add_friend";
const REMOVE_FRIEND_URL = "/remove_friend";
const PENDING_REQUESTS_URL = "/pending_friend_requests";

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

    if (response.status === 204) return {};
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (e) {
        console.error(`[API] JSON Parse Error from ${endpoint}:`, e.message);
        console.error("[API] Malformed Response Text:", text);
        throw new Error("Server returned invalid data structure (JSON Parse Error)");
    }
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
 * Remove the auth token cookie
 */
function clearAuthToken() {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
    console.log("[API] clearAuthToken: Token removed.");
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


