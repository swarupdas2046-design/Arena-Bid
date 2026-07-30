import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

const AnimatedShape = () => {
    const meshRef = useRef();
    useFrame((state, delta) => {
        meshRef.current.rotation.x += delta * 0.4;
        meshRef.current.rotation.y += delta * 0.5;
    });
    return (
        <Float speed={3} rotationIntensity={1.5} floatIntensity={2}>
            <mesh ref={meshRef}>
                <torusKnotGeometry args={[1, 0.3, 100, 16]} />
                <MeshDistortMaterial 
                    color="#FF3B00" 
                    emissive="#CCFF00"
                    emissiveIntensity={0.2}
                    clearcoat={1} 
                    metalness={0.9}
                    roughness={0.1}
                    distort={0.3}
                    speed={3}
                />
            </mesh>
        </Float>
    );
};

const Mini3DLogo = ({ size = "w-24 h-24" }) => {
    return (
        <div className={`${size} relative pointer-events-none drop-shadow-[0_0_15px_rgba(255,59,0,0.5)]`}>
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} color="#FF3B00" />
                <directionalLight position={[-5, -5, -5]} intensity={0.5} color="#CCFF00" />
                <AnimatedShape />
            </Canvas>
        </div>
    );
};

export default Mini3DLogo;
