"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Grid, Line, OrbitControls, Outlines, RoundedBox } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  Building2,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ScanLine
} from "lucide-react";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  SRGBColorSpace
} from "three";

export type OperationalTwinArea = {
  code: string;
  name: string;
  plantCode: string;
  plantName: string;
  total: number;
  open: number;
  pending: number;
  overdue: number;
  closed: number;
};

type OperationalTwin3DProps = {
  areas: OperationalTwinArea[];
  selectedArea: string | null;
  selectedPlant: string;
  onSelectArea: (areaCode: string | null) => void;
  onSelectPlant: (plantCode: string) => void;
};

type HealthStyle = {
  color: string;
  soft: string;
  label: string;
};

type VectorTuple = [number, number, number];

const healthStyles = {
  risk: { color: "#ef233c", soft: "#3d1119", label: "Compromiso vencido" },
  attention: { color: "#f2b134", soft: "#3b2b0b", label: "Requiere atención" },
  healthy: { color: "#20d499", soft: "#0d3028", label: "Flujo estable" },
  idle: { color: "#7f8998", soft: "#252a31", label: "Sin movimiento" }
} satisfies Record<string, HealthStyle>;

function areaHealth(area: Pick<OperationalTwinArea, "total" | "open" | "pending" | "overdue">) {
  if (area.overdue > 0) return healthStyles.risk;
  if (area.pending > 0 || area.open > 0) return healthStyles.attention;
  if (area.total > 0) return healthStyles.healthy;
  return healthStyles.idle;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function LabelSprite({ title, subtitle, position, scale = [3.1, 0.78, 1] }: { title: string; subtitle?: string; position: VectorTuple; scale?: VectorTuple }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(5, 7, 10, 0.9)";
      context.strokeStyle = "rgba(255, 255, 255, 0.22)";
      context.lineWidth = 5;
      context.beginPath();
      context.roundRect(7, 7, 1010, 242, 26);
      context.fill();
      context.stroke();

      const fit = (text: string, maximum: number, preferred: number) => {
        let size = preferred;
        context.font = `900 ${size}px Arial`;
        while (context.measureText(text).width > maximum && size > 32) {
          size -= 2;
          context.font = `900 ${size}px Arial`;
        }
        return size;
      };

      const titleSize = fit(title, 910, subtitle ? 74 : 92);
      context.fillStyle = "#ffffff";
      context.font = `900 ${titleSize}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(title, 512, subtitle ? 94 : 128);

      if (subtitle) {
        const subtitleSize = fit(subtitle, 900, 42);
        context.fillStyle = "#aeb8c6";
        context.font = `700 ${subtitleSize}px Arial`;
        context.fillText(subtitle, 512, 174);
      }
    }

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    result.needsUpdate = true;
    return result;
  }, [title, subtitle]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function StatusBeacon({ color, paused, position }: { color: string; paused: boolean; position: VectorTuple }) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current || paused) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.12;
    group.current.scale.setScalar(pulse);
  });

  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={2.2} distance={2.4} decay={2} />
    </group>
  );
}

function RotatingMachine({ paused, variant }: { paused: boolean; variant: number }) {
  const rotor = useRef<Group>(null);

  useFrame((_, delta) => {
    if (rotor.current && !paused) rotor.current.rotation.y += delta * (0.65 + variant * 0.08);
  });

  if (variant % 3 === 1) {
    return (
      <group>
        <mesh castShadow position={[-0.28, 0.54, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.78, 24]} />
          <meshStandardMaterial color="#aeb7c3" metalness={0.82} roughness={0.24} />
        </mesh>
        <mesh castShadow position={[0.28, 0.42, 0.1]}>
          <cylinderGeometry args={[0.21, 0.24, 0.56, 24]} />
          <meshStandardMaterial color="#65717f" metalness={0.85} roughness={0.2} />
        </mesh>
        <Line color="#ea0029" lineWidth={2} points={[[-0.28, 0.87, 0], [-0.28, 1.08, 0], [0.28, 1.08, 0], [0.28, 0.72, 0.1]]} />
      </group>
    );
  }

  if (variant % 3 === 2) {
    return (
      <group ref={rotor} position={[0, 0.48, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.14, 0.2, 0.65, 20]} />
          <meshStandardMaterial color="#4f5966" metalness={0.86} roughness={0.28} />
        </mesh>
        {[0, 1, 2].map((index) => (
          <mesh castShadow key={index} position={[Math.cos((index * Math.PI * 2) / 3) * 0.28, 0.28, Math.sin((index * Math.PI * 2) / 3) * 0.28]} rotation={[0, -((index * Math.PI * 2) / 3), 0]}>
            <boxGeometry args={[0.48, 0.08, 0.13]} />
            <meshStandardMaterial color="#d8dde4" metalness={0.78} roughness={0.22} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.76, 0.62, 0.62]} />
        <meshStandardMaterial color="#596471" metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.54, 0.13, 0.7]} />
        <meshStandardMaterial color="#ea0029" emissive="#5c0010" emissiveIntensity={0.85} metalness={0.6} roughness={0.2} />
      </mesh>
      <group ref={rotor} position={[0, 0.42, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.16, 0.035, 10, 24]} />
          <meshStandardMaterial color="#eef1f5" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.34, 0.035, 0.035]} />
          <meshStandardMaterial color="#eef1f5" metalness={0.9} roughness={0.18} />
        </mesh>
      </group>
    </group>
  );
}

function AreaModule({ area, index, position, paused, selected, onHover, onSelect }: {
  area: OperationalTwinArea;
  index: number;
  position: VectorTuple;
  paused: boolean;
  selected: boolean;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const style = areaHealth(area);
  const base = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!base.current || paused || !selected) return;
    base.current.position.y = 0.36 + Math.sin(clock.elapsedTime * 2.2) * 0.045;
  });

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(area.code);
  };
  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "auto";
    onHover(null);
  };

  return (
    <group
      position={position}
      onClick={(event) => { event.stopPropagation(); onSelect(area.code); }}
      onPointerOut={leave}
      onPointerOver={enter}
    >
      {selected ? (
        <mesh position={[0, 2.25, 0]}>
          <cylinderGeometry args={[0.42, 0.78, 3.9, 32, 1, true]} />
          <meshBasicMaterial color={style.color} transparent opacity={0.075} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      ) : null}
      <RoundedBox ref={base} args={[1.82, 0.46, 1.56]} position={[0, 0.36, 0]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={selected ? "#202732" : "#151a21"} emissive={style.soft} emissiveIntensity={selected ? 1.45 : 0.6} metalness={0.62} roughness={0.35} />
        {selected ? <Outlines thickness={0.055} color="#ffffff" /> : <Outlines thickness={0.025} color={style.color} />}
      </RoundedBox>
      <mesh position={[0, 0.61, 0]} receiveShadow>
        <boxGeometry args={[1.58, 0.035, 1.32]} />
        <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.1} metalness={0.52} roughness={0.28} />
      </mesh>
      <RotatingMachine paused={paused} variant={index} />
      <StatusBeacon color={style.color} paused={paused} position={[0.66, 1.18, -0.48]} />
      <LabelSprite title={area.code} subtitle={area.name} position={[0, 1.75, 0]} scale={[2.25, 0.56, 1]} />
    </group>
  );
}

function ProductionCrate({ color, length, paused, phase, positionZ }: { color: string; length: number; paused: boolean; phase: number; positionZ: number }) {
  const crate = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!crate.current || paused) return;
    const travel = ((clock.elapsedTime * 0.55 + phase) % 1) * length;
    crate.current.position.x = -length / 2 + travel;
  });

  return (
    <group ref={crate} position={[-length / 2 + phase * length, 0.78, positionZ]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.42, 0.46]} />
        <meshStandardMaterial color="#d7dde5" metalness={0.38} roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.02, 0.236]}>
        <boxGeometry args={[0.3, 0.09, 0.012]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PlantInfrastructure({ depth, paused, width }: { depth: number; paused: boolean; width: number }) {
  const fan = useRef<Group>(null);

  useFrame((_, delta) => {
    if (fan.current && !paused) fan.current.rotation.z -= delta * 1.25;
  });

  const backZ = -depth / 2 + 1.05;
  const conveyorZ = depth / 2 - 1.05;
  const conveyorLength = Math.max(4, width - 2.2);

  return (
    <group>
      <RoundedBox args={[Math.max(3.4, width * 0.38), 1.35, 1.5]} position={[-width * 0.2, 0.9, backZ]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#242a32" metalness={0.8} roughness={0.34} />
      </RoundedBox>
      <mesh castShadow position={[-width * 0.2, 1.68, backZ]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.05, 1.05, 1.56]} />
        <meshStandardMaterial color="#303741" metalness={0.78} roughness={0.3} />
      </mesh>
      <group position={[width * 0.25, 0, backZ]}>
        {[-0.45, 0.45].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh castShadow position={[0, 0.86, 0]}>
              <cylinderGeometry args={[0.34, 0.42, 1.35, 28]} />
              <meshStandardMaterial color="#a4aeba" metalness={0.86} roughness={0.2} />
            </mesh>
            <mesh castShadow position={[0, 1.62, 0]}>
              <coneGeometry args={[0.34, 0.28, 28]} />
              <meshStandardMaterial color="#c8ced6" metalness={0.82} roughness={0.18} />
            </mesh>
          </group>
        ))}
        <Line color="#ea0029" lineWidth={2} points={[[-0.45, 1.5, 0], [-0.45, 1.82, 0], [0.45, 1.82, 0], [0.45, 1.5, 0]]} />
      </group>

      <group position={[0, 0, conveyorZ]}>
        <mesh receiveShadow position={[0, 0.48, 0]}>
          <boxGeometry args={[conveyorLength, 0.16, 0.72]} />
          <meshStandardMaterial color="#353c46" metalness={0.88} roughness={0.25} />
        </mesh>
        {Array.from({ length: Math.max(8, Math.round(conveyorLength * 1.8)) }, (_, index) => (
          <mesh key={index} position={[-conveyorLength / 2 + 0.3 + index * (conveyorLength - 0.6) / Math.max(1, Math.round(conveyorLength * 1.8) - 1), 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.62, 12]} />
            <meshStandardMaterial color="#86909d" metalness={0.92} roughness={0.18} />
          </mesh>
        ))}
        {[0.08, 0.31, 0.54, 0.77].map((phase, index) => <ProductionCrate color={index % 2 ? "#20d499" : "#ea0029"} key={phase} length={conveyorLength - 0.7} paused={paused} phase={phase} positionZ={0} />)}
      </group>

      <group position={[width / 2 - 1.15, 1.14, conveyorZ - 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.22, 1.5, 18]} />
          <meshStandardMaterial color="#626d7a" metalness={0.86} roughness={0.24} />
        </mesh>
        <group ref={fan} position={[0, 0.78, 0.02]}>
          {[0, Math.PI / 2].map((rotation) => (
            <mesh key={rotation} rotation={[0, 0, rotation]}>
              <boxGeometry args={[1.05, 0.1, 0.08]} />
              <meshStandardMaterial color="#ea0029" emissive="#7c0016" emissiveIntensity={0.85} metalness={0.5} roughness={0.22} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#f4f5f7" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function plantDimensions(count: number) {
  const columns = count > 12 ? 5 : count > 7 ? 4 : 3;
  const rows = Math.max(1, Math.ceil(count / columns));
  return {
    columns,
    rows,
    width: columns * 2.28 + 2.35,
    depth: rows * 2.16 + 4.55
  };
}

function PlantZone({ areas, paused, position, selectedArea, onHover, onSelect }: {
  areas: OperationalTwinArea[];
  paused: boolean;
  position: VectorTuple;
  selectedArea: string | null;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const dimensions = plantDimensions(areas.length);
  const plant = areas[0];

  return (
    <group position={position}>
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[dimensions.width, 0.16, dimensions.depth]} />
        <meshStandardMaterial color="#0e1217" metalness={0.68} roughness={0.5} />
      </mesh>
      <mesh receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[dimensions.width - 0.32, 0.06, dimensions.depth - 0.32]} />
        <meshStandardMaterial color="#171d24" metalness={0.58} roughness={0.45} />
      </mesh>
      <Line color="#ea0029" lineWidth={2.2} points={[
        [-dimensions.width / 2, 0.23, -dimensions.depth / 2],
        [dimensions.width / 2, 0.23, -dimensions.depth / 2],
        [dimensions.width / 2, 0.23, dimensions.depth / 2],
        [-dimensions.width / 2, 0.23, dimensions.depth / 2],
        [-dimensions.width / 2, 0.23, -dimensions.depth / 2]
      ]} />

      <PlantInfrastructure depth={dimensions.depth} paused={paused} width={dimensions.width} />

      {areas.map((area, index) => {
        const row = Math.floor(index / dimensions.columns);
        const column = index % dimensions.columns;
        const positionX = (column - (dimensions.columns - 1) / 2) * 2.28;
        const positionZ = (row - (dimensions.rows - 1) / 2) * 2.16;
        return (
          <AreaModule
            area={area}
            index={index}
            key={area.code}
            onHover={onHover}
            onSelect={onSelect}
            paused={paused}
            position={[positionX, 0, positionZ]}
            selected={selectedArea === area.code}
          />
        );
      })}

      {plant ? <LabelSprite title={plant.plantName.toUpperCase()} subtitle={`${areas.length} ÁREAS CONECTADAS`} position={[0, 1.15, -dimensions.depth / 2 - 0.42]} scale={[5.4, 1.2, 1]} /> : null}
    </group>
  );
}

function DigitalTwinScene({ areas, paused, selectedArea, onHover, onSelect }: {
  areas: OperationalTwinArea[];
  paused: boolean;
  selectedArea: string | null;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const zones = useMemo(() => {
    const grouped = [...new Map(areas.map((area) => [area.plantCode, areas.filter((candidate) => candidate.plantCode === area.plantCode)])).entries()];
    const dimensions = grouped.map(([, rows]) => plantDimensions(rows.length));
    const totalWidth = dimensions.reduce((sum, item) => sum + item.width, 0) + Math.max(0, grouped.length - 1) * 2.8;
    let cursor = -totalWidth / 2;
    return grouped.map(([code, rows], index) => {
      const width = dimensions[index].width;
      const center = cursor + width / 2;
      cursor += width + 2.8;
      return { code, rows, position: [center, 0, 0] as VectorTuple };
    });
  }, [areas]);

  return (
    <>
      <color attach="background" args={["#06080b"]} />
      <fog attach="fog" args={["#06080b", 24, 58]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight color="#dbeeff" groundColor="#111318" intensity={1.1} />
      <directionalLight castShadow color="#ffffff" intensity={2.4} position={[12, 22, 14]} shadow-mapSize={[2048, 2048]} shadow-camera-far={55} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <spotLight castShadow angle={0.42} color="#ea0029" intensity={44} penumbra={0.8} position={[-18, 17, 7]} distance={48} />
      <spotLight angle={0.5} color="#4f8cff" intensity={30} penumbra={0.88} position={[20, 13, -10]} distance={44} />

      <group rotation={[0, -0.08, 0]}>
        {zones.map((zone) => (
          <PlantZone areas={zone.rows} key={zone.code} onHover={onHover} onSelect={onSelect} paused={paused} position={zone.position} selectedArea={selectedArea} />
        ))}
      </group>

      <Grid
        args={[70, 50]}
        cellColor="#242a32"
        cellSize={1}
        cellThickness={0.5}
        fadeDistance={48}
        fadeStrength={1.3}
        infiniteGrid
        position={[0, -0.02, 0]}
        sectionColor="#4c5663"
        sectionSize={5}
        sectionThickness={1.2}
      />
      <ContactShadows blur={2.6} far={28} opacity={0.7} position={[0, -0.01, 0]} scale={55} />
      <OrbitControls
        autoRotate={!paused}
        autoRotateSpeed={0.32}
        dampingFactor={0.055}
        enableDamping
        enablePan
        makeDefault
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.06}
        minDistance={10}
        minPolarAngle={0.45}
        target={[0, 0.6, 0]}
      />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.7} luminanceSmoothing={0.72} luminanceThreshold={0.5} mipmapBlur />
        <Vignette darkness={0.72} eskil={false} offset={0.2} />
      </EffectComposer>
    </>
  );
}

function aggregateAreas(areas: OperationalTwinArea[], selectedPlant: string): OperationalTwinArea {
  const plantName = selectedPlant === "all" ? "Red PROpEx" : areas[0]?.plantName ?? selectedPlant;
  return areas.reduce<OperationalTwinArea>((result, area) => ({
    ...result,
    total: result.total + area.total,
    open: result.open + area.open,
    pending: result.pending + area.pending,
    overdue: result.overdue + area.overdue,
    closed: result.closed + area.closed
  }), {
    code: selectedPlant === "all" ? "APO + CAR" : selectedPlant,
    name: "Pulso operativo consolidado",
    plantCode: selectedPlant,
    plantName,
    total: 0,
    open: 0,
    pending: 0,
    overdue: 0,
    closed: 0
  });
}

export default function OperationalTwin3D({ areas, selectedArea, selectedPlant, onSelectArea, onSelectPlant }: OperationalTwin3DProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [cameraRevision, setCameraRevision] = useState(0);
  const reducedMotion = useReducedMotion();
  const effectivePaused = paused || reducedMotion;
  const plants = useMemo(() => [...new Map(areas.map((area) => [area.plantCode, area.plantName])).entries()].map(([code, name]) => ({ code, name })), [areas]);
  const visibleAreas = useMemo(() => areas.filter((area) => selectedPlant === "all" || area.plantCode === selectedPlant), [areas, selectedPlant]);
  const focusArea = visibleAreas.find((area) => area.code === (hoveredArea ?? selectedArea));
  const summary = focusArea ?? aggregateAreas(visibleAreas, selectedPlant);
  const summaryStyle = areaHealth(summary);
  const cameraPosition: VectorTuple = selectedPlant === "all" ? [18, 17, 27] : [12, 14, 21];

  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);

  return (
    <section className="operational-twin-section" aria-labelledby="operational-twin-title">
      <header className="operational-twin-header">
        <div className="operational-twin-heading">
          <span className="operational-twin-kicker"><ScanLine aria-hidden /> Control operativo 3D</span>
          <h2 id="operational-twin-title">Gemelo digital de plantas</h2>
          <p>{visibleAreas.length} áreas conectadas · {summary.total} ideas en el periodo · {summary.overdue} compromisos vencidos</p>
        </div>

        <div className="operational-twin-actions">
          <div className="operational-twin-segments" aria-label="Planta visible" role="group">
            <button aria-pressed={selectedPlant === "all"} onClick={() => onSelectPlant("all")} type="button">Red completa</button>
            {plants.map((item) => <button aria-pressed={selectedPlant === item.code} key={item.code} onClick={() => onSelectPlant(item.code)} type="button">{item.code}</button>)}
          </div>
          <div className="operational-twin-icon-actions">
            <button aria-label={paused ? "Reanudar movimiento 3D" : "Pausar movimiento 3D"} onClick={() => setPaused((value) => !value)} title={paused ? "Reanudar" : "Pausar"} type="button">
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
            <button aria-label="Restablecer cámara 3D" onClick={() => setCameraRevision((value) => value + 1)} title="Restablecer cámara" type="button"><RotateCcw aria-hidden /></button>
          </div>
        </div>
      </header>

      <div className="operational-twin-stage">
        <Canvas
          camera={{ far: 120, fov: 38, near: 0.1, position: cameraPosition }}
          dpr={[1, 1.75]}
          fallback={<div className="operational-twin-webgl-fallback"><Building2 aria-hidden /><strong>Vista operativa disponible en la lista de áreas</strong></div>}
          gl={{ alpha: false, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, stencil: false }}
          key={`${selectedPlant}-${cameraRevision}`}
          onPointerMissed={() => onSelectArea(null)}
          shadows="basic"
        >
          <Suspense fallback={null}>
            <DigitalTwinScene areas={visibleAreas} onHover={setHoveredArea} onSelect={onSelectArea} paused={effectivePaused} selectedArea={selectedArea} />
          </Suspense>
        </Canvas>

        <aside className="operational-twin-summary" style={{ "--health-color": summaryStyle.color } as CSSProperties}>
          <div className="operational-twin-summary-status"><span />{summaryStyle.label}</div>
          <div className="operational-twin-summary-title">
            <span>{summary.code}</span>
            <strong>{summary.name}</strong>
            <small>{summary.plantName}</small>
          </div>
          <dl>
            <div><dt>Ideas</dt><dd>{summary.total}</dd></div>
            <div><dt>Abiertas</dt><dd>{summary.open}</dd></div>
            <div><dt>Pendientes</dt><dd>{summary.pending}</dd></div>
            <div><dt>Vencidas</dt><dd>{summary.overdue}</dd></div>
          </dl>
        </aside>

        <div className="operational-twin-legend" aria-label="Leyenda de estado">
          {Object.values(healthStyles).map((item) => <span key={item.label}><i style={{ backgroundColor: item.color }} />{item.label}</span>)}
        </div>
      </div>

      <nav className="operational-twin-area-rail" aria-label="Áreas del gemelo digital">
        <button aria-pressed={!selectedArea} className="operational-twin-area-all" onClick={() => onSelectArea(null)} type="button">
          <span><Layers3 aria-hidden /></span><strong>Todas las áreas</strong><small>{visibleAreas.reduce((sum, item) => sum + item.open, 0)} abiertas</small>
        </button>
        {visibleAreas.map((item) => {
          const style = areaHealth(item);
          return (
            <button
              aria-label={`${item.code}, ${item.name}: ${item.open} abiertas y ${item.overdue} vencidas`}
              aria-pressed={selectedArea === item.code}
              className="operational-twin-area-button"
              key={item.code}
              onClick={() => onSelectArea(item.code)}
              style={{ "--area-health": style.color } as CSSProperties}
              type="button"
            >
              <span className="operational-twin-area-code"><i />{item.code}</span>
              <strong>{item.name}</strong>
              <small>{item.open} abiertas · {item.overdue} vencidas</small>
            </button>
          );
        })}
      </nav>

      <span className="sr-only" aria-live="polite">{summary.code}: {summaryStyle.label}, {summary.open} ideas abiertas.</span>
    </section>
  );
}
