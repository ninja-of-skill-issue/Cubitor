// --- Data Management for Cubing App ---
// Single source of truth for all persistence.

let currentEvent = '3x3';
let allEvents = {
    '3x3': [], '2x2': [], '4x4': [], '5x5': [], '6x6': [], '7x7': [],
    '3x3oh': [], '3x3bld': [], '4x4bld': [], '5x5bld': [],
    'mbld': [], 'clock': [], 'megaminx': [], 'pyraminx': [], 'skewb': [], 'sq1': []
};

let solveHistory = []; // Always points to allEvents[currentEvent]
let minigameHistory = []; // Persistent history of minigame folders


var widgetConfig = ['solves', 'stats', 'scramble', 'graph', 'columns']; // Default widget layout
var minigameWidgetConfig = ['solves', 'scramble', 'gameui', 'chat']; // Default minigame layout
var statsWidgetConfig = ['best-single|medium', 'cur-single|medium', 'cur-ao5|normal', 'cur-ao12|normal', 'cur-ao50|normal', 'best-ao5|normal', 'best-ao12|normal', 'cur-mean|normal']; // Default stats tiles
var widgetCount = 5; // Default amount of widgets to display
let userBio = "";
let favoriteEvent = "";
let cubingGoal = "";
let userPronouns = "Prefer not to say";
let pbAnimationLength = 1.5; // Default shorter as requested
let globalLastSolveId = 0;
let timerAccuracy = 3; // Default to 3 decimals to support 0.001s solves
let confirmSolveDelete = true;
let useInspection = false;
let saveMinigameSolves = false;
let lastActiveTab = "timer-tab"; // Default in memory
var currentFolderId = localStorage.getItem('currentFolderId') || 'default';
var eventFolders = {}; // Map of eventId -> array of {id, name}
window.minigameElos = {
    'classic': 1000,
    'timeattack': 1000,
    'scramble': 1000,
    'elimination': 1000
};

// MIGRATION: Check for older session keys
if (!localStorage.getItem('eventFolders') && localStorage.getItem('eventSessions')) {
    console.log("[Migration] Moving eventSessions to eventFolders...");
    localStorage.setItem('eventFolders', localStorage.getItem('eventSessions'));
}
if (!localStorage.getItem('currentFolderId') && localStorage.getItem('currentSessionId')) {
    localStorage.setItem('currentFolderId', localStorage.getItem('currentSessionId'));
}

try {
    const savedFolders = localStorage.getItem('eventFolders');
    if (savedFolders) eventFolders = JSON.parse(savedFolders);
} catch (e) {
    console.error("Failed to parse eventFolders:", e);
    eventFolders = {};
}

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

// Initialize eventFolders for any missing events
// Initialize default folders for events
wcaEvents.forEach(evt => {
    if (!eventFolders[evt.id]) {
        eventFolders[evt.id] = [{ id: 'default', name: 'Default' }];
    }
    
    // Add standard sub-variants to ALL events
    const folderList = eventFolders[evt.id];
    const standardSubFolders = [
        { id: 'sess_oh', name: 'One-Handed' },
        { id: 'sess_bld', name: 'Blindfolded' },
        { id: 'sess_fmc', name: 'Fewest Moves' }
    ];

    standardSubFolders.forEach(std => {
        if (!folderList.find(s => s.id === std.id)) {
            folderList.push(std);
        }
    });
});

// Immediately persist these default folders if they were just added or updated
localStorage.setItem('eventFolders', JSON.stringify(eventFolders));

// ─── MOCK DATA GENERATOR ──────────────────────────────────────────────────────

function generateMockSolves() {
    console.log("Generating mock solves for all events...");
    globalLastSolveId = 0;
    const eventKeys = Object.keys(allEvents);

    eventKeys.forEach(eventId => {
        // Clear existing solves first
        allEvents[eventId] = [];

        // Random amount between 0 and 60 as requested
        const count = Math.floor(Math.random() * 61);
        const solves = [];

        // Base time for dates (spread over the last 30 days)
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        for (let i = 0; i < count; i++) {
            // Generate a realistic centered time based on the event
            let baseAvg = 15; // 3x3 default
            let mockScramble = "D' R2 U B2 L2 U' R2 U2 B2 U2 F R' B' R' B L' F' R B2"; // Default 3x3

            if (eventId.includes('4x4')) { baseAvg = 60; mockScramble = "U' R2 U2 L2 U' B2 D' F2 U2 F2 R2 F' L U2 L2 F2 D B L' Fw2 Uw2"; }
            if (eventId.includes('5x5')) { baseAvg = 120; mockScramble = "B2 L' F2 R' B2 D2 R' F2 L' B2 D2 U2 L' U' F' B' R' U2 B2 U Lw Dw"; }
            if (eventId.includes('bld')) baseAvg = 180;
            if (eventId === 'megaminx') {
                baseAvg = 90;
                mockScramble = "R++ D++ R-- D-- R++ D++ R++ D-- R-- D++ U R-- D-- R++ D++ R-- D++ R++ D-- R-- D++ U'";
            }
            if (eventId === 'pyraminx') mockScramble = "U B R L' u l r b";
            if (eventId === 'sq1') mockScramble = "(0, -1) / (1, 1) / (2, -1) / (-3, 0) / (0, -3)";

            let solveTime = baseAvg + (Math.random() * baseAvg * 0.4) - (baseAvg * 0.2);

            // Determine folder based on event
            let fId = 'default';
            if (eventId === '3x3') {
                const rand = Math.random();
                if (rand > 0.8) fId = 'sess_fmc';
                else if (rand > 0.6) fId = 'sess_bld';
                else if (rand > 0.4) fId = 'sess_oh';
            } else if (['4x4', '5x5', '6x6', '7x7'].includes(eventId)) {
                if (Math.random() > 0.9) fId = 'sess_bld';
            }

            // Random penalties
            let penalty = null;
            if (Math.random() > 0.95) penalty = 'DNF';
            else if (Math.random() > 0.9) penalty = 2;

            allEvents[eventId].push({
                id: ++globalLastSolveId,
                eventId: eventId,
                folderId: fId,
                time: Math.max(0.001, solveTime),
                date: new Date(now - Math.random() * thirtyDaysMs).toISOString(),
                scramble: mockScramble,
                penalty: penalty
            });
        }

        // Sort by date so they appear logical
        solves.sort((a, b) => new Date(a.date) - new Date(b.date));
        allEvents[eventId] = solves;
    });

    saveEvents();
    // Re-sync the solveHistory reference since we replaced allEvents arrays
    solveHistory = allEvents[currentEvent];

    minigameHistory = [];
    localStorage.setItem('minigameHistory', JSON.stringify(minigameHistory));
}

// ─── INDIVIDUAL SAVE METHODS ──────────────────────────────────────────────────

/** Persists all solve events and the active event key. */
function saveEvents() {
    localStorage.setItem('allEvents', JSON.stringify(allEvents));
    localStorage.setItem('currentEvent', currentEvent);
    localStorage.setItem('globalLastSolveId', globalLastSolveId);
    localStorage.setItem('timerAccuracy', timerAccuracy);
    localStorage.setItem('minigameHistory', JSON.stringify(minigameHistory));
}

/** Persists the widget configuration. */
function saveWidgets() {
    localStorage.setItem('widgetConfig', JSON.stringify(widgetConfig));
    localStorage.setItem('minigameWidgetConfig', JSON.stringify(minigameWidgetConfig));
    localStorage.setItem('widgetCount', widgetCount);
}

/** Persists the current theme derived from body classes. */
function saveTheme() {
    const theme = document.body.classList.contains('theme-blue') ? 'blue' :
        document.body.classList.contains('theme-green') ? 'green' :
        document.body.classList.contains('theme-white') ? 'white' :
        document.body.classList.contains('theme-brown') ? 'brown' :
        document.body.classList.contains('theme-purple') ? 'purple' : 'black';
    localStorage.setItem('userTheme', theme);
}

/** Persists the current font derived from body classes. */
function saveFont() {
    const font = document.body.classList.contains('font-elegant') ? 'elegant' :
        document.body.classList.contains('font-tech') ? 'tech' :
            document.body.classList.contains('font-mono') ? 'mono' : 'default';
    localStorage.setItem('userFont', font);
}

/** Persists folder-specific state. */
function saveFolderState() {
    localStorage.setItem('currentFolderId', currentFolderId);
    localStorage.setItem('eventFolders', JSON.stringify(eventFolders));
}

/** Convenience: saves all state at once. Does NOT save lastActiveTab — that is
 *  managed exclusively by switchTab() to prevent startup overwrites. */
function saveToLocalStorage() {
    saveEvents();
    saveWidgets();
    saveTheme();
    saveFont();
    saveFolderState();
    localStorage.setItem('statsWidgetConfig', JSON.stringify(statsWidgetConfig));
    localStorage.setItem('userBio', userBio);
    localStorage.setItem('favoriteEvent', favoriteEvent);
    localStorage.setItem('cubingGoal', cubingGoal);
    localStorage.setItem('userPronouns', userPronouns);
    localStorage.setItem('pbAnimationLength', pbAnimationLength);
    localStorage.setItem('confirmSolveDelete', confirmSolveDelete);
    localStorage.setItem('useInspection', useInspection);
    localStorage.setItem('saveMinigameSolves', saveMinigameSolves);
}

// ─── INDIVIDUAL LOAD METHODS ──────────────────────────────────────────────────

/** Loads solve event data from localStorage into memory. */
function loadEvents() {
    // Migration: Check for older keys
    const migrations = [
        { old: 'allSessions', new: 'allEvents' },
        { old: 'currentSession', new: 'currentEvent' },
        { old: 'currentSessionId', new: 'currentFolderId' },
        { old: 'eventSessions', new: 'eventFolders' }
    ];

    migrations.forEach(m => {
        const oldVal = localStorage.getItem(m.old);
        if (oldVal && !localStorage.getItem(m.new)) {
            console.log(`[Migration] Migrating ${m.old} to ${m.new}...`);
            localStorage.setItem(m.new, oldVal);
            // We'll clean up at the end of loadEvents to be safe
        }
    });

    const historyData = localStorage.getItem('allEvents');
    if (historyData) {
        try {
            allEvents = JSON.parse(historyData);
            // Migration: Consolidate OH/BLD events into folders
            mergeSubEventsToFolders();

            // Migration: Ensure all remaining solves have a folderId
            Object.keys(allEvents).forEach(eid => {
                if (Array.isArray(allEvents[eid])) {
                    allEvents[eid].forEach(s => {
                        // Migrate sessionId field to folderId
                        if (s.sessionId && !s.folderId) {
                            s.folderId = s.sessionId;
                            delete s.sessionId;
                        }
                        if (!s.folderId) s.folderId = 'default';
                    });
                }
            });
        } catch (e) {
            console.error("Failed to parse allEvents history:", e);
        }
    } else {
        generateMockSolves();
    }

    const savedCurrent = localStorage.getItem('currentEvent');
    const retiredMappings = {
        '3x3oh': '3x3', '3x3bld': '3x3', '4x4bld': '4x4', '5x5bld': '5x5', '333mbf': '3x3'
    };

    if (savedCurrent && retiredMappings[savedCurrent]) {
        currentEvent = retiredMappings[savedCurrent];
    } else if (savedCurrent && allEvents[savedCurrent]) {
        currentEvent = savedCurrent;
    }

    const savedAcc = localStorage.getItem('timerAccuracy');
    if (savedAcc) {
        timerAccuracy = parseInt(savedAcc, 10);
    }
    const savedInspection = localStorage.getItem('useInspection');
    if (savedInspection !== null) useInspection = (savedInspection === 'true');

    solveHistory = allEvents[currentEvent];

    const savedMinigameHistory = localStorage.getItem('minigameHistory');
    if (savedMinigameHistory) {
        try {
            minigameHistory = JSON.parse(savedMinigameHistory);
        } catch (e) {
            console.warn('Failed to parse minigameHistory:', e);
        }
    }

    // Migration: Ensure all solves have unique IDs and eventId
    migrateSolvesWithIds();
}

/** Merges solves from specialized events into folders under parent events. */
function mergeSubEventsToFolders() {
    const mappings = {
        '3x3oh': { parent: '3x3', fId: 'sess_oh' },
        '3x3bld': { parent: '3x3', fId: 'sess_bld' },
        '4x4bld': { parent: '4x4', fId: 'sess_bld' },
        '5x5bld': { parent: '5x5', fId: 'sess_bld' },
        '333mbf': { parent: '3x3', fId: 'sess_mbld' }
    };

    let movedCount = 0;
    Object.keys(mappings).forEach(oldId => {
        if (allEvents[oldId] && Array.isArray(allEvents[oldId]) && allEvents[oldId].length > 0) {
            const map = mappings[oldId];
            if (!allEvents[map.parent]) allEvents[map.parent] = [];
            
            // Move solves
            allEvents[oldId].forEach(solve => {
                solve.folderId = map.fId;
                solve.eventId = map.parent;
                allEvents[map.parent].push(solve);
                movedCount++;
            });
            
            // Clean up
            delete allEvents[oldId];
        } else if (allEvents[oldId]) {
            delete allEvents[oldId];
        }
    });

    if (movedCount > 0) {
        console.log(`Successfully migrated ${movedCount} solves from specialized events to folders.`);
        saveEvents();
    }
}

/** 
 * Scans all events and ensures every solve has a unique global ID and eventId.
 * Also synchronizes the globalLastSolveId counter.
 */
function migrateSolvesWithIds() {
    let maxId = 0;
    let needsMigration = false;

    // Read stored counter if available
    const savedLastId = localStorage.getItem('globalLastSolveId');
    if (savedLastId) maxId = parseInt(savedLastId, 10);

    // Check all solves
    for (const eId in allEvents) {
        if (!Array.isArray(allEvents[eId])) continue;
        allEvents[eId].forEach(solve => {
            if (!solve.id || !solve.eventId) needsMigration = true;
            if (typeof solve.id === 'number' && solve.id > maxId) maxId = solve.id;
        });
    }

    if (!needsMigration) {
        globalLastSolveId = maxId;
        return;
    }

    console.log("Migrating solves to include unique IDs and eventId tracking...");
    let currentId = maxId;
    for (const eId in allEvents) {
        if (!Array.isArray(allEvents[eId])) continue;
        allEvents[eId].forEach(solve => {
            if (!solve.id) {
                currentId++;
                solve.id = currentId;
            }
            if (!solve.eventId) {
                solve.eventId = eId;
            }
        });
    }

    globalLastSolveId = currentId;
    saveEvents();
}

/** Loads widget configuration from localStorage into memory. */
function loadWidgets() {
    const saved = localStorage.getItem('widgetConfig');
    const savedCount = localStorage.getItem('widgetCount');
    if (savedCount !== null) widgetCount = parseInt(savedCount, 10);

    const version = localStorage.getItem('widgetConfigVersion');
    const TARGET_VERSION = '5';

    // FORCE MIGRATION: If we are on an old version or the config is missing/invalid
    if (version !== TARGET_VERSION) {
        console.log('[loadWidgets] Migrating to widget version:', TARGET_VERSION);
        widgetConfig = ['solves', 'stats', 'scramble', 'graph', 'columns'];
        minigameWidgetConfig = ['solves', 'scramble', 'gameui', 'chat'];
        widgetCount = 5;
        saveWidgets();
        localStorage.setItem('widgetConfigVersion', TARGET_VERSION);
        return;
    }

    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            if (!Array.isArray(loaded) || loaded.length !== widgetCount) {
                widgetConfig = ['solves', 'stats', 'scramble', 'graph', 'columns'];
            } else {
                widgetConfig = loaded;
            }
        } catch (e) {
            console.warn('Failed to parse widgetConfig:', e);
            widgetConfig = ['solves', 'stats', 'scramble', 'graph'];
        }
    }

    const savedMinigame = localStorage.getItem('minigameWidgetConfig');
    if (savedMinigame) {
        try {
            minigameWidgetConfig = JSON.parse(savedMinigame);
            // FORCE RESET if it contains standard widgets that are now disabled for minigames
            const invalidWidgets = ['graph', 'stats', 'columns'];
            const hasInvalid = minigameWidgetConfig.some(w => invalidWidgets.includes(w));

            if (!Array.isArray(minigameWidgetConfig) || minigameWidgetConfig.length !== 4 || hasInvalid) {
                minigameWidgetConfig = ['solves', 'scramble', 'gameui', 'chat'];
            }
        } catch (e) {
            console.warn('Failed to parse minigameWidgetConfig:', e);
            minigameWidgetConfig = ['solves', 'scramble', 'gameui', 'chat'];
        }
    }
}

/**
 * Reads the saved theme from localStorage and applies it via setTheme().
 * setTheme() must be defined in main_page.html before this is called.
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('userTheme') || 'black';
    if (typeof setTheme === 'function') setTheme(savedTheme, null);
}

/**
 * Reads the saved font from localStorage and applies it via setFont().
 * setFont() must be defined in main_page.html before this is called.
 */
function loadFont() {
    const savedFont = localStorage.getItem('userFont') || 'default';
    if (typeof setFont === 'function') setFont(savedFont, null);
}

/** Convenience: loads all persisted state. Replaces old loadFromLocalStorage(). */
function loadFromLocalStorage() {
    loadEvents();
    loadWidgets();

    // lastActiveTab is managed exclusively by main_page.html

    loadTheme();
    loadFont();
    const savedBio = localStorage.getItem('userBio');
    if (savedBio) userBio = savedBio;
    const savedPBAnim = localStorage.getItem('pbAnimationLength');
    if (savedPBAnim !== null) pbAnimationLength = parseFloat(savedPBAnim);
    const savedConfirmDelete = localStorage.getItem('confirmSolveDelete');
    if (savedConfirmDelete !== null) confirmSolveDelete = (savedConfirmDelete === 'true');
    const savedInspection = localStorage.getItem('useInspection');
    if (savedInspection !== null) useInspection = (savedInspection === 'true');
    const savedSaveMinigame = localStorage.getItem('saveMinigameSolves');
    if (savedSaveMinigame !== null) saveMinigameSolves = (savedSaveMinigame === 'true');

    const savedStatsConfig = localStorage.getItem('statsWidgetConfig');
    if (savedStatsConfig) {
        try {
            statsWidgetConfig = JSON.parse(savedStatsConfig);
        } catch (e) {
            console.warn('Failed to parse statsWidgetConfig:', e);
        }
    }
}
