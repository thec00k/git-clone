import { useNav } from "./store/nav";
import { Room } from "./components/room/Room";
import { BookView } from "./components/BookView";
import { Shelf } from "./components/views/Shelf";
import { Archive } from "./components/views/Archive";
import { Timeline } from "./components/views/Timeline";
import { Atlas } from "./components/views/Atlas";
import { Guestbook } from "./components/views/Guestbook";
import { AmbientAudio } from "./components/AmbientAudio";
import { SpotifyDock } from "./components/SpotifyDock";
import { CrtPlayerSlotProvider } from "./store/spotifyUi";

function CurrentView() {
  const { view } = useNav();
  switch (view) {
    case "book":
      return <BookView />;
    case "shelf":
      return <Shelf />;
    case "archive":
      return <Archive />;
    case "timeline":
      return <Timeline />;
    case "atlas":
      return <Atlas />;
    case "guestbook":
      return <Guestbook />;
    default:
      return <Room />;
  }
}

export default function App() {
  return (
    <CrtPlayerSlotProvider>
      <AmbientAudio />
      <SpotifyDock />
      <CurrentView />
    </CrtPlayerSlotProvider>
  );
}
