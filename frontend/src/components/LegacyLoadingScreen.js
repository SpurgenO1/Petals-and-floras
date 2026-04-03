import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

function buildRose(scene) {
  const roseGroup = new THREE.Group();

  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xc0354e,
    emissive: new THREE.Color(0x7b1a2e),
    emissiveIntensity: 0.2,
    metalness: 0.1,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const innerPetalMat = new THREE.MeshStandardMaterial({
    color: 0xe8536d,
    emissive: new THREE.Color(0xc0354e),
    emissiveIntensity: 0.24,
    metalness: 0.08,
    roughness: 0.54,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a2d,
    emissive: new THREE.Color(0x1a3d1a),
    emissiveIntensity: 0.15,
    roughness: 0.84,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3a8a3a,
    emissive: new THREE.Color(0x1a4a1a),
    emissiveIntensity: 0.12,
    roughness: 0.74,
    side: THREE.DoubleSide,
  });

  function makePetal(radiusX, radiusY, curlZ, segments = 8) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-radiusX * 0.5, radiusY * 0.3, -radiusX, radiusY * 0.8, 0, radiusY);
    shape.bezierCurveTo(radiusX, radiusY * 0.8, radiusX * 0.5, radiusY * 0.3, 0, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: segments,
      depth: 0.02,
      bevelEnabled: false,
    });

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      const t = y / radiusY;
      const curl = Math.sin(t * Math.PI) * curlZ;
      const flare = Math.pow(t, 0.5) * 0.12;
      pos.setZ(i, pos.getZ(i) + curl);
      pos.setX(i, pos.getX(i) * (1 + flare));
    }
    geo.computeVertexNormals();
    return geo;
  }

  const layers = [
    { count: 5, radiusX: 0.38, radiusY: 0.72, curlZ: 0.22, offset: 0.18, y: 0, rotationX: Math.PI * 0.38, material: petalMat, angleOffset: Math.PI * 0.1 },
    { count: 5, radiusX: 0.28, radiusY: 0.55, curlZ: 0.3, offset: 0.1, y: 0.1, rotationX: Math.PI * 0.28, material: petalMat, angleOffset: Math.PI * 0.2 },
    { count: 5, radiusX: 0.18, radiusY: 0.38, curlZ: 0.42, offset: 0.05, y: 0.22, rotationX: Math.PI * 0.18, material: innerPetalMat, angleOffset: Math.PI * 0.08 },
    { count: 3, radiusX: 0.1, radiusY: 0.22, curlZ: 0.5, offset: 0.02, y: 0.35, rotationX: Math.PI * 0.1, material: innerPetalMat, angleOffset: Math.PI * 0.15 },
  ];

  layers.forEach(({ count, radiusX, radiusY, curlZ, offset, y, rotationX, material, angleOffset }) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + angleOffset;
      const mesh = new THREE.Mesh(makePetal(radiusX, radiusY, curlZ), material);
      mesh.rotation.z = angle;
      mesh.rotation.x = rotationX;
      mesh.position.set(Math.sin(angle) * offset, y, Math.cos(angle) * offset);
      roseGroup.add(mesh);
    }
  });

  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), innerPetalMat);
  hip.position.y = 0.42;
  roseGroup.add(hip);

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(0.05, -0.4, 0.02),
    new THREE.Vector3(-0.03, -0.75, -0.02),
    new THREE.Vector3(0.02, -1.1, 0.01),
  ]);
  roseGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 18, 0.035, 7, false), stemMat));

  function makeLeaf(scaleX, scaleY) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-scaleX, scaleY * 0.4, -scaleX * 0.6, scaleY, 0, scaleY);
    shape.bezierCurveTo(scaleX * 0.6, scaleY, scaleX, scaleY * 0.4, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i) / scaleY;
      pos.setZ(i, Math.sin(y * Math.PI) * 0.05);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const leaf1 = new THREE.Mesh(makeLeaf(0.22, 0.45), leafMat);
  leaf1.position.set(0.1, -0.45, 0);
  leaf1.rotation.z = -0.6;
  leaf1.rotation.y = 0.3;
  roseGroup.add(leaf1);

  const leaf2 = new THREE.Mesh(makeLeaf(0.18, 0.38), leafMat);
  leaf2.position.set(-0.08, -0.72, 0);
  leaf2.rotation.z = 0.7;
  leaf2.rotation.y = -0.4;
  roseGroup.add(leaf2);

  roseGroup.scale.setScalar(1.05);
  scene.add(roseGroup);
  return roseGroup;
}

function useThreeScene(canvasRef, enabled) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080e08);
    scene.fog = new THREE.FogExp2(0x080e08, 0.04);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    camera.position.set(0, 20, 15);
    camera.lookAt(0, 0, 0);

    const keyLight = new THREE.SpotLight(0xffd080, 4.2, 65, Math.PI / 4.5, 0.35, 1.4);
    keyLight.position.set(4, 24, 8);
    scene.add(keyLight);
    scene.add(keyLight.target);

    const roseLight = new THREE.PointLight(0xff2244, 1.8, 10);
    roseLight.position.set(0, 6, 0);
    scene.add(roseLight);

    const fillLight = new THREE.PointLight(0xd4641e, 1.1, 38);
    fillLight.position.set(-7, -6, 5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x1a5a20, 1.8, 32);
    rimLight.position.set(0, 5, -14);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0x0c1a0c, 1.05));

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 4, 24, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xd4a84b,
        transparent: true,
        opacity: 0.028,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shaft.position.set(0, 1, 0);
    scene.add(shaft);

    const rings = [];
    const ringCount = 8;
    for (let i = 0; i < ringCount; i += 1) {
      const t = i / (ringCount - 1);
      const radius = 1.2 + t * 7.5;
      const y = 4 - t * 11;
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.055 + t * 0.035, 12, 72),
        new THREE.MeshStandardMaterial({
          color: 0xd4a84b,
          emissive: new THREE.Color(0xb8860b),
          emissiveIntensity: 0.04,
          metalness: 0.88,
          roughness: 0.24,
          transparent: true,
          opacity: 0.16 + (1 - t) * 0.56,
        })
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = y;
      scene.add(mesh);
      rings.push({ mesh, baseY: y, radius, index: i });
    }

    const spokeCount = 6;
    for (let s = 0; s < spokeCount; s += 1) {
      const angle = (s / spokeCount) * Math.PI * 2;
      const points = rings.map((ring) => new THREE.Vector3(
        Math.cos(angle) * ring.radius,
        ring.baseY,
        Math.sin(angle) * ring.radius
      ));
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0xd4a84b, transparent: true, opacity: 0.12 })
        )
      );
    }

    const roseGroup = buildRose(scene);

    const particleCount = 160;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 2 + Math.random() * 11;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = -13 + Math.random() * 20;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({
        color: 0xd4a84b,
        size: 0.05,
        transparent: true,
        opacity: 0.42,
        sizeAttenuation: true,
      })
    );
    scene.add(particles);

    const helixRadius = 0.9;
    const turns = 3.5;
    const topY = 11;
    const bottomY = -9;
    const cycle = 7;

    let startTs = null;
    let raf = 0;

    const animate = (ts) => {
      raf = window.requestAnimationFrame(animate);
      if (!startTs) {
        startTs = ts;
      }
      const t = (ts - startTs) / 1000;
      const progress = (t % cycle) / cycle;
      const angle = progress * Math.PI * 2 * turns;
      const y = topY - progress * (topY - bottomY);

      roseGroup.position.set(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
      roseGroup.rotation.y = t * 1.6;
      roseGroup.rotation.x = Math.sin(t * 0.7) * 0.14;
      roseGroup.rotation.z = Math.cos(t * 0.5) * 0.08;

      roseLight.position.copy(roseGroup.position);
      roseLight.intensity = 1.5 + Math.sin(t * 3) * 0.35;

      rings.forEach(({ mesh, baseY, index }) => {
        const pulse = Math.max(0, 1 - Math.abs(roseGroup.position.y - baseY) * 0.45);
        mesh.material.emissiveIntensity = 0.03 + pulse * 0.34;
        mesh.rotation.z += 0.0009 * (index % 2 === 0 ? 1 : -1);
      });

      const cameraAngle = t * 0.08;
      camera.position.set(Math.sin(cameraAngle) * 2.6, 20, 15 + Math.cos(cameraAngle) * 1.8);
      camera.lookAt(0, 1, 0);
      shaft.material.opacity = 0.022 + Math.sin(t * 2.1) * 0.006;

      renderer.render(scene, camera);
    };

    const onResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    window.addEventListener("resize", onResize);
    raf = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [canvasRef, enabled]);
}

export default function LegacyLoadingScreen({ visible, enabled = true }) {
  const canvasRef = useRef(null);
  useThreeScene(canvasRef, enabled && visible);

  return (
    <AnimatePresence>
      {visible && enabled ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: "#080e08",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            aria-hidden="true"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
