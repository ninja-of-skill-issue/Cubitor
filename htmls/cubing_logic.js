/**
 * cubing_logic.js
 * Core logic for cubing calculations, stats, and time formatting.
 */

/**
 * Formats milliseconds into a human-readable time string (e.g., 1:23.45)
 * respects the global timerAccuracy setting.
 */
function formatTime(ms) {
    let totalSeconds = ms / 1000;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    const acc = (typeof timerAccuracy !== 'undefined') ? timerAccuracy : 2;

    if (minutes > 0) {
        let s = seconds.toFixed(acc).padStart(acc + 3, '0');
        return `${minutes}:${s}`;
    } else {
        return seconds.toFixed(acc);
    }
}

/**
 * Formats inspection time into a string (e.g., "15", "+2", "DNF")
 */
function formatInspectionTime(sec) {
    const elapsed = 15 - sec;
    if (elapsed < 15) return Math.floor(elapsed).toString();
    if (elapsed < 17) return "+2";
    return "DNF";
}

/**
 * Parses a time string (e.g., "1:23.45") back into total seconds.
 */
function parseTimeToSeconds(timeStr) {
    if (!timeStr || timeStr.toUpperCase() === 'DNF') return Infinity;

    const parts = timeStr.split(':');
    if (parts.length === 1) {
        return parseFloat(parts[0]) || 0;
    } else if (parts.length === 2) {
        const mins = parseInt(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return (mins * 60) + secs;
    }
    return parseFloat(timeStr) || 0;
}

/**
 * Calculates the total effective time for a solve including penalties.
 */
function getEffectiveTime(solve) {
    if (!solve) return 0;
    if (solve.penalty === 'DNF') return Infinity;
    if (typeof solve.penalty === 'number') return solve.time + solve.penalty;
    return solve.time;
}

/**
 * Finds a solve object across all events by its unique ID.
 */
function getSolveById(id) {
    id = parseInt(id, 10);
    if (typeof allEvents === 'undefined') return null;
    
    // Check minigame solves first if one is active
    if (typeof currentMinigame !== 'undefined' && currentMinigame && typeof timeAttackSolves !== 'undefined') {
        const mgSolve = timeAttackSolves.find(s => s.id === id);
        if (mgSolve) return { solve: mgSolve, eventId: 'minigame' };
    }

    for (const eId in allEvents) {
        if (!Array.isArray(allEvents[eId])) continue;
        const solve = allEvents[eId].find(s => s.id === id);
        if (solve) return { solve, eventId: eId };
    }
    return null;
}

/**
 * Calculates Average of N (standard competition trimming).
 */
function calculateAverage(times) {
    if (times.length < 3) return null;

    // Handle DNF (Infinity)
    let sorted = [...times].sort((a, b) => a - b);

    // Remove best and worst
    sorted.shift();
    sorted.pop();

    // If any Infinity remains, the average is DNF
    if (sorted.includes(Infinity)) return Infinity;

    let sum = sorted.reduce((a, b) => a + b, 0);
    return sum / sorted.length;
}

/**
 * Retrieves the best trimmed average of size N from the solve history.
 */
function getBestAverageDetail(n, history) {
    const list = history || solveHistory;
    if (!list || list.length < n) return null;
    let best = Infinity;
    let bestWindow = null;
    let bestStartIndex = 0;

    for (let i = 0; i <= list.length - n; i++) {
        const windowSolves = list.slice(i, i + n);
        const avg = calculateAverage(windowSolves.map(s => getEffectiveTime(s)));
        if (avg !== null && avg < best) {
            best = avg;
            bestWindow = windowSolves;
            bestStartIndex = i;
        }
    }
    if (best === Infinity) return null;

    let times = bestWindow.map(s => getEffectiveTime(s));
    let minTime = Math.min(...times);
    let maxTime = Math.max(...times);

    let droppedMin = false;
    let droppedMax = false;

    let resultList = bestWindow.map((solve, idx) => {
        let effTime = getEffectiveTime(solve);
        let dropped = false;
        if (!droppedMin && effTime === minTime) {
            droppedMin = true;
            dropped = true;
        } else if (!droppedMax && effTime === maxTime) {
            droppedMax = true;
            dropped = true;
        }
        return {
            solveNum: bestStartIndex + idx + 1,
            time: effTime,
            scramble: solve.scramble,
            penalty: solve.penalty,
            dropped: dropped
        };
    });

    return {
        average: best,
        solves: resultList
    };
}

/**
 * Calculates current mean and consistency stats.
 */
function getMeanDetail(history) {
    const list = history || solveHistory;
    if (!list || list.length === 0) return null;

    const effectiveTimes = list.map(s => getEffectiveTime(s));
    const validTimes = effectiveTimes.filter(t => t !== Infinity);

    if (validTimes.length === 0) return null;

    const sum = validTimes.reduce((a, b) => a + b, 0);
    const mean = sum / validTimes.length;

    const squareDiffs = validTimes.map(t => Math.pow(t - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const latestSolves = list.slice(-20).map((solve, idx) => {
        const globalIdx = list.length - 20 + idx;
        return {
            solveNum: globalIdx + 1,
            time: getEffectiveTime(solve),
            scramble: solve.scramble,
            penalty: solve.penalty,
            dropped: false
        };
    }).reverse();

    return {
        average: mean,
        stdDev: stdDev,
        solves: latestSolves,
        totalSolves: validTimes.length
    };
}

/**
 * Finds the best single solve in history.
 */
function getBestSingleDetail(history) {
    const list = history || solveHistory;
    if (!list || list.length === 0) return null;
    let bestIndex = -1;
    let minTime = Infinity;

    for (let i = 0; i < list.length; i++) {
        const eff = getEffectiveTime(list[i]);
        if (eff < minTime) {
            minTime = eff;
            bestIndex = i;
        }
    }

    if (bestIndex === -1) return null;
    return {
        solve: list[bestIndex],
        solveNum: bestIndex + 1
    };
}

/**
 * Gets the current average breakdown for the last N solves.
 */
function getCurrentAvgDetail(n, history) {
    const list = history || solveHistory;
    if (!list || list.length < n) return null;
    const win = list.slice(-n);
    const times = win.map(s => getEffectiveTime(s));
    const avg = calculateAverage(times);
    if (avg === null) return null;
    const minT = Math.min(...times), maxT = Math.max(...times);
    let drMin = false, drMax = false;
    const solves = win.map((s, idx) => {
        const t = getEffectiveTime(s);
        let dropped = false;
        if (!drMin && t === minT) { drMin = true; dropped = true; }
        else if (!drMax && t === maxT) { drMax = true; dropped = true; }
        return { solveNum: list.length - n + idx + 1, time: t, penalty: s.penalty, dropped };
    });
    return { average: avg, solves };
}

/**
 * Builds HTML rows for a breakdown breakdown.
 */
function breakdownRows(solves) {
    if (!solves) return '';
    return solves.map(sv => {
        const t = sv.time === Infinity ? 'DNF' : formatTime(sv.time * 1000);
        return `<div class="wsp-row ${sv.dropped ? 'wsp-dropped' : ''}">
            <span>#${sv.solveNum}</span><span>${t}${sv.penalty === '+2' ? ' (+2)' : ''}</span></div>`;
    }).join('');
}
