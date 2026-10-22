import {useApp} from '../../store/appStore';
export function SillDecoration() {
  const {state} = useApp();
  const sky = state.environment.roomTheme === 'sky-castle';
  const id = state.roomDecor?.sillItem;
  if (!id || !state.roomDecor?.owned.includes(id)) return null;
  return (
    <group name="owned-sill-decoration" position={sky ? [-0.88, 1.115, -2.063] : [-0.45, 1.138, -2.063]}>
      {id === 'fern' && (
        <>
          <mesh position={[0, 0.028, 0]}>
            <cylinderGeometry args={[0.038, 0.028, 0.056, 16]} />
            <meshStandardMaterial color="#a56d50" roughness={0.95} />
          </mesh>
          {Array.from({length: 7}, (_, i) => (
            <group key={i} rotation={[0, (i * Math.PI * 2) / 7, 0.35]}>
              <mesh position={[0, 0.09, 0]} rotation={[0, 0, -0.35]} scale={[0.018, 0.066, 0.007]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={i % 2 ? '#63764a' : '#788a55'} roughness={1} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {id === 'fox' && (
        <>
          <mesh position={[0, 0.022, 0]} scale={[0.052, 0.026, 0.038]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#b96f3d" roughness={0.85} />
          </mesh>
          <mesh position={[0.026, 0.04, 0.019]} scale={[0.023, 0.022, 0.023]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#c98349" roughness={0.85} />
          </mesh>
          {[-1, 1].map(n => (
            <mesh key={n} position={[0.026 + n * 0.013, 0.063, 0.018]}>
              <coneGeometry args={[0.01, 0.025, 4]} />
              <meshStandardMaterial color="#b96f3d" />
            </mesh>
          ))}
          <mesh position={[-0.012, 0.025, 0.026]} rotation={[0, 0.25, 0.1]} scale={[0.045, 0.015, 0.017]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#e1caa0" roughness={0.9} />
          </mesh>
        </>
      )}
      {id === 'bird' && (
        <>
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.016, 18]} />
            <meshStandardMaterial color="#735336" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.044, 0]} scale={[0.037, 0.027, 0.023]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#b69a57" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0.027, 0.066, 0]}>
            <sphereGeometry args={[0.018, 12, 8]} />
            <meshStandardMaterial color="#b69a57" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0.049, 0.067, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.007, 0.022, 8]} />
            <meshStandardMaterial color="#9f8147" />
          </mesh>
        </>
      )}
      {id === 'vase' && (
        <>
          <mesh position={[0, 0.036, 0]} scale={[0.029, 0.043, 0.029]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#6d806a" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.07, 6]} />
            <meshStandardMaterial color="#68734b" />
          </mesh>
          <group position={[0, 0.13, 0]} rotation={[Math.PI / 3, 0, 0]}>
            {Array.from({length: 6}, (_, i) => (
              <mesh
                key={i}
                position={[Math.cos((i * Math.PI) / 3) * 0.012, Math.sin((i * Math.PI) / 3) * 0.012, 0]}
                scale={[0.01, 0.015, 0.005]}
              >
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#dfb94f" roughness={0.9} />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}
