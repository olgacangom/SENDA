'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* =========================================================
   DETECTAR MODO OSCURO
========================================================= */
function useIsDark() {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

/* =========================================================
   PARTÍCULAS FLOTANTES 
========================================================= */
function FloatingParticles({ count = 140, color }: { count?: number; color: string }) {
    const pointsRef = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 7;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
        }
        return pos;
    }, [count]);

    useFrame((_, delta) => {
        if (!pointsRef.current) return;
        pointsRef.current.rotation.y += delta * 0.02;
        pointsRef.current.rotation.x += delta * 0.005;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.025} color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </points>
    );
}

/* =========================================================
   DESTELLOS SINÁPTICOS
========================================================= */
function SynapticSparks({ nodes, color }: { nodes: THREE.Vector3[]; color: string }) {
    const sparks = useRef<THREE.Mesh[]>([]);

    useEffect(() => {
        sparks.current = [];
    }, [nodes]);

    useFrame((_, delta) => {
        sparks.current.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity -= delta * 2;
            if (mat.opacity <= 0) {
                mat.opacity = 0;
            }
        });

        if (nodes.length > 0 && Math.random() < 0.08) {
            const idx = Math.floor(Math.random() * nodes.length);
            const pos = nodes[idx];

            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 8, 8),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            spark.position.copy(pos);
            sparks.current.push(spark);
        }
    });

    return (
        <group>
            {sparks.current.map((s, i) => (
                <primitive key={i} object={s} />
            ))}
        </group>
    );
}

/* =========================================================
   PARTÍCULAS CON TRAYECTORIA CURVA
========================================================= */
function CurvedParticles({ count = 25, color }: { count?: number; color: string }) {
    const particles = useRef<THREE.Mesh[]>([]);

    useEffect(() => {
        particles.current = [];
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 8, 8),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.5,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            mesh.userData = {
                t: Math.random() * Math.PI * 2,
                speed: 0.4 + Math.random() * 0.4,
                radius: 1.2 + Math.random() * 0.8,
            };
            particles.current.push(mesh);
        }
    }, [count, color]);

    useFrame((_, delta) => {
        particles.current.forEach((p) => {
            p.userData.t += delta * p.userData.speed;
            const t = p.userData.t;
            const r = p.userData.radius;

            p.position.set(
                Math.cos(t) * r,
                Math.sin(t * 0.7) * r * 0.5,
                Math.sin(t) * r
            );
        });
    });

    return (
        <group>
            {particles.current.map((p, i) => (
                <primitive key={i} object={p} />
            ))}
        </group>
    );
}

/* =========================================================
   RED NEURONAL SOBRE LA GEOMETRÍA DEL CEREBRO
========================================================= */
function NeuralNetworkOnGeometry({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
    const { points, lines } = useMemo(() => {
        const posAttr = geometry.attributes.position;
        const pts: THREE.Vector3[] = [];
        
        for (let i = 0; i < 220; i++) {
            const index = Math.floor(Math.random() * posAttr.count);
            pts.push(new THREE.Vector3(
                posAttr.getX(index), 
                posAttr.getY(index), 
                posAttr.getZ(index)
            ));
        }

        const segs: number[] = [];
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dist = pts[i].distanceTo(pts[j]);
                if (dist < 0.32) {
                    segs.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
                }
            }
        }

        return { points: pts, lines: new Float32Array(segs) };
    }, [geometry]);

    return (
        <group>
            {lines.length > 0 && (
                <lineSegments>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" count={lines.length / 3} array={lines} itemSize={3} />
                    </bufferGeometry>
                    <lineBasicMaterial color={color} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                </lineSegments>
            )}
            {points.map((pos, i) => (
                <mesh key={`node-${i}`} position={pos}>
                    <sphereGeometry args={[0.012, 6, 6]} />
                    <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.8} />
                </mesh>
            ))}
            <SynapticSparks nodes={points} color={color} />
        </group>
    );
}

/* =========================================================
   MODELO DEL CEREBRO PRINCIPAL (PLIEGUES RESALTADOS)
========================================================= */
function BrainModel({ isDark }: { isDark: boolean }) {
    const { scene } = useGLTF('/models/brain (1).glb');
    const ref = useRef<THREE.Group>(null);
    const brainScale = 0.40;

    const neonColor = isDark ? '#72DF9F' : '#2D8A56';

    useEffect(() => {
        const meshesToRemove: THREE.Mesh[] = [];

        scene.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const name = mesh.name.toLowerCase();
            
            if (['plane', 'background', 'floor', 'ground', 'cube', 'stage', 'box', 'sphere', 'circle', 'backdrop'].some(k => name.includes(k))) {
                meshesToRemove.push(mesh);
                return;
            }
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);
            if (Math.max(size.x, size.y, size.z) > 3) {
                meshesToRemove.push(mesh);
                return;
            }

            mesh.visible = true;
            
            mesh.material = new THREE.MeshStandardMaterial({ 
                color: isDark ? '#E0CAD8' : '#BDA2B6', //color brain
                emissive: isDark ? '#145336' : '#5fb380',
                emissiveIntensity: isDark ? 0.4 : 0.3,
                roughness: 0.45, 
                metalness: 0.2,
                wireframe: false,
                transparent: true,
                opacity: isDark ? 0.92 : 0.95,
                depthWrite: true,
                depthTest: true,
                side: THREE.DoubleSide,
            });
        });

        meshesToRemove.forEach(mesh => mesh.parent?.remove(mesh));
    }, [scene, isDark]);

    const brainGeometry = useMemo(() => {
        let mainGeo: THREE.BufferGeometry | null = null;
        let maxV = 0;
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && mesh.geometry && mesh.geometry.attributes.position) {
                if (mesh.geometry.attributes.position.count > maxV) {
                    maxV = mesh.geometry.attributes.position.count;
                    mainGeo = mesh.geometry;
                }
            }
        });
        return mainGeo;
    }, [scene]);

    useFrame((_, delta) => {
        if (!ref.current) return;
        ref.current.rotation.y += delta * 0.2;
    });

    return (
        <group ref={ref} scale={brainScale} position={[0, -0.1, 0]}>
            <primitive object={scene} scale={1} position={[0, 0, 0]} />
            
            {brainGeometry && <NeuralNetworkOnGeometry geometry={brainGeometry} color={neonColor} />}

            <CurvedParticles count={25} color={neonColor} />
        </group>
    );
}

/* =========================================================
   BRAIN 3D CONTAINER (Iluminación lateral para marcar surcos)
========================================================= */
export function Brain3D() {
    const isDark = useIsDark();
    const neonColor = isDark ? '#72DF9F' : '#2D8A56';

    return (
        <div className="absolute inset-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 4.5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            >
                {/* Iluminación direccional lateral agresiva para generar sombras profundas en los surcos */}
                <ambientLight intensity={isDark ? 0.6 : 0.9} />
                <directionalLight position={[4, 6, 4]} intensity={2.2} />
                <directionalLight position={[-4, -2, -4]} intensity={0.8} color={isDark ? '#72DF9F' : '#458a60'} />
                <pointLight position={[0, 3, 3]} intensity={1.5} color={neonColor} />

                <Suspense fallback={null}>
                    <BrainModel isDark={isDark} />
                </Suspense>

                <FloatingParticles count={130} color={neonColor} />
            </Canvas>
        </div>
    );
}

useGLTF.preload('/models/brain (1).glb');