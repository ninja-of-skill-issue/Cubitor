/**
 * nxn_isometric_view.js
 * A Web Component for a 3D isometric view of an NxN cube (showing U, F, R faces).
 */

class NxNIsometricView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._size = 3;
        this._scramble = "";
        this.cube = null;
    }

    static get observedAttributes() { return ['size', 'scramble']; }

    connectedCallback() {
        this.update();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (name === 'size') this._size = parseInt(newVal) || 3;
        if (name === 'scramble') this._scramble = newVal || "";
        this.update();
    }

    update() {
        if (!this.cube || this.cube.size !== this._size) {
            // Use the logic class defined below
            this.cube = new CubeLogic(this._size);
        }
        this.cube.applyScramble(this._scramble);
        this.render();
    }

    render() {
        const n = this._size;
        // Standard Boy Scheme: 0:White(U), 1:Yellow(D), 2:Orange(L), 3:Red(R), 4:Green(F), 5:Blue(B)
        const colors = ['#f8f9fa', '#fdd835', '#ffa726', '#ef5350', '#66bb6a', '#42a5f5'];
        
        // Isometric Math
        const L = 30; // Sticker side length
        const angle = 30 * Math.PI / 180;
        const dx = Math.cos(angle) * L;
        const dy = Math.sin(angle) * L;
        
        // SVG Viewbox dimensions (approx)
        const totalW = 2 * n * dx + 20;
        const totalH = n * dy + n * L + n * dy + 20;
        const midX = totalW / 2;
        const topY = 10;

        let svgHtml = `<svg viewBox="0 0 ${totalW} ${totalH}" style="width: 100%; height: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">`;
        svgHtml += `<defs>
            <filter id="shade" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                <feOffset dx="0" dy="1" result="offsetblur" />
                <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
        </defs>`;

        // Helper to draw a rhombus/parallelogram
        const drawSticker = (pts, color, shading = 0) => {
            const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
            // Shading: 1.0 = normal, 0.9 = front, 0.7 = right
            return `<polygon points="${pointsStr}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" style="filter: brightness(${shading});" />`;
        };

        const sc = 0.92; // Internal scaling for gaps

        // Face U (Top) - Orientation: n rows, n columns
        // Origin: (midX, topY)
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const color = colors[this.cube.faces.U[r * n + c]];
                // Vertices
                const p0 = { x: midX + (c - r) * dx, y: topY + (c + r) * dy };
                const p1 = { x: p0.x + dx, y: p0.y + dy };
                const p2 = { x: p0.x, y: p0.y + 2 * dy };
                const p3 = { x: p0.x - dx, y: p0.y + dy };
                
                // Scale slightly for gap
                const cx = (p0.x + p2.x) / 2;
                const cy = (p0.y + p2.y) / 2;
                const pts = [p0, p1, p2, p3].map(p => ({ x: cx + (p.x - cx) * sc, y: cy + (p.y - cy) * sc }));
                
                svgHtml += drawSticker(pts, color, 1.03); // Slightly brighter on top
            }
        }

        // Face F (Left-leaning front side) - Green by default
        // Origin of F: (midX - n*dx, topY + n*dy)
        const fOriginX = midX - n * dx;
        const fOriginY = topY + n * dy;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const color = colors[this.cube.faces.F[r * n + c]];
                // Vertices
                const p0 = { x: fOriginX + c * dx, y: fOriginY + c * dy + r * L };
                const p1 = { x: p0.x + dx, y: p0.y + dy };
                const p2 = { x: p1.x, y: p1.y + L };
                const p3 = { x: p0.x, y: p0.y + L };

                const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
                const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
                const pts = [p0, p1, p2, p3].map(p => ({ x: cx + (p.x - cx) * sc, y: cy + (p.y - cy) * sc }));

                svgHtml += drawSticker(pts, color, 0.9); // Slightly darker on left
            }
        }

        // Face R (Right-leaning front side) - Red by default
        const rOriginX = midX;
        const rOriginY = topY + 2 * n * dy;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const color = colors[this.cube.faces.R[r * n + c]];
                // Vertices
                const p0 = { x: rOriginX + c * dx, y: rOriginY - c * dy + r * L };
                const p1 = { x: p0.x + dx, y: p0.y - dy };
                const p2 = { x: p1.x, y: p1.y + L };
                const p3 = { x: p0.x, y: p0.y + L };

                const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
                const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
                const pts = [p0, p1, p2, p3].map(p => ({ x: cx + (p.x - cx) * sc, y: cy + (p.y - cy) * sc }));

                svgHtml += drawSticker(pts, color, 0.75); // Darkest on right side
            }
        }

        svgHtml += `</svg>`;
        
        let html = `
        <style>
            :host { display: block; width: 100%; height: auto; aspect-ratio: 1/1.1; }
            .isometric-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 5%; box-sizing: border-box; }
        </style>
        <div class="isometric-container">
            ${svgHtml}
        </div>
        `;
        this.shadowRoot.innerHTML = html;
    }
}

// Minimal Cube Logic for the standalone component
class CubeLogic {
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

customElements.define('nxn-isometric-view', NxNIsometricView);
