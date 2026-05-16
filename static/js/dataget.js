// --- Data Management for Cubing App ---
// Single source of truth for all persistence.
// localStorage is now disabled for all data except lastActiveTab.

let currentEvent = '3x3';
let allEvents = {
    '3x3': [], '2x2': [], '4x4': [], '5x5': [], '6x6': [], '7x7': [],
    '3x3oh': [], '3x3bld': [], '4x4bld': [], '5x5bld': [],
    'mbld': [], 'clock': [], 'megaminx': [], 'pyraminx': [], 'skewb': [], 'sq1': []
};

let solveHistory = []; // Always points to allEvents[currentEvent]
let minigameHistory = [];

class User {
    constructor(userData = {}) {
        this.id = userData.id || userData._id || userData.uid || null;
        this.username = userData.username || '';
        this.email = userData.email || '';
        this.password = userData.password || null;
        this.role = userData.role || 'USER';
        this.elo = userData.elo || 0;
        this.last_online = userData.last_online || '';

        let parsedDesc = { bio: '', fav_event: '', goal: '', pronouns: 'Prefer not to say' };
        if (userData.description) {
            try {
                parsedDesc = JSON.parse(userData.description);
            } catch (e) {
                parsedDesc.bio = userData.description;
            }
        }
        this.description = parsedDesc.bio || userData.bio || '';
        this.fav_event = parsedDesc.fav_event || '';
        this.goal = parsedDesc.goal || '';
        this.pronouns = parsedDesc.pronouns || 'Prefer not to say';

        this.account_creation_date = userData.account_creation_date || '';
        this.avatar = userData.avatar || userData.profile_pic || null;
        this.friends = userData.friends || [];
        this.enabled = userData.enabled !== undefined ? userData.enabled : true;
        this.authorities = userData.authorities || [];
        this.theActualUsername = userData.theActualUsername || userData.username || '';
        this.accountNonExpired = userData.accountNonExpired !== undefined ? userData.accountNonExpired : true;
        this.accountNonLocked = userData.accountNonLocked !== undefined ? userData.accountNonLocked : true;
        this.credentialsNonExpired = userData.credentialsNonExpired !== undefined ? userData.credentialsNonExpired : true;
    }
}

const FONT_OPTIONS = ['default', 'elegant', 'tech', 'mono', 'consolas'];
const THEME_OPTIONS = ['black', 'blue', 'green', 'brown', 'purple', 'white'];
const WIDGET_MAP = ["", "solves", "stats", "scramble", "graph", "columns", "gameui", "chat"];
const STAT_TYPE_MAP = ['single', 'ao', 'mean'];
const STAT_TIME_MAP = ['cur', 'best'];
const STAT_SIZE_MAP = ['normal', 'medium', 'large'];

class SettingsSet {
    constructor(data = {}) {
        this.id = data.id || (window.appSettings ? window.appSettings.id : null) || (window.currentUser ? window.currentUser.id : null);
        
        // Handle complex object structure from backend
        this.widgetConfig = this.parseWidgetConfig(data.widgetConfig) || ['solves', 'stats', 'scramble', 'graph', 'columns'];
        this.minigameWidgetConfig = this.parseWidgetConfig(data.minigameConfig) || ['solves', 'scramble', 'gameui', 'chat'];
        this.statsWidgetConfig = this.parseStatConfig(data.statConfig) || ['best-single|medium', 'cur-single|medium', 'cur-ao5|normal', 'cur-ao12|normal', 'cur-ao50|normal', 'best-ao5|normal', 'best-ao12|normal', 'cur-mean|normal'];
        
        this.widgetCount = data.widgetCount || 5;
        this.pbAnimationLength = data.pbAnimationLength !== undefined ? data.pbAnimationLength : (data.celebrationTime !== undefined ? data.celebrationTime : 1.5);
        this.timerAccuracy = data.timerAccuracy !== undefined ? parseInt(data.timerAccuracy, 10) : 3;
        this.confirmSolveDelete = data.confirmSolveDeletion !== undefined ? data.confirmSolveDeletion : (data.confirmSolveDelete !== undefined ? data.confirmSolveDelete : true);
        this.useInspection = data.useInspection !== undefined ? data.useInspection : false;
        this.saveMinigameSolves = data.saveMinigameSolves !== undefined ? data.saveMinigameSolves : false;
        
        // lastActiveTab and eventFolders are kept in localStorage as backend doesn't support them yet
        this.lastActiveTab = localStorage.getItem('lastActiveTab') || data.lastActiveTab || "timer-tab";
        
        let inTheme = 'black';
        if (data.theme !== undefined) {
            const themeIdx = parseInt(data.theme, 10);
            if (!isNaN(themeIdx)) {
                inTheme = THEME_OPTIONS[themeIdx] || 'black';
            } else if (typeof data.theme === 'string') {
                inTheme = data.theme === '1073741824' ? 'black' : data.theme;
            }
        }

        let inFont = 'default';
        if (data.font !== undefined) {
            const fontIdx = parseInt(data.font, 10);
            if (!isNaN(fontIdx)) {
                inFont = FONT_OPTIONS[fontIdx] || 'default';
            } else if (typeof data.font === 'string') {
                inFont = data.font === '1073741824' ? 'default' : data.font;
            }
        }

        this.theme = inTheme;
        this.font = inFont;
        this.bio = data.bio !== undefined ? data.bio : (data.description || '');
        this.cubingGoal = data.cubingGoal !== undefined ? data.cubingGoal : (data.goal || '');
        this.favoriteEvent = data.favoriteEvent !== undefined ? data.favoriteEvent : (data.fav_event || '');
        
        // Restore eventFolders from localStorage or provided data
        if (data.eventFolders) {
            try {
                const parsed = typeof data.eventFolders === 'string' ? JSON.parse(data.eventFolders) : data.eventFolders;
                if (parsed && typeof parsed === 'object') {
                    window.eventFolders = parsed;
                }
            } catch(e) { console.error("Failed to parse eventFolders", e); }
        } else {
            const localFolders = localStorage.getItem('eventFolders');
            if (localFolders) {
                try {
                    window.eventFolders = JSON.parse(localFolders);
                } catch(e) {}
            }
        }
    }

    parseWidgetConfig(dto) {
        if (!dto) return null;
        const keys = ['n1', 'n2', 'n3', 'n4', 'n5'];
        return keys.map(k => WIDGET_MAP[dto[k]] || "");
    }

    parseStatConfig(list) {
        if (!list || !Array.isArray(list)) return null;
        return list.map(block => {
            const type = STAT_TYPE_MAP[block.type] || 'single';
            const time = STAT_TIME_MAP[block.time] || 'cur';
            const size = STAT_SIZE_MAP[block.size] || 'normal';
            const amount = block.amount || 1;
            
            let key = `${time}-${type}`;
            if (type === 'ao') key += amount;
            return `${key}|${size}`;
        });
    }

    toApiPayload() {
        return {
            id: this.id,
            font: FONT_OPTIONS.indexOf(this.font) === -1 ? 0 : FONT_OPTIONS.indexOf(this.font),
            theme: THEME_OPTIONS.indexOf(this.theme) === -1 ? 0 : THEME_OPTIONS.indexOf(this.theme),
            timerAccuracy: this.timerAccuracy || 3,
            celebrationTime: parseFloat(this.pbAnimationLength) || 1.5,
            confirmSolveDeletion: this.confirmSolveDelete !== undefined ? !!this.confirmSolveDelete : true,
            widgetCount: this.widgetCount,
            useInspection: this.useInspection,
            saveMinigameSolves: this.saveMinigameSolves,
            bio: this.bio || '',
            cubingGoal: this.cubingGoal || '',
            favoriteEvent: this.favoriteEvent || '',
            widgetConfig: this.formatWidgetConfig(this.widgetConfig, 0),
            minigameConfig: this.formatWidgetConfig(this.minigameWidgetConfig, 1),
            statConfig: this.formatStatConfig(this.statsWidgetConfig)
        };
    }

    formatWidgetConfig(arr, status) {
        const dto = { status: status };
        const configArr = Array.isArray(arr) ? arr : [];
        for (let i = 0; i < 5; i++) {
            const val = configArr[i] || "";
            dto['n' + (i + 1)] = WIDGET_MAP.indexOf(val) === -1 ? 0 : WIDGET_MAP.indexOf(val);
        }
        return dto;
    }

    formatStatConfig(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.map(str => {
            if (typeof str !== 'string') return str;
            const parts = str.split('|');
            const key = parts[0];
            const size = parts[1] || 'normal';
            
            const time = key.startsWith('cur-') ? 0 : (key.startsWith('best-') ? 1 : 0);
            const typeStr = key.replace('cur-', '').replace('best-', '');
            
            let type = 0; // single
            let amount = 1;
            
            if (typeStr.startsWith('ao')) {
                type = 1;
                amount = parseInt(typeStr.replace('ao', ''), 10);
            } else if (typeStr === 'mean') {
                type = 2;
                amount = 1;
            }
            
            return {
                type: type,
                amount: amount,
                time: time,
                size: STAT_SIZE_MAP.indexOf(size) === -1 ? 0 : STAT_SIZE_MAP.indexOf(size)
            };
        });
    }
}

class Solve {
    constructor({ id, eventId, folderId, time, date, scramble, penalty, note, notes, eventID, folderID, creationDate, description }) {
        this.id = id || null;
        this.eventId = eventId || (typeof currentEvent !== 'undefined' ? currentEvent : '3x3');
        this.folderId = folderId || (typeof currentFolderId !== 'undefined' ? currentFolderId : 'default');
        
        // Handle DTO fields
        this.eventID = eventID || null;
        this.folderID = folderID || null;
        this.time = time; 
        // Normalize ms to seconds
        if (time > 1000 && Number.isInteger(time)) {
            this.time = time / 1000;
        }
        
        this.date = date || creationDate || new Date().toISOString();
        this.scramble = scramble || "";
        this.note = note || notes || description || "";

        // Standardize penalty to number: 0, 2, -1
        if (penalty === 'DNF' || penalty === -1) this.penalty = -1;
        else if (penalty === 2 || penalty === '+2') this.penalty = 2;
        else this.penalty = 0;
    }

    get effectiveTime() {
        if (this.penalty === -1 || this.penalty === 'DNF') return Infinity;
        return this.time + (this.penalty > 0 ? this.penalty : 0);
    }

    toApiPayload() {
        const eventMap = {
            '3x3': 1, '2x2': 2, '4x4': 3, '5x5': 4, '6x6': 5, '7x7': 6,
            'pyraminx': 7, 'megaminx': 8, 'skewb': 9, 'clock': 10
        };
        const eKey = (this.eventId || "").toLowerCase();

        return {
            id: this.id,
            time: Math.round(this.time * 1000),
            scramble: this.scramble,
            creationDate: this.date,
            description: this.note,
            penalty: this.penalty,
            eventID: this.eventID || eventMap[eKey] || 1,
            folderID: this.folderID || 1
        };
    }
}

/** Global Solve Management */

window.addSolve = function (solveData) {
    const solve = new Solve(solveData);
    if (!allEvents[solve.eventId]) allEvents[solve.eventId] = [];
    allEvents[solve.eventId].push(solve);

    // Sync to API
    if (typeof postDataWithToken === 'function' && typeof getAuthToken === 'function') {
        const token = getAuthToken();
        if (token) {
            postDataWithToken('/add_solve', solve.toApiPayload(), token)
                .then(resp => {
                    if (resp && resp.id) {
                        solve.id = resp.id;
                        // Refresh UI to update button onclicks with real ID
                        if (typeof updateHistoryUI === 'function') updateHistoryUI();
                        if (typeof updateStatsUI === 'function') updateStatsUI();
                    }
                    console.log("[API] Solve added:", solve.id);
                })
                .catch(err => console.error("[API] Add failed:", err));
        }
    }
    return solve;
};

window.updateSolve = function (id, updates) {
    let targetSolve = null;
    for (const eId in allEvents) {
        const idx = allEvents[eId].findIndex(s => s.id == id);
        if (idx !== -1) {
            targetSolve = allEvents[eId][idx];
            // Ensure it's a Solve instance
            if (!(targetSolve instanceof Solve)) {
                targetSolve = new Solve(targetSolve);
                allEvents[eId][idx] = targetSolve;
            }
            break;
        }
    }

    if (targetSolve) {
        Object.assign(targetSolve, updates);

        // Sync to API
        if (typeof postDataWithToken === 'function' && typeof getAuthToken === 'function') {
            const token = getAuthToken();
            if (token) {
                postDataWithToken('/edit_solves', [targetSolve.toApiPayload()], token)
                    .then(() => console.log("[API] Solve updated:", id))
                    .catch(err => console.error("[API] Update failed:", err));
            }
        }
    }
};

window.deleteSolve = function (id) {
    let deletedSolve = null;
    for (const eId in allEvents) {
        const idx = allEvents[eId].findIndex(s => s.id == id);
        if (idx > -1) {
            deletedSolve = allEvents[eId].splice(idx, 1)[0];
            // Ensure it's a Solve instance for toApiPayload
            if (!(deletedSolve instanceof Solve)) {
                deletedSolve = new Solve(deletedSolve);
            }
            break;
        }
    }

    if (deletedSolve) {
        // Sync to API
        if (typeof postDataWithToken === 'function' && typeof getAuthToken === 'function') {
            const token = getAuthToken();
            if (token) {
                postDataWithToken('/delete_solves', [deletedSolve.toApiPayload()], token)
                    .then(() => console.log("[API] Solve deleted:", id))
                    .catch(err => console.error("[API] Delete failed:", err));
            }
        }
    }
};

window.appSettings = new SettingsSet();

// Proxy settings for backward compatibility
[
    'widgetConfig', 'minigameWidgetConfig', 'statsWidgetConfig', 'widgetCount',
    'pbAnimationLength', 'timerAccuracy', 'confirmSolveDelete', 'useInspection',
    'saveMinigameSolves', 'lastActiveTab', 'userBio', 'favoriteEvent', 'cubingGoal',
    'theme', 'font'
].forEach(key => {
    const settingsMap = {
        'userBio': 'bio'
    };
    const targetKey = settingsMap[key] || key;
    Object.defineProperty(window, key, {
        get: () => window.appSettings[targetKey],
        set: (v) => window.appSettings[targetKey] = v,
        configurable: true
    });
});

// Proxy user fields for backward compatibility (pronouns only now)
Object.defineProperty(window, 'userPronouns', {
    get: () => window.currentUser ? window.currentUser.pronouns : "",
    set: (v) => {
        if (!window.currentUser) window.currentUser = new User();
        window.currentUser.pronouns = v;
    },
    configurable: true
});

let globalLastSolveId = 110;
var currentFolderId = 'default';
var eventFolders = {};
window.minigameElos = {
    'classic': 1000,
    'timeattack': 1000,
    'scramble': 1000,
    'elimination': 1000
};

const wcaEvents = [
    { id: '3x3', name: '3x3x3', icon: '3', elo: 1000 },
    { id: '2x2', name: '2x2x2', icon: '2', elo: 1000 },
    { id: '4x4', name: '4x4x4', icon: '4', elo: 1000 },
    { id: '5x5', name: '5x5x5', icon: '5', elo: 1000 },
    { id: '6x6', name: '6x6x6', icon: '6', elo: 1000 },
    { id: '7x7', name: '7x7x7', icon: '7', elo: 1000 },
    { id: 'clock', name: 'Clock', icon: 'CL', elo: 1000 },
    { id: 'megaminx', name: 'Megaminx', icon: 'MG', elo: 1000 },
    { id: 'pyraminx', name: 'Pyraminx', icon: 'PY', elo: 1000 },
    { id: 'skewb', name: 'Skewb', icon: 'SK', elo: 1000 },
    { id: 'sq1', name: 'Square-1', icon: 'S1', elo: 1000 }
];

// Initialize default folders for events
wcaEvents.forEach(evt => {
    if (!eventFolders[evt.id]) {
        eventFolders[evt.id] = [{ id: 'default', name: 'Default' }];
    }
    const folderList = eventFolders[evt.id];
    const standardSubFolders = [
        { id: 'sess_oh', name: 'One-Handed' },
        { id: 'sess_bld', name: 'Blindfolded' },
        { id: 'sess_fmc', name: 'Fewest Moves' }
    ];
    standardSubFolders.forEach(std => {
        if (!folderList.find(s => s.id === std.id)) folderList.push(std);
    });
});

function generateMockSolves() {
    console.log("[Data] generateMockSolves disabled.");
}

// --- SAVE METHODS (DISABLED/REPLACED BY API) ---

function saveEvents() { }
function saveWidgets() { }
function saveFolderState() { }
function saveToLocalStorage() { }

async function saveSettingsToAPI() {
    if (typeof postDataWithToken === 'function' && typeof getAuthToken === 'function') {
        const token = getAuthToken();
        if (token && window.appSettings) {
            // Ensure ID is populated if we have a currentUser (prevents duplicate entry errors)
            if (!window.appSettings.id && window.currentUser && window.currentUser.id) {
                window.appSettings.id = window.currentUser.id;
            }

            // ID is handled by toApiPayload or constructor now

            try {
                const payload = window.appSettings.toApiPayload();
                console.log("[API] Saving settings. Payload ID:", payload.id, "Payload:", payload);
                const resp = await postDataWithToken('/set_setset', payload, token);
                console.log("[API] Settings saved successfully. Response:", resp);
                
                // If response contains an ID, update it
                if (resp && resp.id) {
                    window.appSettings.id = resp.id;
                }
            } catch (err) {
                console.error("[API] Failed to save settings:", err);
            }
        }
    }
}

function saveTheme() { saveSettingsToAPI(); }
function saveFont() { saveSettingsToAPI(); }
function saveTimerSettings() { saveSettingsToAPI(); } // Additional generic hook


// --- LOAD METHODS ---

async function loadEvents() {
    if (typeof postDataWithToken === 'function' && typeof getAuthToken === 'function') {
        const token = getAuthToken();
        if (token) {
            try {
                const solves = await postDataWithToken('/solves_info', {}, token);
                if (Array.isArray(solves)) {
                    console.log("[API] Loaded", solves.length, "solves.");
                    // Reset allEvents
                    for (const key in allEvents) allEvents[key] = [];
                    
                    solves.forEach(sData => {
                        const s = new Solve(sData);
                        // If we have eventMap we could try to reverse map it, but s.eventID is safer
                        // For now we'll assume the backend sends some way to identify the event name
                        // but Solve constructor handles DTO fields.
                        
                        // Reverse map eventID to name
                        const revEventMap = {
                            1: '3x3', 2: '2x2', 3: '4x4', 4: '5x5', 5: '6x6', 6: '7x7',
                            7: 'pyraminx', 8: 'megaminx', 9: 'skewb', 10: 'clock'
                        };
                        const eName = revEventMap[s.eventID] || '3x3';
                        if (!allEvents[eName]) allEvents[eName] = [];
                        allEvents[eName].push(s);
                    });
                    
                    solveHistory = allEvents[currentEvent] || [];
                    if (typeof updateHistoryUI === 'function') updateHistoryUI();
                    if (typeof updateStatsUI === 'function') updateStatsUI();
                }
            } catch (err) {
                console.error("[API] Failed to load solves:", err);
            }
        }
    }
}

function loadWidgets() {
    // Use defaults
}

function loadTheme() {
    if (typeof setTheme === 'function') setTheme(window.appSettings.theme || 'black', null);
}

function loadFont() {
    if (typeof setFont === 'function') setFont(window.appSettings.font || 'default', null);
}

async function loadSettingsFromAPI() {
    if (typeof getData === 'function' && typeof getAuthToken === 'function') {
        const token = getAuthToken();
        if (token) {
            try {
                // The backend requires a POST request for this endpoint even though it's a "get" operation.
                const data = await postDataWithToken('/get_setset', {}, token);
                console.log("[API] Settings received from API:", data);
                if (data) {
                    // Merge API data with existing local settings
                    const merged = Object.assign({}, window.appSettings, data);
                    
                    window.appSettings = new SettingsSet(merged);
                    console.log("[API] Final merged settings:", window.appSettings);
                    
                    // Restore eventFolders from backend
                    if (data.eventFolders) {
                        try {
                            const parsedFolders = typeof data.eventFolders === 'string' ? JSON.parse(data.eventFolders) : data.eventFolders;
                            if (parsedFolders && typeof parsedFolders === 'object' && Object.keys(parsedFolders).length > 0) {
                                window.eventFolders = parsedFolders;
                                if (typeof updateFolderLabels === 'function') updateFolderLabels();
                            }
                        } catch(e) {
                            console.error("[API] Failed to parse eventFolders from backend", e);
                        }
                    }

                    // Restore lastActiveTab
                    if (window.appSettings.lastActiveTab) {
                        const tabId = window.appSettings.lastActiveTab;
                        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
                        if (tabBtn && typeof switchTab === 'function') {
                            switchTab(tabId);
                        }
                    }

                    loadTheme();
                    loadFont();
                    
                    // Update Profile DOM elements if they exist
                    const bioEl = document.getElementById('profile-bio-display');
                    if (bioEl) bioEl.textContent = window.appSettings.bio || '';
                    const favEl = document.getElementById('fav-event-display');
                    if (favEl) favEl.textContent = window.appSettings.favoriteEvent || '';
                    const goalEl = document.getElementById('goal-display');
                    if (goalEl) goalEl.textContent = window.appSettings.cubingGoal || '';
                    if (typeof populateAccountSettings === 'function') populateAccountSettings();
                }
            } catch (err) {
                console.error("[API] Failed to load settings:", err);
            }
        }
    }
}

async function loadFromLocalStorage() {
    await loadEvents();
    loadWidgets();
    await loadSettingsFromAPI(); // Replaces direct loadTheme/loadFont
}

/** Legacy migration function (placeholder to avoid errors) */
function migrateSolvesWithIds() { }
