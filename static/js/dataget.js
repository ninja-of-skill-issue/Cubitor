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
        this.id = userData.id || null;
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

class SettingsSet {
    constructor(data = {}) {
        this.widgetConfig = data.widgetConfig || ['solves', 'stats', 'scramble', 'graph', 'columns'];
        this.minigameWidgetConfig = data.minigameWidgetConfig || ['solves', 'scramble', 'gameui', 'chat'];
        this.statsWidgetConfig = data.statsWidgetConfig || ['best-single|medium', 'cur-single|medium', 'cur-ao5|normal', 'cur-ao12|normal', 'cur-ao50|normal', 'best-ao5|normal', 'best-ao12|normal', 'cur-mean|normal'];
        this.widgetCount = data.widgetCount || 5;
        this.pbAnimationLength = data.pbAnimationLength || 1.5;
        this.timerAccuracy = data.timerAccuracy || 3;
        this.confirmSolveDelete = data.confirmSolveDelete !== undefined ? data.confirmSolveDelete : true;
        this.useInspection = data.useInspection !== undefined ? data.useInspection : false;
        this.saveMinigameSolves = data.saveMinigameSolves !== undefined ? data.saveMinigameSolves : false;
        this.theme = data.theme || 'black';
        this.font = data.font || 'default';
        this.lastActiveTab = data.lastActiveTab || "timer-tab";
    }
}

class Solve {
    constructor({ id, eventId, folderId, time, date, scramble, penalty, note, notes }) {
        this.id = id || Date.now();
        this.eventId = eventId || (typeof currentEvent !== 'undefined' ? currentEvent : '3x3');
        this.folderId = folderId || (typeof currentFolderId !== 'undefined' ? currentFolderId : 'default');
        this.time = time; // raw seconds
        this.date = date || new Date().toISOString();
        this.scramble = scramble || "";
        this.note = note || notes || "";

        // Standardize penalty to number: 0, 2, -1
        if (penalty === 'DNF' || penalty === -1) this.penalty = -1;
        else if (penalty === 2 || penalty === '+2') this.penalty = 2;
        else this.penalty = 0;
    }

    get effectiveTime() {
        if (this.penalty === -1 || this.penalty === 'DNF') return Infinity;
        return this.time + (typeof this.penalty === 'number' ? this.penalty : 0);
    }

    toApiPayload() {
        // formatTime is assumed to be available globally in main_page.html
        const formatted = typeof formatTime === 'function' ? formatTime(this.time * 1000) : this.time.toFixed(3);
        return {
            id: this.id,
            tim: formatted,
            scramble: this.scramble,
            creation_date: this.date,
            note: this.note,
            penalty: this.penalty === 'DNF' ? -1 : (typeof this.penalty === 'number' ? this.penalty : 0)
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
    'saveMinigameSolves', 'lastActiveTab'
].forEach(key => {
    Object.defineProperty(window, key, {
        get: () => window.appSettings[key],
        set: (v) => window.appSettings[key] = v,
        configurable: true
    });
});

// Proxy user fields for backward compatibility
[
    'userBio', 'favoriteEvent', 'cubingGoal', 'userPronouns'
].forEach(key => {
    const mapping = {
        'userBio': 'bio',
        'favoriteEvent': 'fav_event',
        'cubingGoal': 'goal',
        'userPronouns': 'pronouns'
    };
    Object.defineProperty(window, key, {
        get: () => window.currentUser ? window.currentUser[mapping[key]] : "",
        set: (v) => {
            if (!window.currentUser) window.currentUser = new User();
            window.currentUser[mapping[key]] = v;
        },
        configurable: true
    });
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

// --- SAVE METHODS (DISABLED) ---

function saveEvents() { }
function saveWidgets() { }
function saveTheme() { }
function saveFont() { }
function saveFolderState() { }
function saveToLocalStorage() { }

// --- LOAD METHODS ---

function loadEvents() {
    // Rely on API to populate allEvents
    solveHistory = allEvents[currentEvent];
}

function loadWidgets() {
    // Use defaults
}

function loadTheme() {
    // Theme is now managed via initial CSS or login session
    if (typeof setTheme === 'function') setTheme('black', null);
}

function loadFont() {
    if (typeof setFont === 'function') setFont('default', null);
}

function loadFromLocalStorage() {
    loadEvents();
    loadWidgets();
    loadTheme();
    loadFont();
}

/** Legacy migration function (placeholder to avoid errors) */
function migrateSolvesWithIds() { }
