import {queryStudyView, type WoodlandStudyView} from './woodlandStudy';
import {WoodlandStudyExterior} from './WoodlandStudyExterior';
import {WoodlandStudyControls} from './WoodlandStudyControls';
import {useActiveRoom} from './useActiveRoom';
import {BeachfrontScenery} from './BeachfrontScenery';
import {RoomSound} from './RoomSound';
import {RoomPerformance} from './RoomPerformance';
import {playRoomSound} from '../../lib/audio';
import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import * as THREE from 'three';
import type {HotspotId} from '../../lib/hotspots';
import type {RoomFace} from '../../lib/roomLayout';
import type {Environment} from '../../types/app';
import type {Phase} from '../room/RoomFurniture';
import {StickerStore} from '../StickerStore';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {useListen} from '../../store/listen';
import {EyeCamera} from './RoomCamera';
import {startCamera} from './startCamera';
import {RoomModel} from './RoomModel';
import type {HotspotAction} from './RoomInteractions';
import {useRoomRenderProfile} from './useRoomRenderProfile';
import {OutdoorWeather} from './OutdoorWeather';
import {RoomControls} from './RoomControls';
import {RoomShadowQuality} from './RoomShadowQuality';
import {RoomRenderGate, ShaderWarmup} from './ShaderWarmup';
import {useWorkbench} from '../../store/workbench';
const CardBinders = lazy(() => import('../CardBinders').then(m => ({default: m.CardBinders})));
export function RoomScene3D({
  roomFace,
  setRoomFace,
  phase: basePhase,
  environment: baseEnvironment,
  tourFocus,
  touring,
  onOpenWindow,
  onOpenMusic,
  onOpenDoor,
  onGo,
}: {
  roomFace: RoomFace;
  setRoomFace: (face: RoomFace) => void;
  phase: Phase;
  environment: Environment;
  tourFocus: HotspotId | null;
  touring: boolean;
  onOpenWindow: () => void;
  onOpenMusic: () => void;
  onOpenDoor: () => void;
  onGo: (view: 'shelf' | 'atlas' | 'archive' | 'book' | 'guestbook') => void;
}) {
  const activeRoom = useActiveRoom();
  const study = activeRoom.study === true;
  const review = activeRoom.review === true;
  const [studyView, setStudyView] = useState<WoodlandStudyView | null>(
    review ? 'establishing' : study ? queryStudyView(window.location.search) : null,
  );
  const [studyPhase, setStudyPhase] = useState<Phase>('dusk');
  const [winter, setWinter] = useState(false);
  const phase = review ? studyPhase : basePhase;
  const environment = review
    ? {...baseEnvironment, season: (winter ? 'winter' : 'autumn') as Environment['season']}
    : baseEnvironment;
  const {phase: workbenchPhase, openBinder} = useWorkbench();
  const atWorkbench = workbenchPhase !== 'room';
  const quality = environment.roomQuality ?? 'balanced';
  // Each room/quality loads a different model, so its shaders are compiled before it is shown.
  const [warmedAsset, setWarmedAsset] = useState<string | null>(null);
  const shadersReady = warmedAsset === activeRoom.asset;
  const markShadersReady = useCallback(() => setWarmedAsset(activeRoom.asset), [activeRoom.asset]);
  const {discoveryOpen, isVisitor} = useNav();
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  useEffect(() => {
    const change = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  const [viewRevision, setViewRevision] = useState(0);
  const [reading, setReading] = useState(false);
  const [displayCase, setDisplayCase] = useState(false);
  const [binderOpen, setBinderOpen] = useState(false);
  useEffect(() => {
    if (roomFace !== 'front' || touring) setReading(false);
  }, [roomFace, touring]);
  const lookAt = (face: RoomFace) => {
    setStudyView(null);
    setDisplayCase(false);
    setReading(false);
    setSeated(false);
    setShopOpen(false);
    setRoomFace(face);
    setViewRevision(v => v + 1);
  };
  const profile = useRoomRenderProfile(quality);
  const [seated, setSeated] = useState(false);
  useEffect(() => {
    if (atWorkbench || touring || seated) setDisplayCase(false);
  }, [atWorkbench, touring, seated]);
  useEffect(() => {
    if (workbenchPhase === 'leaving') setSeated(false);
  }, [workbenchPhase]);
  const [shopOpen, setShopOpen] = useState(false);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const archiveTimer = useRef<number | null>(null);
  const {bindScene} = useListen();
  const {setEnvironment} = useApp();

  const stand = useCallback(() => {
    setShopOpen(false);
    setSeated(false);
  }, []);

  const sit = useCallback(() => {
    setRoomFace('front');
    setReading(false);
    setSeated(true);
    onGo('book');
  }, [setRoomFace, onGo]);

  const openCraft = useCallback(() => {
    if (isVisitor) return;
    playRoomSound('drawer', environment.ambienceVolume);
    setShopOpen(true);
  }, [environment.ambienceVolume, isVisitor]);
  const toggleLamp = useCallback(
    () => setEnvironment({lampOn: !environment.lampOn}),
    [setEnvironment, environment.lampOn],
  );
  const toggleCeiling = useCallback(
    () => setEnvironment({ceilingOn: environment.ceilingOn === false}),
    [setEnvironment, environment.ceilingOn],
  );

  useEffect(() => {
    bindScene({
      sit,
      stand,
      openDrawer: openCraft,
      openDoor: onOpenDoor,
      toggleLamp,
      toggleCeiling,
      seated,
      shopOpen,
    });
    return () => bindScene(null);
  }, [bindScene, seated, shopOpen, sit, stand, onOpenDoor, toggleLamp, toggleCeiling, openCraft]);

  const openArchive = () => {
    if (archiveTimer.current != null) return;
    playRoomSound('drawer', environment.ambienceVolume);
    setCabinetOpen(true);
    const delay =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 560;
    archiveTimer.current = window.setTimeout(() => {
      archiveTimer.current = null;
      onGo('archive');
    }, delay);
  };

  useEffect(
    () => () => {
      if (archiveTimer.current != null) window.clearTimeout(archiveTimer.current);
    },
    [],
  );

  const activate = (id: HotspotAction) => {
    if (id === 'window') onOpenWindow();
    else if (id === 'crt') onOpenMusic();
    else if (id === 'book') onGo('book');
    else if (id === 'archive') openArchive();
    else if (id === 'guestbook') onGo('guestbook');
    else if (id === 'map') onGo('atlas');
    else if (id === 'shelf') onGo('shelf');
  };

  useEffect(() => {
    if (touring) stand();
  }, [touring, stand]);

  useEffect(() => {
    if (touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (e.key === 'Escape' && shopOpen) {
        e.preventDefault();
        setShopOpen(false);
        return;
      }
      if (e.key === 'Escape' && seated) {
        e.preventDefault();
        stand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [touring, seated, shopOpen, stand]);

  return (
    <div
      className="ks-room3d"
      data-room-face={roomFace}
      data-study={study ? 'woodland' : undefined}
      data-study-view={review ? (studyView ?? 'free') : undefined}
      data-study-season={study ? environment.season : undefined}
      data-workbench={workbenchPhase}
      data-seated={seated ? '1' : '0'}
      data-ceiling={environment.ceilingOn !== false ? '1' : '0'}
      data-lamp={environment.lampOn ? '1' : '0'}
      data-archive-open={cabinetOpen ? '1' : '0'}
      aria-label="The scrapbook room"
    >
      <RoomSound environment={environment} face={roomFace} reading={workbenchPhase === 'editing'} />
      <div className="ks-room3d-picture" role="group" aria-label="Interactive room">
        <Canvas
          frameloop={tabVisible && !discoveryOpen && !binderOpen ? 'always' : 'demand'}
          camera={{
            ...startCamera(activeRoom.views.front),
            fov: seated ? 38 : activeRoom.fov,
            near: 0.08,
            far: 40,
          }}
          dpr={[1, profile.dpr]}
          // Always on: Balanced turns shadows off with RoomShadowQuality instead, without rebuilding every shader.
          // Named explicitly: a bare `shadows` asks for the soft type, which three.js no longer supports and swaps
          // for this one on the first shadow pass. That swap changes every shader and built each one twice.
          shadows="percentage"
          // Reading shader logs after every compile is a blocking round trip per program; keep it for development.
          onCreated={({gl}) => {
            gl.debug.checkShaderErrors = import.meta.env.DEV;
          }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: activeRoom.id === 'beachfront' ? 1.12 : 1.05,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'default',
          }}
        >
          <color
            attach="background"
            args={[
              activeRoom.id === 'cyberpunk'
                ? '#070b20'
                : phase === 'night'
                  ? '#12161c'
                  : phase === 'dusk'
                    ? '#2a1c14'
                    : '#5a6570',
            ]}
          />
          <RoomPerformance />
          <RoomShadowQuality enabled={profile.shadows} />
          <RoomRenderGate ready={shadersReady} />
          <Suspense fallback={null}>
            <RoomModel
              phase={phase}
              environment={environment}
              tourFocus={tourFocus}
              seated={seated}
              drawerOpen={shopOpen}
              cabinetOpen={cabinetOpen}
              onActivate={activate}
              onOpenArchive={openArchive}
              onOpenDrawer={openCraft}
              onSit={sit}
              onOpenDoor={onOpenDoor}
              onToggleLamp={toggleLamp}
              onToggleCeiling={toggleCeiling}
            />
            {study && <WoodlandStudyExterior season={environment.season} phase={phase} />}
            {study && environment.weather !== 'clear' && (
              <OutdoorWeather kind={environment.weather} count={profile.particles} room="woodland" />
            )}
            {activeRoom.id === 'beachfront' && (
              <BeachfrontScenery phase={phase} environment={environment} particles={profile.particles} />
            )}
            {activeRoom.id === 'cyberpunk' && environment.weather !== 'clear' && (
              <OutdoorWeather kind={environment.weather} count={profile.particles} room="cyberpunk" />
            )}
            <ShaderWarmup key={activeRoom.asset} onReady={markShadersReady} />
          </Suspense>
          <EyeCamera
            studyView={study ? studyView : null}
            displayCase={displayCase}
            workbench={atWorkbench}
            reading={reading}
            face={roomFace}
            seated={seated}
            touring={touring}
            viewRevision={viewRevision}
          />
        </Canvas>
      </div>
      {review && !touring && !atWorkbench && (
        <WoodlandStudyControls
          view={studyView}
          onView={v => {
            setStudyView(v);
            setDisplayCase(false);
            setReading(false);
            setSeated(false);
            setShopOpen(false);
            setRoomFace('front');
            setViewRevision(n => n + 1);
          }}
          winter={winter}
          onWinter={setWinter}
          phase={studyPhase}
          onPhase={setStudyPhase}
        />
      )}
      <div id="ks-workbench-controls" className="ks-workbench-controls" />
      {binderOpen && !isVisitor && (
        <Suspense fallback={<p>Opening binders…</p>}>
          <CardBinders
            onPick={id => {
              setBinderOpen(false);
              openBinder(id);
            }}
            onClose={() => setBinderOpen(false)}
          />
        </Suspense>
      )}
      {!touring && !atWorkbench && (
        <RoomControls
          onSettings={onOpenWindow}
          onCardBinders={() => setBinderOpen(true)}
          onDisplayCase={() => {
            setRoomFace('right');
            setSeated(false);
            setReading(false);
            setDisplayCase(true);
            setViewRevision(v => v + 1);
          }}
          onLibrary={() => onGo('shelf')}
          onReading={() => {
            setDisplayCase(false);
            setRoomFace('front');
            setSeated(false);
            setReading(true);
            setViewRevision(v => v + 1);
          }}
          seated={seated}
          environment={environment}
          onBook={() => onGo('book')}
          onFiles={openArchive}
          onSeat={seated ? stand : sit}
          onDoor={onOpenDoor}
          onMusic={onOpenMusic}
          onLamp={toggleLamp}
          onCeiling={toggleCeiling}
          onLook={face => {
            stand();
            lookAt(face);
          }}
          onDrawer={openCraft}
        />
      )}
      {shopOpen && <StickerStore onClose={() => setShopOpen(false)} />}
    </div>
  );
}
