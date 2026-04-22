const API_URL = "http://localhost:8080";

// Endpoint configurations
const LOGIN_URL = "/api/auth/login";
const REGISTER_URL = "/api/auth/register";
const GOOGLE_REGISTER_URL = "/api/auth/google-register";
const GET_USER_DATA_URL = "/api/main_page";

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
 * Simple XOR encryption/decryption function
 * @param {string} text - The text to encrypt or decrypt
 * @param {string} key - The encryption key
 * @returns {string} The result (encrypted/decrypted)
 */
function xorEncryptDecrypt(text, key = "cubing_app_secret") {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode for safer cookie storage
}

/**
 * Save an encrypted token to a cookie
 * @param {string} token - The plain text token
 * @param {number} days - Cookie expiration in days
 */
function setEncryptedToken(token, days = 7) {
    const encryptedToken = xorEncryptDecrypt(token);
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = "auth_token=" + encryptedToken + ";" + expires + ";path=/;SameSite=Strict";
}

/**
 * Retrieve and decrypt the token from a cookie
 * @returns {string|null} The decrypted token or null
 */
function getDecryptedToken() {
    const name = "auth_token=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            const encryptedTokenString = c.substring(name.length, c.length);
            try {
                const decoded = atob(encryptedTokenString);
                let result = '';
                const key = "cubing_app_secret";
                for (let j = 0; j < decoded.length; j++) {
                    result += String.fromCharCode(decoded.charCodeAt(j) ^ key.charCodeAt(j % key.length));
                }
                return result;
            } catch (e) {
                console.error("Token decryption failed:", e);
                return null;
            }
        }
    }
    return null;
}
