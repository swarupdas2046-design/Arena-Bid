import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Environment } from '@react-three/drei';

const AnimatedShape = () => {
    const meshRef = useRef();

    useFrame((state, delta) => {
        meshRef.current.rotation.x += delta * 0.2;
        meshRef.current.rotation.y += delta * 0.3;
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[2, 0]} />
                <MeshDistortMaterial 
                    color="#FF3B00" 
                    emissive="#CCFF00"
                    emissiveIntensity={0.2}
                    envMapIntensity={1} 
                    clearcoat={1} 
                    clearcoatRoughness={0.1} 
                    metalness={0.8}
                    roughness={0.2}
                    distort={0.4}
                    speed={2}
                />
            </mesh>
        </Float>
    );
};

const Hero3D = () => {
    return (
        <div className="w-full h-[300px] md:h-[400px] relative pointer-events-none md:pointer-events-auto mt-4 mb-12 brutal-card overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <h2 className="text-4xl md:text-6xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-electric to-acid mix-blend-difference opacity-80 uppercase tracking-widest text-center">
                    The Arena<br/>Is Live
                </h2>
            </div>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#FF3B00" />
                <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#CCFF00" />
                <AnimatedShape />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

export default Hero3D;
