import {Html, useProgress} from '@react-three/drei';
import {useWarmupProgress} from './warmupProgress';
export function RoomLoading() {
  const {progress} = useProgress();
  const warmup = useWarmupProgress();
  // Downloading the room is the first part of the bar; drawing every material once (so the graphics driver
  // builds its shaders now, not on the first visible frame) is the rest.
  const value = Math.round(progress * 0.6 + warmup * 40);
  return (
    <Html fullscreen>
      <div className="ks-room-loading-screen">
        <div className="ks-room-loading" role="status">
          <span>Opening your room</span>
          <progress aria-label="Room loading" max={100} value={value} />
        </div>
      </div>
    </Html>
  );
}
