/**
 * custom_scramble_display.js
 * A custom Web Component for official WCA puzzles.
 */

// --- NxN Cube Logic ---
class CubeNxN {
    constructor(size = 3) { this.size = size; this.reset(); }
    reset() {
        // Standard Boy Scheme: U:White(0), D:Yellow(1), L:Orange(2), R:Red(3), F:Green(4), B:Blue(5)
        this.faces = {
            U: Array(this.size * this.size).fill(0), D: Array(this.size * this.size).fill(1),
            L: Array(this.size * this.size).fill(2), R: Array(this.size * this.size).fill(3),
            F: Array(this.size * this.size).fill(4), B: Array(this.size * this.size).fill(5)
        };
    }
    getRow(r) { let res = []; for (let i=0; i<this.size; i++) res.push(r * this.size + i); return res; }
    getCol(c) { let res = []; for (let i=0; i<this.size; i++) res.push(i * this.size + c); return res; }
    rotateStickers(key, cw = true) {
        const f = this.faces[key], n = this.size, prev = [...f];
        for (let r=0; r<n; r++) for (let c=0; c<n; c++) {
            if (cw) f[c * n + (n-1-r)] = prev[r * n + c];
            else f[(n-1-c) * n + r] = prev[r * n + c];
        }
    }
    cycle(sets) {
        const n = sets.length, last = sets[n - 1];
        const tmp = last[1].map(idx => this.faces[last[0]][idx]);
        for (let i = n - 1; i > 0; i--) {
            const dest = sets[i], src = sets[i - 1];
            src[1].forEach((idx, k) => this.faces[dest[0]][dest[1][k]] = this.faces[src[0]][idx]);
        }
        tmp.forEach((v, k) => this.faces[sets[0][0]][sets[0][1][k]] = v);
    }
    move(face, layer = 0, cw = true) {
        const n = this.size, rev = (a) => [...a].reverse();
        if (layer === 0) this.rotateStickers(face, cw);
        let s = [];
        switch (face) {
            case 'U': s = [['F', this.getRow(layer)], ['L', this.getRow(layer)], ['B', this.getRow(layer)], ['R', this.getRow(layer)]]; break;
            case 'D': s = [['F', this.getRow(n-1-layer)], ['R', this.getRow(n-1-layer)], ['B', this.getRow(n-1-layer)], ['L', this.getRow(n-1-layer)]]; break;
            case 'L': s = [['F', this.getCol(layer)], ['D', this.getCol(layer)], ['B', rev(this.getCol(n-1-layer))], ['U', this.getCol(layer)]]; break;
            case 'R': s = [['F', this.getCol(n-1-layer)], ['U', this.getCol(n-1-layer)], ['B', rev(this.getCol(layer))], ['D', this.getCol(n-1-layer)]]; break;
            case 'F': s = [['U', this.getRow(n-1-layer)], ['R', this.getCol(layer)], ['D', rev(this.getRow(layer))], ['L', rev(this.getCol(n-1-layer))]]; break;
            case 'B': s = [['U', rev(this.getRow(layer))], ['L', this.getCol(layer)], ['D', this.getRow(n-1-layer)], ['R', rev(this.getCol(n-1-layer))]]; break;
        }
        if (!cw) s.reverse(); this.cycle(s);
    }
    applyMove(m) {
        const regex = /^(\d*)([UDRLFB]w?|[udrlfbmzesxyz]|[MESXYZ])[23']?$/;
        const match = m.match(regex); if (!match) return;
        let prefix = match[1], base = match[2], mod = m.slice(prefix.length + base.length);
        let count = 1;
        if (mod.includes('2')) count = 2;
        else if (mod.includes("'") || mod.includes('3')) count = 3;
        
        let targetMoves = [];
        const n = this.size;
        const b = base.toLowerCase();

        if (['u','d','l','r','f','b'].includes(b[0]) && !['x', 'y', 'z', 'm', 'e', 's'].includes(b)) {
            let axis = base[0].toUpperCase();
            let depth = 1;
            if (base.includes('w')) depth = parseInt(prefix) || 2;
            else if (base >= 'a' && base <= 'z') depth = 2;
            for (let d = 0; d < depth; d++) targetMoves.push({ axis, layer: d, cw: true });
        } else {
            switch (b) {
                case 'm': targetMoves.push({ axis: 'L', layer: Math.floor(n / 2), cw: true }); break;
                case 'e': targetMoves.push({ axis: 'D', layer: Math.floor(n / 2), cw: true }); break;
                case 's': targetMoves.push({ axis: 'F', layer: Math.floor(n / 2), cw: true }); break;
                case 'x': for (let d = 0; d < n; d++) targetMoves.push({ axis: 'R', layer: d, cw: true }); break;
                case 'y': for (let d = 0; d < n; d++) targetMoves.push({ axis: 'U', layer: d, cw: true }); break;
                case 'z': for (let d = 0; d < n; d++) targetMoves.push({ axis: 'F', layer: d, cw: true }); break;
            }
        }

        for (let i = 0; i < count; i++) {
            for (let tm of targetMoves) {
                this.move(tm.axis, tm.layer, tm.cw);
            }
        }
    }
    applyScramble(str) { this.reset(); if (str) str.split(/\s+/).filter(x => x).forEach(m => this.applyMove(m)); }
}

// --- Pyraminx Logic ---
class PyraminxLogic {
    constructor() { this.reset(); }
    reset() { this.faces = { U: Array(9).fill(4), L: Array(9).fill(2), R: Array(9).fill(3), B: Array(9).fill(1) }; }
    cycle(sets) {
        const n = sets.length, last = sets[n - 1];
        const tmp = last[1].map(idx => this.faces[last[0]][idx]);
        for (let i = n - 1; i > 0; i--) {
            const dest = sets[i], src = sets[i - 1];
            src[1].forEach((idx, k) => this.faces[dest[0]][dest[1][k]] = this.faces[src[0]][idx]);
        }
        tmp.forEach((v, k) => this.faces[sets[0][0]][sets[0][1][k]] = v);
    }
    move(m) {
        let base = m[0], isTip = base >= 'a' && base <= 'z', axis = base.toUpperCase();
        let count = m.includes("'") ? 2 : 1;
        for (let i=0; i<count; i++) {
            switch (axis) {
                case 'U': this.cycle([['U',[0]],['R',[0]],['L',[0]]]); if (!isTip) this.cycle([['U',[1,2,3]],['R',[1,2,3]],['L',[1,2,3]]]); break;
                case 'R': this.cycle([['U',[8]],['B',[8]],['R',[4]]]); if (!isTip) this.cycle([['U',[7,6,5]],['B',[7,6,5]],['R',[3,2,8]]]); break;
                case 'L': this.cycle([['U',[4]],['L',[8]],['B',[4]]]); if (!isTip) this.cycle([['U',[5,3,2]],['L',[7,6,5]],['B',[3,2,8]]]); break;
                case 'B': this.cycle([['L',[4]],['R',[8]],['B',[0]]]); if (!isTip) this.cycle([['L',[3,2,8]],['R',[7,6,5]],['B',[1,2,3]]]); break;
            }
        }
    }
    applyScramble(str) { this.reset(); if (str) str.split(/\s+/).filter(x => x).forEach(m => this.move(m)); }
}

// --- Skewb Logic ---
class SkewbLogic {
    constructor() { this.reset(); }
    reset() { this.faces = { U: Array(5).fill(0), D: Array(5).fill(1), L: Array(5).fill(2), R: Array(5).fill(3), F: Array(5).fill(4), B: Array(5).fill(5) }; }
    cycle(sets) {
        const n = sets.length, last = sets[n - 1];
        const tmp = last[1].map(idx => this.faces[last[0]][idx]);
        for (let i = n - 1; i > 0; i--) {
            const dest = sets[i], src = sets[i - 1];
            src[1].forEach((idx, k) => this.faces[dest[0]][dest[1][k]] = this.faces[src[0]][idx]);
        }
        tmp.forEach((v, k) => this.faces[sets[0][0]][sets[0][1][k]] = v);
    }
    move(m) {
        let axis = m[0].toUpperCase(), count = m.includes("'") ? 2 : 1;
        for (let i=0; i<count; i++) {
            switch (axis) {
                case 'R': this.cycle([['U',[0]],['R',[0]],['F',[0]]]); this.cycle([['U',[2,4,3]],['R',[1,4,3]],['F',[2,1,4]]]); break;
                case 'L': this.cycle([['U',[0]],['F',[0]],['L',[0]]]); this.cycle([['U',[3,4,1]],['F',[3,4,1]],['L',[2,4,3]]]); break;
                case 'U': this.cycle([['U',[0]],['L',[0]],['B',[0]]]); this.cycle([['U',[1,4,2]],['B',[2,4,3]],['L',[1,4,2]]]); break;
                case 'B': this.cycle([['U',[0]],['B',[0]],['R',[0]]]); this.cycle([['U',[2,4,1]],['B',[1,4,2]],['R',[2,4,1]]]); break;
            }
        }
    }
    applyScramble(str) { this.reset(); if (str) str.split(/\s+/).filter(x => x).forEach(m => this.move(m)); }
}

// --- Megaminx Logic ---
class MegaminxLogic {
    constructor() { this.reset(); }
    reset() {
        this.faces = {}; 
        for (let i=0; i<12; i++) this.faces[i] = Array(11).fill(i);
    }
    cycle(sets) {
        const n = sets.length, last = sets[n-1];
        const tmp = last[1].map(idx => this.faces[last[0]][idx]);
        for (let i=n-1; i>0; i--) {
            const dest = sets[i], src = sets[i-1];
            src[1].forEach((idx, k) => this.faces[dest[0]][dest[1][k]] = this.faces[src[0]][idx]);
        }
        tmp.forEach((v, k) => this.faces[sets[0][0]][sets[0][1][k]] = v);
    }
    move(m) {
        if (m === "U") {
            this.rotateFace(0, true);
            this.cycle([[1, [1,2,6]], [2, [1,2,6]], [3, [1,2,6]], [4, [1,2,6]], [5, [1,2,6]]]);
        } else if (m === "U'") {
            for(let i=0; i<4; i++) this.move("U");
        } else if (m.startsWith("R")) {
            const cw = m.includes("++");
            const f_map = cw ? [0,1, 4,6,8,10,2, 5,7,9,11,3] : [0,1, 6,10,2,4,8, 11,3,5,7,9];
            this.applyFacePermutation(f_map);
        } else if (m.startsWith("D")) {
            const cw = m.includes("++");
            const f_map = cw ? [0, 5,1,2,3,4, 10,6,7,8,9, 11] : [0, 2,3,4,5,1, 7,8,9,10,6, 11];
            this.applyFacePermutation(f_map);
        }
    }
    applyFacePermutation(map) {
        let nextFaces = {};
        for(let i=0; i<12; i++) nextFaces[map[i]] = [...this.faces[i]];
        for(let i=0; i<12; i++) this.faces[i] = nextFaces[i];
    }
    rotateFace(f, cw) {
        const s = this.faces[f]; const n = [...s];
        for(let i=0; i<5; i++) {
            const t = cw ? (i%5)+1 : ((i+4)%5)+1;
            n[t] = s[i+1]; n[t+5] = s[i+6];
        }
        this.faces[f] = n;
    }
    applyScramble(str) { this.reset(); if (str) str.split(/\s+/).filter(x => x).forEach(m => this.move(m)); }
}

class CustomScrambleDisplay extends HTMLElement {
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        console.log('CustomScrambleDisplay: Component Initialized (v2.1)');
        this.currentEvent = '333'; this.cube = new CubeNxN(3); this.tokens = [];
    }
    static get observedAttributes() { return ['scramble', 'event', 'mode', 'focus-face']; }
    get mode() { return this.getAttribute('mode') || 'scramble'; }
    set mode(val) { this.setAttribute('mode', val); }
    get focusFace() { return this.getAttribute('focus-face') || 'U'; }
    set focusFace(val) { this.setAttribute('focus-face', val); }
    get event() { return this.getAttribute('event'); }
    set event(val) { this.setAttribute('event', val); }
    get scramble() { return this.getAttribute('scramble'); }
    set scramble(val) { this.setAttribute('scramble', val); }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (name === 'event') {
            this.currentEvent = newVal;
            const sizeMap = { '222': 2, '333': 3, '444': 4, '555': 5, '666': 6, '777': 7 };
            if (sizeMap[newVal]) this.cube = new CubeNxN(sizeMap[newVal]);
            else if (newVal === 'pyram') this.cube = new PyraminxLogic();
            else if (newVal === 'skewb') this.cube = new SkewbLogic();
            else if (newVal === 'minx') this.cube = new MegaminxLogic();
            this.setScramble(this.getAttribute('scramble') || "");
        } else if (name === 'scramble') this.setScramble(newVal);
        else if (name === 'mode' || name === 'focus-face') this.render();
    }
    setScramble(val) {
        this._scramble = val || "";
        const raw = this._scramble.replace(/([()])/g, ' $1 ').split(/\s+/).filter(t => t.length > 0);
        const moveRegex = /^(\d*)([UDRLFB]w?|[udrlfbmzesxyz]|[MESXYZ])[23']?$|^[RD][+-][+-]$|^U'?$/;
        this.tokens = raw.map(t => ({ text: t, isValid: moveRegex.test(t) || /^\d+$/.test(t) || /^[()]$/.test(t) }));
        
        // If there's a mistake, reset to solved immediately
        if (this.tokens.some(t => !t.isValid)) {
            this.cube.reset();
            this.render();
            return;
        }

        let tokenIdx = 0;
        const expand = () => {
            let res = [];
            while (tokenIdx < this.tokens.length) {
                const t = this.tokens[tokenIdx];
                if (t.text === '(') { tokenIdx++; const sub = expand(); let m = 1; if (res.length > 0 && /^\d+$/.test(res[res.length-1])) m = parseInt(res.pop()); for (let n=0; n<m; n++) res.push(...sub); }
                else if (t.text === ')') { tokenIdx++; return res; }
                else { res.push(t.text); tokenIdx++; }
            }
            return res;
        };
        const expanded = expand().filter(m => moveRegex.test(m));
        this.cube.applyScramble(expanded.join(' '));
        this.render();
    }
    connectedCallback() { this.render(); }
    updateVisualizer(eventId, scramble) {
        if (eventId) {
            this.currentEvent = eventId;
            const sizeMap = { '222': 2, '333': 3, '444': 4, '555': 5, '666': 6, '777': 7 };
            if (sizeMap[eventId]) this.cube = new CubeNxN(sizeMap[eventId]);
            else if (eventId === 'pyram') this.cube = new PyraminxLogic();
            else if (eventId === 'skewb') this.cube = new SkewbLogic();
            else if (eventId === 'minx') this.cube = new MegaminxLogic();
        }
        if (scramble !== undefined) {
            this.setScramble(scramble);
        } else {
            this.render();
        }
    }
    render() {
        // Standard Boy Scheme: 0:White, 1:Yellow, 2:Orange, 3:Red, 4:Green, 5:Blue, ...
        const colors = ['#f8f9fa', '#fdd835', '#ffa726', '#ef5350', '#66bb6a', '#42a5f5', '#ba68c8', '#bdbdbd', '#f48fb1', '#81c784', '#ffe082', '#4dd0e1'];
        const cubeLayout = [[null,'U',null,null], ['L','F','R','B'], [null,'D',null,null]];
        let html = `<style>
            :host { display: grid; place-items: center; width: 100%; height: 100%; box-sizing: border-box; overflow: hidden; container-type: inline-size; }
            .cube-net { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; width: 100%; max-width: 100%; height: auto; align-content: center; justify-content: center; }
            .face { display: grid; background: transparent; padding: 2px; border-radius: 4px; gap: 1px; border: none; width: 100%; aspect-ratio: 1/1; box-sizing: border-box; }
            .sticker { width: 100%; height: 100%; border-radius: 1px; border: 1px solid rgba(0,0,0,0.15); box-sizing: border-box; }
            .svg-net { width: 100%; height: 100%; max-height: 100%; overflow: visible; shape-rendering: geometricPrecision; display: block; }
            .face-svg { display: flex; align-items: center; justify-content: center; background: transparent; padding: 4px; border-radius: 6px; border: none; width: 100%; height: auto; max-height: 100%; box-sizing: border-box; }
            .poly { stroke: rgba(0,0,0,0.2); stroke-width: 0.5px; stroke-linejoin: round; }
        </style>`;

        if (this.currentEvent === 'pyram') {
            html += `<div class="face-svg"><svg viewBox="0 0 320 280" class="svg-net">`;
            const drawTri = (f, ox, oy, s, flipped = false) => {
                const h = s * Math.sqrt(3)/2, sc = 0.9;
                const m = [[0,0,1], [-0.5,1,1],[0,1,0],[0.5,1,1], [-1,2,1],[-0.5,2,0],[0,2,1],[0.5,2,0],[1,2,1]];
                m.forEach((t, i) => {
                    const px = ox + t[0]*s, py = oy + t[1]* (flipped ? -h : h), u = flipped ? !t[2] : t[2];
                    let pts = u ? [[px, py], [px-s/2, py+h], [px+s/2, py+h]] : [[px, py+h], [px-s/2, py], [px+s/2, py]];
                    const cx = pts.reduce((sum, p) => sum + p[0], 0) / 3, cy = pts.reduce((sum, p) => sum + p[1], 0) / 3;
                    let ps = pts.map(p => `${cx + (p[0]-cx)*sc},${cy + (p[1]-cy)*sc}`).join(' ');
                    html += `<polygon points="${ps}" fill="${colors[this.cube.faces[f][i]]}" class="poly"/>`;
                });
            };
            drawTri('U', 160, 15, 46); drawTri('L', 70, 155, 46); drawTri('R', 250, 155, 46); drawTri('B', 160, 235, 46, true);
            html += `</svg></div>`;
        } else if (this.currentEvent === 'skewb') {
            html += `<div class="face-svg"><svg viewBox="0 0 320 260" class="svg-net">`;
            const drawSkewb = (f, ox, oy, s) => {
                const p = [[s/2,0, s,s/2, s/2,s, 0,s/2], [0,0, s/2,0, 0,s/2], [s,0, s,s/2, s/2,0], [s,s, s/2,s, s,s/2], [0,s, 0,s/2, s/2,s]];
                const f_data = this.cube.faces[f], sc = 0.92;
                p.forEach((p_raw, i) => {
                    let pts = []; for(let k=0; k<p_raw.length; k+=2) pts.push([ox+p_raw[k], oy+p_raw[k+1]]);
                    const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length, cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
                    let ps = pts.map(p => `${cx + (p[0]-cx)*sc},${cy + (p[1]-cy)*sc}`).join(' ');
                    html += `<polygon points="${ps}" fill="${colors[f_data[i]]}" class="poly"/>`;
                });
            };
            const sk = [['U',80,20],['L',20,80],['F',80,80],['R',140,80],['B',200,80],['D',80,140]];
            sk.forEach(s_ => drawSkewb(s_[0], s_[1], s_[2], 50));
            html += `</svg></div>`;
        } else if (this.currentEvent === 'minx') {
            html += `<div class="face-svg"><svg viewBox="0 0 500 320" class="svg-net">`;
            const drawPent = (f, ox, oy, r, rot = 0) => {
                const sc = 0.92;
                const getPts = (cx, cy, radius, startAngle) => {
                    let res = []; for(let i=0; i<5; i++) {
                        let a = startAngle + (i * 72 * Math.PI / 180);
                        res.push([cx + Math.cos(a)*radius, cy + Math.sin(a)*radius]);
                    } return res;
                };
                const v = getPts(ox, oy, r, rot - Math.PI/2);
                const c = getPts(ox, oy, r*0.4, rot - Math.PI/2);
                const scP = (pts) => {
                    const cx = pts.reduce((s_, p) => s_ + p[0], 0) / pts.length, cy = pts.reduce((s_, p) => s_ + p[1], 0) / pts.length;
                    return pts.map(p => `${cx + (p[0]-cx)*sc},${cy + (p[1]-cy)*sc}`).join(' ');
                };
                html += `<polygon points="${scP(c)}" fill="${colors[this.cube.faces[f][0]]}" class="poly"/>`;
                for(let i=0; i<5; i++){
                    const p1 = c[i], p2 = c[(i+1)%5], p3 = v[i], p4 = v[(i+1)%5];
                    const edge = [p1, p2, p4, p3];
                    html += `<polygon points="${scP(edge)}" fill="${colors[this.cube.faces[f][i+1]]}" class="poly"/>`;
                }
            };
            const f1_c = [120, 160], f2_c = [380, 160], r = 30;
            // Flower 1: Middle Normal (0), Sides pointing DOWN (120)
            drawPent(0, f1_c[0], f1_c[1], r, 0); 
            for(let i=0; i<5; i++) {
                const a = (i * 72 - 90 + 36) * Math.PI / 180; // Shift to edges
                drawPent(i+1, f1_c[0] + Math.cos(a)*r*1.85, f1_c[1] + Math.sin(a)*r*1.85, r, 120);
            }
            // Flower 2: Middle pointing DOWN (120), Sides Normal (0) - RESTORED
            drawPent(11, f2_c[0], f2_c[1], r, 120); 
            for(let i=0; i<5; i++) {
                const a = (i * 72 - 90) * Math.PI / 180; 
                drawPent(i+6, f2_c[0] + Math.cos(a)*r*1.85, f2_c[1] + Math.sin(a)*r*1.85, r, 0);
            }
            html += `</svg></div>`;
        } else {
            const n = this.cube.size; html += `<div class="cube-net">`;
            cubeLayout.forEach(row => row.forEach(f => {
                if (f) {
                    html += `<div class="face" style="grid-template-columns: repeat(${n}, 1fr);">`;
                    this.cube.faces[f].forEach(c => html += `<div class="sticker" style="background:${colors[c]}"></div>`);
                    html += `</div>`;
                } else html += `<div></div>`;
            })); html += `</div>`;
        }
        this.shadowRoot.innerHTML = html;
    }
}
customElements.define('custom-scramble-display', CustomScrambleDisplay);
