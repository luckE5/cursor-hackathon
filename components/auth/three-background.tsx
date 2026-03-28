"use client";

import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./auth.module.css";

/**
 * Full-viewport Three.js scene — lazy-loaded on auth + marketing.
 * Kept lightweight: single init in useEffect, full cleanup on unmount.
 */
function ThreeBackgroundInner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0xf8faff, 0.012);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 1.5, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf8faff, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 5, 3);
    scene.add(mainLight);
    const backLight = new THREE.PointLight(0xaaccff, 0.5);
    backLight.position.set(-2, 1, -4);
    scene.add(backLight);
    const fillLight = new THREE.PointLight(0xffccaa, 0.4);
    fillLight.position.set(3, 2, 4);
    scene.add(fillLight);

    const knotGeo = new THREE.TorusKnotGeometry(1.2, 0.28, 180, 24, 3, 4);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x4a6fa5,
      emissive: 0xc8e0ff,
      roughness: 0.4,
      metalness: 0.3,
      emissiveIntensity: 0.3,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    scene.add(knot);

    const innerRingGeo = new THREE.TorusGeometry(1.6, 0.05, 64, 200);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x7c9fd0,
      emissive: 0x2a5298,
      emissiveIntensity: 0.2,
    });
    const ring = new THREE.Mesh(innerRingGeo, ringMat);
    scene.add(ring);

    const particleCount = 1000;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 4;
    }
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0x6a8cbf,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particlesGeometry, particleMat);
    scene.add(particleSystem);

    const orbGroup = new THREE.Group();
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x8aabff,
      emissive: 0x5c7cfa,
      emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 40; i++) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        orbMat,
      );
      sphere.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8 - 2,
      );
      orbGroup.add(sphere);
    }
    scene.add(orbGroup);

    const lineDisposables: THREE.Line[] = [];
    for (let i = 0; i < 300; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 10 - 2,
      );
      const p2 = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 10 - 2,
      );
      if (p1.distanceTo(p2) < 3.2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x9bb6ff,
          transparent: true,
          opacity: 0.25,
        });
        const lineObj = new THREE.Line(lineGeo, lineMat);
        scene.add(lineObj);
        lineDisposables.push(lineObj);
      }
    }

    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    for (let i = 0; i < 800; i++) {
      starPos.push((Math.random() - 0.5) * 200);
      starPos.push((Math.random() - 0.5) * 100);
      starPos.push((Math.random() - 0.5) * 70 - 30);
    }
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(starPos), 3),
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xcad6ff,
      size: 0.07,
      transparent: true,
      opacity: 0.4,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    let time = 0;
    let raf = 0;

    function animate() {
      raf = requestAnimationFrame(animate);
      time += 0.008;
      knot.rotation.x = time * 0.4;
      knot.rotation.y = time * 0.7;
      knot.rotation.z = time * 0.3;
      ring.rotation.x = time * 0.2;
      ring.rotation.y = time * 0.5;
      particleSystem.rotation.y = time * 0.05;
      orbGroup.rotation.y = time * 0.1;
      stars.rotation.y = time * 0.02;
      camera.position.x += (0 - camera.position.x) * 0.02;
      camera.lookAt(0, 0.5, 0);
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    function onMouseMove(e: MouseEvent) {
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      knot.rotation.x += (mouseY * 0.02 - knot.rotation.x) * 0.05;
      knot.rotation.y += (mouseX * 0.03 - knot.rotation.y) * 0.05;
    }
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      knotGeo.dispose();
      knotMat.dispose();
      innerRingGeo.dispose();
      ringMat.dispose();
      particlesGeometry.dispose();
      particleMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      orbMat.dispose();
      orbGroup.children.forEach((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
        }
      });
      lineDisposables.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.authCanvasWrap} aria-hidden />
  );
}

export const ThreeBackground = memo(ThreeBackgroundInner);
