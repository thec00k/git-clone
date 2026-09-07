import { Html, useProgress } from "@react-three/drei";
export function RoomLoading() {
  const { progress } = useProgress();
  return <Html center><div className="ks-room-loading" role="status">
    <span>Opening your room</span>
    <progress aria-label="Room loading" max={100} value={progress} />
  </div></Html>;
}
