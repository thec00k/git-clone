import {SoundCloudDock} from './components/SoundCloudDock';
import { useNav } from "./store/nav";
import { Room } from "./components/room/Room";
import { BookView } from "./components/BookView";
import { Shelf } from "./components/views/Shelf";
import { Archive } from "./components/views/Archive";
import { ArchiveDrawer } from "./components/views/ArchiveDrawer";
import { Atlas } from "./components/views/Atlas";
import { Guestbook } from "./components/views/Guestbook";
import { AmbientAudio } from "./components/AmbientAudio";
import { SpotifyDock } from "./components/SpotifyDock";
import { PhotoPrinter } from "./components/PhotoPrinter";
import {DiscoverySystem} from './components/Discoveries';
import { CrtPlayerSlotProvider } from "./store/spotifyUi";

function CurrentView() {
  const { view } = useNav();
  switch (view) {
    case "book":
      return <BookView />;
    case "shelf":
      return <Shelf />;
    case "archive":
      return <ArchiveDrawer />;
    case "archiveFolder":
      return <Archive />;
    case "atlas":
      return <Atlas />;
    case "guestbook":
      return <Guestbook />;
    default:
      return <Room />;
  }
}

export default function App() {
  const { printerOpen, setPrinterOpen, isVisitor } = useNav();
  return (
    <CrtPlayerSlotProvider>
      <AmbientAudio />
      <SpotifyDock /><SoundCloudDock/>
      <CurrentView />
      <DiscoverySystem/>
      {printerOpen && !isVisitor && <PhotoPrinter onClose={() => setPrinterOpen(false)} />}
    </CrtPlayerSlotProvider>
  );
}
