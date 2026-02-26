/**
 * 3D Robot Viewer using Three.js and React Three Fiber
 */

import { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import URDFLoader from 'urdf-loader';
import { useSessionStore, selectWorkspacePoints, selectShowWorkspace, selectWorkspaceColor, selectWorkspacePointSize, selectWorkspaceBoundary, selectShowWorkspaceMesh, selectWorkspaceMeshColor, selectWorkspaceMeshOpacity } from '../../stores/sessionStore';
import { useFrame } from '@react-three/fiber';

function RotatingWireframe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <group position={[0, 1, 0]}>
      <group ref={groupRef}>
        <mesh>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial
            color="#3b82f6"
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color="#60a5fa"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      </group>
      <Html center position={[0, -1.5, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
            Upload a robot to begin
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            ZIP file containing URDF + mesh files
          </div>
        </div>
      </Html>
    </group>
  );
}

function RobotModel({ sessionId }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const [robot, setRobot] = useState<any>(null);
  const [joints, setJoints] = useState<any[]>([]);

  const robotInfo = useSessionStore(state => state.robotInfo);

  useEffect(() => {
    if (!sessionId || !robotInfo || !robotInfo.urdfContent) return;

    // Load URDF from the local string
    const loader = new URDFLoader();

    // Override the mesh loader to use our locally zipped Blobs
    const objectUrls: string[] = [];
    loader.loadMeshCb = (path: string, manager: any, done: any) => {
      let finalUrl = path;
      let ext = '';

      if (robotInfo.meshFiles) {
        // Find a matching blob by seeing if the ZIP path ends with the URDF path (or vice versa)
        const matchingKey = Object.keys(robotInfo.meshFiles).find(key =>
          path.endsWith(key) || key.endsWith(path.replace('package://', ''))
        );

        if (matchingKey) {
          const blob = robotInfo.meshFiles[matchingKey];
          finalUrl = URL.createObjectURL(blob);
          objectUrls.push(finalUrl); // Save URL to revoke later
          ext = matchingKey.split('.').pop()?.toLowerCase() || '';
        } else {
          console.warn(`Could not find local mesh for: ${path}`);
        }
      }

      // If we didn't map a local blob, try letting the default loader handle it
      if (!ext) {
        loader.defaultMeshLoader(finalUrl, manager, done);
        return;
      }

      // Manually parse since defaultMeshLoader relies on the file extension string
      // which our blob URL (blob:http://...) lacks.
      if (ext === 'stl') {
        const stlLoader = new STLLoader(manager);
        stlLoader.load(finalUrl, (geom) => {
          const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
          done(mesh);
        });
      } else if (ext === 'dae') {
        const colladaLoader = new ColladaLoader(manager);
        colladaLoader.load(finalUrl, (dae) => {
          done(dae.scene);
        });
      } else {
        console.warn(`URDFLoader: Unsupported local mesh extension .${ext} for ${path}`);
        done(null);
      }
    };

    try {
      console.log('Loading local URDF into viewer...');
      const robotModel = loader.parse(robotInfo.urdfContent) as any;
      console.log('✅ Robot loaded successfully!', robotModel);

      // URDF uses Z-up, Three.js uses Y-up — rotate to correct orientation
      robotModel.rotation.x = -Math.PI / 2;

      setRobot(robotModel);

      // Extract joints from urdf-loader's joints dictionary
      const jointList: any[] = [];
      if (robotModel.joints) {
        Object.values(robotModel.joints).forEach((joint: any) => {
          // Skip fixed joints — they can't be moved
          if (joint.jointType !== 'fixed') {
            jointList.push(joint);
          }
        });
      }
      setJoints(jointList);
      console.log(`✅ Extracted ${jointList.length} joints:`, jointList.map((j: any) => j.name));
    } catch (error) {
      console.error('❌ Error parsing URDF:', error);
    }

    // Cleanup Object URLs when unmounted or robot changes
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };

  }, [sessionId, robotInfo]);

  // Update joint positions via Zustand's transient subscription to avoid heavy React re-renders
  useEffect(() => {
    if (!robot || joints.length === 0) return;

    // Set initial values
    const state = useSessionStore.getState();
    if (state.jointPositions) {
      joints.forEach((joint, index) => {
        if (state.jointPositions[index] !== undefined && joint.setJointValue) {
          joint.setJointValue(state.jointPositions[index]);
        }
      });
    }

    const unsubscribe = useSessionStore.subscribe((newState) => {
      if (newState.jointPositions) {
        joints.forEach((joint, index) => {
          if (newState.jointPositions[index] !== undefined && joint.setJointValue) {
            joint.setJointValue(newState.jointPositions[index]);
          }
        });
      }
    });

    return unsubscribe;
  }, [robot, joints]);

  if (!robot) {
    return null;
  }

  return (
    <primitive object={robot} ref={groupRef} />
  );
}

// Workspace point cloud component
interface WorkspacePointsProps {
  points: number[][];
  color: string;
  size: number;
}

function WorkspacePoints({ points, color, size }: WorkspacePointsProps) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const [x, y, z] = points[i];
      // Transform from Pinocchio (Z-up) to Three.js (Y-up)
      positions[i * 3] = x;
      positions[i * 3 + 1] = z;
      positions[i * 3 + 2] = -y;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [points]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={size}
        color={color}
        sizeAttenuation={true}
        transparent
        opacity={0.6}
      />
    </points>
  );
}

// Workspace boundary mesh component
interface WorkspaceMeshProps {
  vertices: number[];
  faces: number[];
  color: string;
  opacity: number;
}

function WorkspaceMesh({ vertices, faces, color, opacity }: WorkspaceMeshProps) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // Transform vertices from Pinocchio (Z-up) to Three.js (Y-up)
    const positions = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length / 3; i++) {
      const x = vertices[i * 3];
      const y = vertices[i * 3 + 1];
      const z = vertices[i * 3 + 2];
      positions[i * 3] = x;
      positions[i * 3 + 1] = z;
      positions[i * 3 + 2] = -y;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(faces);
    geom.computeVertexNormals();
    return geom;
  }, [vertices, faces]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function ViewerScene() {
  const sessionId = useSessionStore(state => state.sessionId);
  const workspacePoints = useSessionStore(selectWorkspacePoints);
  const showWorkspace = useSessionStore(selectShowWorkspace);
  const workspaceColor = useSessionStore(selectWorkspaceColor);
  const workspacePointSize = useSessionStore(selectWorkspacePointSize);
  const workspaceBoundary = useSessionStore(selectWorkspaceBoundary);
  const showWorkspaceMesh = useSessionStore(selectShowWorkspaceMesh);
  const workspaceMeshColor = useSessionStore(selectWorkspaceMeshColor);
  const workspaceMeshOpacity = useSessionStore(selectWorkspaceMeshOpacity);

  if (!sessionId) {
    return (
      <group>
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#3b82f6"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#1e40af"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <RotatingWireframe />
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} />
      </group>
    );
  }

  return (
    <group>
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#3b82f6"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#1e40af"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <RobotModel
        sessionId={sessionId}
      />
      {showWorkspace && workspacePoints && workspacePoints.length > 0 && (
        <WorkspacePoints points={workspacePoints} color={workspaceColor!} size={workspacePointSize!} />
      )}
      {showWorkspaceMesh && workspaceBoundary?.vertices && workspaceBoundary?.faces && (
        <WorkspaceMesh
          vertices={workspaceBoundary.vertices}
          faces={workspaceBoundary.faces}
          color={workspaceMeshColor!}
          opacity={workspaceMeshOpacity!}
        />
      )}
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} />
      <Environment preset="city" background={false} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

export function RobotViewer() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
        <Suspense fallback={<LoadingFallback />}>
          <ViewerScene />
        </Suspense>
        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 1.5}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}

export default RobotViewer;
