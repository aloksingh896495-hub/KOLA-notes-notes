(function() {
    const canvas = document.getElementById('three-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 28);

    // ── Sphere geometry for particles ──
    const PARTICLE_COUNT = 1400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    const colorA = new THREE.Color(0x00ff88);
    const colorB = new THREE.Color(0x00ffee);
    const colorC = new THREE.Color(0x7c3aed);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const r = 22 + Math.random() * 14;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);

        const t = Math.random();
        const c = t < 0.5
            ? colorA.clone().lerp(colorB, t * 2)
            : colorB.clone().lerp(colorC, (t - 0.5) * 2);
        colors[i*3]   = c.r;
        colors[i*3+1] = c.g;
        colors[i*3+2] = c.b;
        sizes[i] = Math.random() * 2.2 + 0.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Inner orbit ring ──
    const ringGeo = new THREE.TorusGeometry(9, 0.02, 6, 120);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.12 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    const ring2Geo = new THREE.TorusGeometry(14, 0.015, 6, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x00ffee, transparent: true, opacity: 0.07 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);

    // ── Floating orbs ──
    const orbs = [];
    const orbData = [
        { r: 0.35, color: 0x00ff88, pos: [6, 3, 0],   speed: 0.012 },
        { r: 0.22, color: 0x00ffee, pos: [-5, -2, 2],  speed: 0.018 },
        { r: 0.45, color: 0x7c3aed, pos: [8, -5, -3],  speed: 0.009 },
        { r: 0.18, color: 0x00ff88, pos: [-8, 4, -1],  speed: 0.022 },
        { r: 0.30, color: 0x00ffee, pos: [0, 7, 2],    speed: 0.015 },
    ];

    orbData.forEach(d => {
        const g = new THREE.SphereGeometry(d.r, 16, 16);
        const m = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(...d.pos);
        scene.add(mesh);
        orbs.push({ mesh, speed: d.speed, phase: Math.random() * Math.PI * 2, origin: [...d.pos] });
    });

    // ── Mouse parallax ──
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => {
        mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ── Animation loop ──
    let clock = 0;
    function animate() {
        requestAnimationFrame(animate);
        clock += 0.006;

        // Rotate particle cloud
        points.rotation.y = clock * 0.06;
        points.rotation.x = Math.sin(clock * 0.04) * 0.1;

        // Rings
        ring.rotation.z  += 0.004;
        ring2.rotation.z -= 0.003;
        ring2.rotation.x += 0.001;

        // Orbs float
        orbs.forEach(o => {
            o.mesh.position.y = o.origin[1] + Math.sin(clock * o.speed * 80 + o.phase) * 1.2;
            o.mesh.position.x = o.origin[0] + Math.cos(clock * o.speed * 60 + o.phase) * 0.6;
        });

        // Camera parallax
        camera.position.x += (mouseX * 3 - camera.position.x) * 0.04;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.04;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
