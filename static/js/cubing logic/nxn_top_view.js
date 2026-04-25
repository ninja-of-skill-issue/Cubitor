/**
 * nxn_top_view.js
 * A specialized Web Component for a "normal projection" top-down view of an NxN cube.
 */

class NxNTopView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._size = 3;
        this._scramble = "";
        this._focusFace = 'U'; // Default to Top/U for algorithm training
        this.cube = null;
    }

    static get observedAttributes() { return ['size', 'scramble', 'focus-face']; }

    connectedCallback() {
        console.log('NxNTopView: Component Initialized');
        this.update();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (name === 'size') this._size = parseInt(newVal) || 3;
        if (name === 'scramble') this._scramble = newVal || "";
        if (name === 'focus-face') this._focusFace = newVal || 'U';
        this.update();
    }

    update() {
        if (!this.cube || this.cube.size !== this._size) {
            this.cube = new CubeNxNLogic(this._size);
        }
        this.cube.applyScramble(this._scramble);
        this.render();
    }

    render() {
        const n = this._size;
        const colors = ['#f8f9fa', '#fdd835', '#ffa726', '#ef5350', '#66bb6a', '#42a5f5'];
        const f = this._focusFace;
        
        // Adjacency logic - finding the rows/cols that touch the focus face
        const getAdj = () => {
            const row = (r, rev = false) => {
                let a = Array.from({ length: n }, (_, i) => r * n + i);
                return rev ? a.reverse() : a;
            };
            const col = (c, rev = false) => {
                let a = Array.from({ length: n }, (_, i) => i * n + c);
                return rev ? a.reverse() : a;
            };

            const f = this._focusFace;
            const size = n;

            if (f === 'U') return { t: 'B', b: 'F', l: 'L', r: 'R', ti: row(0, true), bi: row(0), li: row(0), ri: row(0, true) };
            if (f === 'D') return { t: 'F', b: 'B', l: 'L', r: 'R', ti: row(size - 1), bi: row(size - 1, true), li: row(size - 1, true), ri: row(size - 1) };
            if (f === 'F') return { t: 'U', b: 'D', l: 'L', r: 'R', ti: row(size - 1), bi: row(0), li: col(size - 1), ri: col(0) };
            if (f === 'B') return { t: 'U', b: 'D', l: 'R', r: 'L', ti: row(0, true), bi: row(size - 1, true), li: col(size - 1), ri: col(0) };
            if (f === 'L') return { t: 'U', b: 'D', l: 'B', r: 'F', ti: col(0), bi: col(0, true), li: col(size - 1), ri: col(0) };
            if (f === 'R') return { t: 'U', b: 'D', l: 'F', r: 'B', ti: col(size - 1, true), bi: col(size - 1), li: col(size - 1), ri: col(0) };

            return { t: 'U', b: 'D', l: 'L', r: 'R', ti: [], bi: [], li: [], ri: [] };
        };
        const adj = getAdj();

        let html = `
        <style>
            :host { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; box-sizing: border-box; container-type: inline-size; }
            .container { 
                display: grid; 
                grid-template-columns: 0.25fr repeat(${n}, 1fr) 0.25fr; 
                grid-template-rows: 0.25fr repeat(${n}, 1fr) 0.25fr; 
                gap: 2.5cqw; 
                width: 100%; 
                height: 100%; 
                max-width: 100%;
                max-height: 100%;
                aspect-ratio: 1/1;
                padding: 2cqw;
                background: none;
                box-sizing: border-box;
                margin: auto;
            }
            .sticker { border-radius: 3.5cqw; width: 100%; height: 100%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); }
            .center-sticker { aspect-ratio: 1/1; border-radius: 6cqw; }
            .side-sticker { background: transparent; }
            .side-sticker.top, .side-sticker.bottom { border-radius: 2cqw; }
            .side-sticker.left, .side-sticker.right { border-radius: 2cqw; }
        </style>
        <div class="container">
        `;

        // Empty corner (0,0)
        html += `<div></div>`;
        // Top side
        adj.ti.forEach((idx) => {
            const color = colors[this.cube.faces[adj.t][idx]];
            html += `<div class="sticker side-sticker top" style="background: ${color}"></div>`;
        });
        // Empty corner (0, n+1)
        html += `<div></div>`;

        // Middle rows
        for (let r = 0; r < n; r++) {
            // Left side
            const lColor = colors[this.cube.faces[adj.l][adj.li[r]]];
            html += `<div class="sticker side-sticker left" style="background: ${lColor}"></div>`;
            
            // Center face
            for (let c = 0; c < n; c++) {
                const color = colors[this.cube.faces[f][r * n + c]];
                html += `<div class="sticker center-sticker" style="background: ${color}"></div>`;
            }
            
            // Right side
            const rColor = colors[this.cube.faces[adj.r][adj.ri[r]]];
            html += `<div class="sticker side-sticker right" style="background: ${rColor}"></div>`;
        }

        // Bottom corners and side
        html += `<div></div>`;
        adj.bi.forEach((idx) => {
            const color = colors[this.cube.faces[adj.b][idx]];
            html += `<div class="sticker side-sticker bottom" style="background: ${color}"></div>`;
        });
        html += `<div></div>`;

        html += `</div>`;
        this.shadowRoot.innerHTML = html;
    }
}

// Minimal Cube Logic for the standalone component
class CubeNxNLogic {
    constructor(size = 3) { this.size = size; this.reset(); }
    reset() {
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

customElements.define('nxn-top-view', NxNTopView);
