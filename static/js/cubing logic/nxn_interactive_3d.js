/**
 * nxn_interactive_3d.js
 * A custom Web Component for a fully interactive, rotatable 3D NxN cube.
 * Built from scratch with raw SVG and custom projection logic.
 */

class NxNInteractive3D extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._size = 3;
        this._scramble = "";
        this.cube = null;
        
        // Rotation state
        this.phi = -Math.PI / 4;  // Y-axis rotation
        this.theta = 0.5;         // X-axis rotation
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        // Persistent elements
        this.container = document.createElement('div');
        this.container.className = 'container';
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("viewBox", "0 0 300 300");
        this.container.appendChild(this.svg);
        
        const style = document.createElement('style');
        style.textContent = `
            :host { display: block; width: 100%; height: 100%; }
            .container { width: 100%; height: 100%; cursor: grab; display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none; user-select: none; background: transparent; }
            .container:active { cursor: grabbing; }
            svg { width: 100%; height: 100%; pointer-events: none; }
        `;
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.container);

        this._onPointerDown = this.onPointerDown.bind(this);
        this._onPointerMove = this.onPointerMove.bind(this);
        this._onPointerUp = this.onPointerUp.bind(this);
    }

    static get observedAttributes() { return ['size', 'scramble']; }

    connectedCallback() {
        this.setupInteraction();
        this.update();
    }

    setupInteraction() {
        this.container.addEventListener('pointerdown', this._onPointerDown);
        this.container.addEventListener('pointermove', this._onPointerMove);
        this.container.addEventListener('pointerup', this._onPointerUp);
        this.container.addEventListener('pointercancel', this._onPointerUp);
        this.container.addEventListener('pointerleave', this._onPointerUp);
    }

    onPointerDown(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.container.setPointerCapture(e.pointerId);
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.phi += dx * 0.015;
        this.theta += dy * 0.015;
        this.theta = Math.max(-Math.PI/2 + 0.2, Math.min(Math.PI/2 - 0.2, this.theta));
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.render();
    }

    onPointerUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.releasePointerCapture(e.pointerId);
            e.stopPropagation();
        }
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (name === 'size') this._size = parseInt(newVal) || 3;
        if (name === 'scramble') this._scramble = newVal || "";
        this.update();
    }

    update() {
        if (!this.cube || this.cube.size !== this._size) {
            this.cube = new CubeLogic3D(this._size);
        }
        this.cube.applyScramble(this._scramble);
        this.render();
    }

    updateVisualizer(eventId, scramble) {
        if (eventId) {
            const size = parseInt(eventId[0]) || 3;
            if (this._size !== size) {
                this._size = size;
                this.cube = new CubeLogic3D(this._size);
            }
        }
        if (scramble !== undefined) this._scramble = scramble;
        this.update();
    }

    project(x, y, z, size) {
        let x1 = x * Math.cos(this.phi) + z * Math.sin(this.phi);
        let z1 = -x * Math.sin(this.phi) + z * Math.cos(this.phi);
        let y1 = y * Math.cos(this.theta) - z1 * Math.sin(this.theta);
        let z2 = y * Math.sin(this.theta) + z1 * Math.cos(this.theta);
        const scale = 85 / (size / 2); 
        return { x: 150 + x1 * scale, y: 150 - y1 * scale, z: z2 };
    }

    // Helper to generate a path with semi-rounded corners
    getRoundedPath(pts) {
        const p = pts;
        const n = p.length;
        const k = 0.25; // Sharpness factor: lower = sharper, 0.5 = full round
        let d = "";
        for (let i = 0; i < n; i++) {
            const curr = p[i];
            const prev = p[(i - 1 + n) % n];
            const next = p[(i + 1) % n];
            
            const x1 = curr.x + (prev.x - curr.x) * k;
            const y1 = curr.y + (prev.y - curr.y) * k;
            const x2 = curr.x + (next.x - curr.x) * k;
            const y2 = curr.y + (next.y - curr.y) * k;
            
            if (i === 0) d += `M ${x1} ${y1}`;
            else d += ` L ${x1} ${y1}`;
            d += ` Q ${curr.x} ${curr.y} ${x2} ${y2}`;
        }
        return d + " Z";
    }

    render() {
        const n = this._size;
        const colors = ['#f8f9fa', '#fdd835', '#ffa726', '#ef5350', '#66bb6a', '#42a5f5'];
        const half = n / 2;
        const sc = 0.88; // Slightly larger stickers for the "less rounded" look

        const faceConfigs = [
            { key: 'U', norm: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], origin: [-half, half, -half] },
            { key: 'D', norm: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1], origin: [-half, -half, half] },
            { key: 'L', norm: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0], origin: [-half, half, -half] },
            { key: 'R', norm: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0], origin: [half, half, half] },
            { key: 'F', norm: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0], origin: [-half, half, half] },
            { key: 'B', norm: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0], origin: [half, half, -half] }
        ];

        let visibleFaces = [];
        faceConfigs.forEach(face => {
            const n0 = this.project(0, 0, 0, n);
            const n1 = this.project(face.norm[0], face.norm[1], face.norm[2], n);
            const normalZ = n1.z - n0.z;

            if (normalZ > 0) {
                let faceData = {
                    avgZ: normalZ,
                    stickers: [],
                    basePts: [
                        this.project(face.origin[0], face.origin[1], face.origin[2], n),
                        this.project(face.origin[0] + n * face.u[0], face.origin[1] + n * face.u[1], face.origin[2] + n * face.u[2], n),
                        this.project(face.origin[0] + n * (face.u[0] + face.v[0]), face.origin[1] + n * (face.u[1] + face.v[1]), face.origin[2] + n * (face.u[2] + face.v[2]), n),
                        this.project(face.origin[0] + n * face.v[0], face.origin[1] + n * face.v[1], face.origin[2] + n * face.v[2], n)
                    ]
                };

                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        const colorIndex = this.cube.faces[face.key][r * n + c];
                        const sticker = { color: colors[colorIndex], pts: [] };
                        const corners = [{ u: c, v: r }, { u: c + 1, v: r }, { u: c + 1, v: r + 1 }, { u: c, v: r + 1 }];
                        corners.forEach(p => {
                            const x = face.origin[0] + p.u * face.u[0] + p.v * face.v[0];
                            const y = face.origin[1] + p.u * face.u[1] + p.v * face.v[1];
                            const z = face.origin[2] + p.u * face.u[2] + p.v * face.v[2];
                            sticker.pts.push(this.project(x, y, z, n));
                        });
                        const cx = sticker.pts.reduce((s, p) => s + p.x, 0) / 4;
                        const cy = sticker.pts.reduce((s, p) => s + p.y, 0) / 4;
                        sticker.pts = sticker.pts.map(p => ({ x: cx + (p.x - cx) * sc, y: cy + (p.y - cy) * sc }));
                        faceData.stickers.push(sticker);
                    }
                }
                visibleFaces.push(faceData);
            }
        });

        visibleFaces.sort((a, b) => a.avgZ - b.avgZ);

        let svgHtml = visibleFaces.map(f => {
            const basePoints = f.basePts.map(p => `${p.x},${p.y}`).join(' ');
            let h = `<polygon points="${basePoints}" fill="none" stroke="none" stroke-width="0" />`;
            f.stickers.forEach(s => {
                const d = this.getRoundedPath(s.pts, 4);
                h += `<path d="${d}" fill="${s.color}" />`;
            });
            return h;
        }).join('');

        this.svg.innerHTML = svgHtml;
    }
}

class CubeLogic3D {
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
        const n = this.size; const b = base.toLowerCase();
        let targetMoves = [];
        if (['u','d','l','r','f','b'].includes(b[0]) && !['x', 'y', 'z', 'm', 'e', 's'].includes(b)) {
            let axis = base[0].toUpperCase(); let depth = base.includes('w') ? (parseInt(prefix) || 2) : (base >= 'a' && base <= 'z' ? 2 : 1);
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
        for (let i = 0; i < count; i++) for (let tm of targetMoves) this.move(tm.axis, tm.layer, tm.cw);
    }
    applyScramble(str) { this.reset(); if (str) str.split(/\s+/).filter(x => x).forEach(m => this.applyMove(m)); }
}

customElements.define('nxn-interactive-3d', NxNInteractive3D);
