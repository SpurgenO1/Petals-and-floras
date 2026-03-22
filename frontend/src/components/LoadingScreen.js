import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// Build a procedural 3D rose from petal meshes + stem + leaves
// ─────────────────────────────────────────────────────────────────────────────
function buildRose(scene) {
  const roseGroup = new THREE.Group();

  // ── Materials ──────────────────────────────────────────────────────────────
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xc0354e,
    emissive: new THREE.Color(0x7b1a2e),
    emissiveIntensity: 0.25,
    metalness: 0.15,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const innerPetalMat = new THREE.MeshStandardMaterial({
    color: 0xe8536d,
    emissive: new THREE.Color(0xc0354e),
    emissiveIntensity: 0.3,
    metalness: 0.1,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a2d,
    emissive: new THREE.Color(0x1a3d1a),
    emissiveIntensity: 0.2,
    metalness: 0.0,
    roughness: 0.8,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3a8a3a,
    emissive: new THREE.Color(0x1a4a1a),
    emissiveIntensity: 0.15,
    metalness: 0.0,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  // ── Helper: make one petal using a custom shape ────────────────────────────
  function makePetal(radiusX, radiusY, curlZ, segments = 12) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-radiusX * 0.5, radiusY * 0.3, -radiusX, radiusY * 0.8, 0, radiusY);
    shape.bezierCurveTo(radiusX, radiusY * 0.8, radiusX * 0.5, radiusY * 0.3, 0, 0);

    const extrudeSettings = {
      steps: segments,
      depth: 0.02,
      bevelEnabled: false,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Curl the petal by displacing vertices along Z based on Y position
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = y / radiusY;
      const curl = Math.sin(t * Math.PI) * curlZ;
      const flare = Math.pow(t, 0.5) * 0.15;
      pos.setZ(i, pos.getZ(i) + curl);
      pos.setX(i, pos.getX(i) * (1 + flare));
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ── Outermost petals (5 petals, large, open) ───────────────────────────────
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI * 0.1;
    const geo = makePetal(0.38, 0.72, 0.22);
    const mesh = new THREE.Mesh(geo, petalMat);
    mesh.rotation.z = angle;
    mesh.rotation.x = Math.PI * 0.38;
    mesh.position.set(
      Math.sin(angle) * 0.18,
      0.0,
      Math.cos(angle) * 0.18
    );
    roseGroup.add(mesh);
  }

  // ── Middle petals (5 petals, medium, semi-open) ────────────────────────────
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const geo = makePetal(0.28, 0.55, 0.3);
    const mesh = new THREE.Mesh(geo, petalMat);
    mesh.rotation.z = angle + Math.PI * 0.2;
    mesh.rotation.x = Math.PI * 0.28;
    mesh.position.set(
      Math.sin(angle) * 0.10,
      0.1,
      Math.cos(angle) * 0.10
    );
    roseGroup.add(mesh);
  }

  // ── Inner petals (5 petals, small, tight curl) ─────────────────────────────
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI * 0.08;
    const geo = makePetal(0.18, 0.38, 0.42);
    const mesh = new THREE.Mesh(geo, innerPetalMat);
    mesh.rotation.z = angle;
    mesh.rotation.x = Math.PI * 0.18;
    mesh.position.set(
      Math.sin(angle) * 0.05,
      0.22,
      Math.cos(angle) * 0.05
    );
    roseGroup.add(mesh);
  }

  // ── Innermost tiny petals (3 petals, spiral bud) ──────────────────────────
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const geo = makePetal(0.1, 0.22, 0.5);
    const mesh = new THREE.Mesh(geo, innerPetalMat);
    mesh.rotation.z = angle + Math.PI * 0.15;
    mesh.rotation.x = Math.PI * 0.1;
    mesh.position.set(
      Math.sin(angle) * 0.02,
      0.35,
      Math.cos(angle) * 0.02
    );
    roseGroup.add(mesh);
  }

  // ── Rosehip center (tiny sphere at base of petals) ────────────────────────
  const hipGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const hip = new THREE.Mesh(hipGeo, innerPetalMat);
  hip.position.y = 0.42;
  roseGroup.add(hip);

  // ── Stem ──────────────────────────────────────────────────────────────────
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(0.05, -0.4, 0.02),
    new THREE.Vector3(-0.03, -0.75, -0.02),
    new THREE.Vector3(0.02, -1.1, 0.01),
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 24, 0.035, 8, false);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  roseGroup.add(stem);

  // ── Leaf helper ───────────────────────────────────────────────────────────
  function makeLeaf(scaleX, scaleY) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-scaleX, scaleY * 0.4, -scaleX * 0.6, scaleY, 0, scaleY);
    shape.bezierCurveTo(scaleX * 0.6, scaleY, scaleX, scaleY * 0.4, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 12);
    // Slight curl
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / scaleY;
      pos.setZ(i, Math.sin(y * Math.PI) * 0.06);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Leaf 1
  const leaf1 = new THREE.Mesh(makeLeaf(0.22, 0.45), leafMat);
  leaf1.position.set(0.1, -0.45, 0);
  leaf1.rotation.z = -0.6;
  leaf1.rotation.y = 0.3;
  roseGroup.add(leaf1);

  // Leaf 2
  const leaf2 = new THREE.Mesh(makeLeaf(0.18, 0.38), leafMat);
  leaf2.position.set(-0.08, -0.72, 0);
  leaf2.rotation.z = 0.7;
  leaf2.rotation.y = -0.4;
  roseGroup.add(leaf2);

  // ── Scale & position ───────────────────────────────────────────────────────
  roseGroup.scale.setScalar(1.1);

  scene.add(roseGroup);
  return roseGroup;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Three.js hook
// ─────────────────────────────────────────────────────────────────────────────
function useThreeScene(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080e08);
    scene.fog = new THREE.FogExp2(0x080e08, 0.042);

    // ── Camera — high angle ──────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    camera.position.set(0, 20, 15);
    camera.lookAt(0, 0, 0);

    // ── Lights ────────────────────────────────────────────────────────────────
    const keyLight = new THREE.SpotLight(0xffd080, 5.5, 65, Math.PI / 4.5, 0.35, 1.4);
    keyLight.position.set(4, 24, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    scene.add(keyLight.target);

    const roseLight = new THREE.PointLight(0xff2244, 2.5, 12);
    roseLight.position.set(0, 6, 0); // follows rose in animate
    scene.add(roseLight);

    const fillLight = new THREE.PointLight(0xd4641e, 1.5, 45);
    fillLight.position.set(-7, -6, 5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x1a5a20, 2.5, 40);
    rimLight.position.set(0, 5, -14);
    scene.add(rimLight);

    scene.add(new THREE.AmbientLight(0x0c1a0c, 1.2));

    // Volumetric light shaft (fake cone)
    const shaftGeo = new THREE.CylinderGeometry(0.05, 4, 26, 32, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xd4a84b, transparent: true, opacity: 0.035,
      side: THREE.BackSide, depthWrite: false,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, 1, 0);
    scene.add(shaft);

    // ── Concentric rings — staircase funnel ───────────────────────────────────
    const RING_COUNT = 14;
    const rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const t = i / (RING_COUNT - 1);
      const radius = 1.2 + t * 8.0;
      const y = 4 - t * 12;
      const tube = 0.055 + t * 0.045;

      const geo = new THREE.TorusGeometry(radius, tube, 20, 130);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd4a84b,
        emissive: new THREE.Color(0xb8860b),
        emissiveIntensity: 0.05,
        metalness: 0.92,
        roughness: 0.2,
        transparent: true,
        opacity: 0.12 + (1 - t) * 0.72,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = y;
      scene.add(mesh);
      rings.push({ mesh, baseY: y, radius, index: i });
    }

    // Spoke lines
    const spokeCount = 8;
    for (let s = 0; s < spokeCount; s++) {
      const angle = (s / spokeCount) * Math.PI * 2;
      const pts = rings.map(r => new THREE.Vector3(
        Math.cos(angle) * r.radius, r.baseY, Math.sin(angle) * r.radius
      ));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xd4a84b, transparent: true, opacity: 0.14 });
      scene.add(new THREE.Line(geo, mat));
    }

    // ── Build rose ────────────────────────────────────────────────────────────
    const roseGroup = buildRose(scene);

    // ── Particle field ────────────────────────────────────────────────────────
    const PC = 400;
    const pp = new Float32Array(PC * 3);
    for (let i = 0; i < PC; i++) {
      const r = 2 + Math.random() * 11;
      const th = Math.random() * Math.PI * 2;
      pp[i * 3]     = Math.cos(th) * r;
      pp[i * 3 + 1] = -13 + Math.random() * 20;
      pp[i * 3 + 2] = Math.sin(th) * r;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xd4a84b, size: 0.055,
      transparent: true, opacity: 0.5, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Helix params ──────────────────────────────────────────────────────────
    const HELIX_R  = 0.9;
    const TURNS    = 3.5;
    const TOP_Y    = 11;
    const BOT_Y    = -9;
    const CYCLE    = 7.0; // seconds

    // ── Animate ───────────────────────────────────────────────────────────────
    let startTs = null;
    let raf;

    function animate(ts) {
      raf = requestAnimationFrame(animate);
      if (!startTs) startTs = ts;
      const t = (ts - startTs) / 1000;

      const prog = (t % CYCLE) / CYCLE;
      const angle = prog * Math.PI * 2 * TURNS;
      const y = TOP_Y - prog * (TOP_Y - BOT_Y);

      // Rose helix position
      roseGroup.position.set(
        Math.cos(angle) * HELIX_R,
        y,
        Math.sin(angle) * HELIX_R
      );
      // Rose spins on its own axis + gentle sway
      roseGroup.rotation.y = t * 1.8;
      roseGroup.rotation.x = Math.sin(t * 0.7) * 0.18;
      roseGroup.rotation.z = Math.cos(t * 0.5) * 0.1;

      // Rose point light follows
      roseLight.position.copy(roseGroup.position);
      roseLight.intensity = 1.8 + Math.sin(t * 3) * 0.5;

      // Ring pulse when rose passes
      rings.forEach(({ mesh, baseY, index }) => {
        const dist = Math.abs(roseGroup.position.y - baseY);
        const pulse = Math.max(0, 1 - dist * 0.45);
        mesh.material.emissiveIntensity = 0.04 + pulse * 0.55;
        mesh.rotation.z += 0.0015 * (index % 2 === 0 ? 1 : -1);
      });

      // Slow camera orbit
      const camA = t * 0.1;
      camera.position.set(Math.sin(camA) * 3.5, 20, 15 + Math.cos(camA) * 2.5);
      camera.lookAt(0, 1, 0);

      shaft.material.opacity = 0.028 + Math.sin(t * 2.2) * 0.008;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    function onResize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LoadingScreen({ visible }) {
  const canvasRef = useRef(null);
  useThreeScene(canvasRef);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 5000,
            background: "#080e08", overflow: "hidden",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          {/* Three.js canvas */}
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />

          {/* Bottom overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            style={{
              position: "absolute", bottom: "7%", left: 0, right: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem",
              zIndex: 10, pointerEvents: "none",
            }}
          >
            {/* Brand name */}
            <motion.div
              style={{
                color: "#f6e7b1",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 700, letterSpacing: "0.08em",
                textAlign: "center",
              }}
              animate={{ textShadow: [
                "0 0 20px rgba(212,168,75,0.35), 0 0 55px rgba(192,53,78,0.18)",
                "0 0 40px rgba(212,168,75,0.8),  0 0 90px rgba(192,53,78,0.42)",
                "0 0 20px rgba(212,168,75,0.35), 0 0 55px rgba(192,53,78,0.18)",
              ]}}
              transition={{ duration: 3.2, repeat: Infinity }}
            >
              Petals and Flora
            </motion.div>

            {/* Deco divider */}
            <motion.div
              style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.9 }}
            >
              <div style={{ width: 55, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,168,75,0.7))" }} />
              <motion.span
                style={{ fontSize: "0.9rem" }}
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              >🌹</motion.span>
              <div style={{ width: 55, height: 1, background: "linear-gradient(90deg,rgba(212,168,75,0.7),transparent)" }} />
            </motion.div>

            {/* Tagline */}
            <motion.div
              style={{
                color: "rgba(255,255,255,0.38)", fontSize: "0.68rem",
                letterSpacing: "0.44em", textTransform: "uppercase", fontWeight: 300,
              }}
              animate={{ opacity: [0.3, 0.68, 0.3] }}
              transition={{ duration: 3.5, repeat: Infinity }}
            >
              Blooming your moments
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              style={{ width: 200, height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}
            >
              <motion.div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg,#2d6a2d,#7b1a2e,#c0354e,#d4a84b,#f6e7b1)",
                  borderRadius: 2,
                  boxShadow: "0 0 12px 3px rgba(212,168,75,0.6)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: [0.4,0,0.2,1], delay: 0.8 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}