/**
 * pyraminx_interactive_3d.js
 * A custom Web Component for a fully interactive, rotatable 3D Pyraminx.
 * Built from scratch with raw SVG and custom projection logic.
 */

class PyraminxInteractive3D extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._scramble = "";
        this.cube = null;
        
        // Rotation state
        this.phi = -Math.PI / 4;  // Y-axis rotation
        this.theta = 0.3;         // X-axis rotation
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

    static get observedAttributes() { return ['scramble']; }

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
        if (name === 'scramble') this._scramble = newVal || "";
        this.update();
    }

    update() {
        if (!this.cube) {
            if (typeof PyraminxLogic !== 'undefined') {
                this.cube = new PyraminxLogic(); 
            } else {
                console.error("PyraminxLogic not found. Make sure custom_scramble_display.js is loaded.");
                return;
            }
        }
        this.cube.applyScramble(this._scramble);
        this.render();
    }

    updateVisualizer(eventId, scramble) {
        if (scramble !== undefined) this._scramble = scramble;
        this.update();
    }

    project(x, y, z) {
        let x1 = x * Math.cos(this.phi) + z * Math.sin(this.phi);
        let z1 = -x * Math.sin(this.phi) + z * Math.cos(this.phi);
        let y1 = y * Math.cos(this.theta) - z1 * Math.sin(this.theta);
        let z2 = y * Math.sin(this.theta) + z1 * Math.cos(this.theta);
        const scale = 110; 
        return { x: 150 + x1 * scale, y: 150 - y1 * scale, z: z2 };
    }

    getRoundedPath(pts, k = 0.2) {
        const p = pts;
        const n = p.length;
        let d = "";
        for (let i = 0; i < n; i++) {
            const curr = p[i], prev = p[(i - 1 + n) % n], next = p[(i + 1) % n];
            const x1 = curr.x + (prev.x - curr.x) * k, y1 = curr.y + (prev.y - curr.y) * k;
            const x2 = curr.x + (next.x - curr.x) * k, y2 = curr.y + (next.y - curr.y) * k;
            if (i === 0) d += `M ${x1} ${y1}`; else d += ` L ${x1} ${y1}`;
            d += ` Q ${curr.x} ${curr.y} ${x2} ${y2}`;
        }
        return d + " Z";
    }

    render() {
        const colors = ['#f8f9fa', '#fdd835', '#ffa726', '#ef5350', '#66bb6a', '#42a5f5', '#ba68c8', '#bdbdbd', '#f48fb1', '#81c784', '#ffe082', '#4dd0e1'];
        const sc = 0.96;

        // Tetrahedron vertices
        const v = [
            [0, 1, 0], // Top (0)
            [-0.94, -0.33, 0.54], // Bottom Left Front (1)
            [0.94, -0.33, 0.54], // Bottom Right Front (2)
            [0, -0.33, -1.08] // Bottom Back (3)
        ];

        // Face definitions (F, L, R, B) - ALIGNED TO 2D NET FOLDING
        const faceConfigs = [
            { key: 'F', vertices: [v[0], v[1], v[2]], norm: [0, 0.2, 1] },     // V0=Top, V1=BLF, V2=BRF
            { key: 'L', vertices: [v[3], v[0], v[1]], norm: [-1, 0.2, -0.5] }, // V0=BB, V1=Top, V2=BLF
            { key: 'R', vertices: [v[0], v[3], v[2]], norm: [1, 0.2, -0.5] },  // V0=Top, V1=BB, V2=BRF
            { key: 'B', vertices: [v[1], v[2], v[3]], norm: [0, -1, 0] }       // V0=BLF, V1=BRF, V2=BB
        ];

        let visibleFaces = [];
        faceConfigs.forEach(face => {
            const n0 = this.project(0, 0, 0);
            const n1 = this.project(face.norm[0], face.norm[1], face.norm[2]);
            const normalZ = n1.z - n0.z;

            if (normalZ > 0) {
                let faceData = {
                    avgZ: normalZ,
                    stickers: []
                };

                const [p0, p1, p2] = face.vertices;
                const lerp3 = (b, v0, v1, v2) => [
                    v0[0]*b[0] + v1[0]*b[1] + v2[0]*b[2],
                    v0[1]*b[0] + v1[1]*b[1] + v2[1]*b[2],
                    v0[2]*b[0] + v1[2]*b[1] + v2[2]*b[2]
                ];

                for (let i = 0; i < 9; i++) {
                    const stickerMap = [
                        {r:0, c:0, d:false}, 
                        {r:1, c:0, d:false}, {r:1, c:0, d:true}, {r:1, c:1, d:false},
                        {r:2, c:0, d:false}, {r:2, c:0, d:true}, {r:2, c:1, d:false}, {r:2, c:1, d:true}, {r:2, c:2, d:false}
                    ];
                    const t = stickerMap[i];
                    const s = 1/3;
                    let pts3d = [];
                    const getP = (r, c) => lerp3([1-r*s, r*s-c*s, c*s], p0, p1, p2);
                    
                    if (!t.d) {
                        pts3d = [getP(t.r, t.c), getP(t.r+1, t.c), getP(t.r+1, t.c+1)];
                    } else {
                        pts3d = [getP(t.r, t.c), getP(t.r, t.c+1), getP(t.r+1, t.c+1)];
                    }

                    if (this.cube) {
                        const colorIndex = this.cube.faces[face.key][i];
                        const sticker = { color: colors[colorIndex], pts: pts3d.map(p => this.project(p[0], p[1], p[2])) };
                        const cx = sticker.pts.reduce((sum, p) => sum + p.x, 0) / 3;
                        const cy = sticker.pts.reduce((sum, p) => sum + p.y, 0) / 3;
                        sticker.pts = sticker.pts.map(p => ({ x: cx + (p.x - cx) * sc, y: cy + (p.y - cy) * sc }));
                        faceData.stickers.push(sticker);
                    }
                }

                visibleFaces.push(faceData);
            }
        });

        visibleFaces.sort((a, b) => a.avgZ - b.avgZ);

        let svgHtml = visibleFaces.map(f => {
            return f.stickers.map(s => `<path d="${this.getRoundedPath(s.pts, 0.2)}" fill="${s.color}" />`).join('');
        }).join('');

        this.svg.innerHTML = svgHtml;
    }
}

customElements.define('pyraminx-interactive-3d', PyraminxInteractive3D);
