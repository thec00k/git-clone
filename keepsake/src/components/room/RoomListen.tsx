import { useMemo } from "react";
import { Volume2, X } from "lucide-react";
import { useListen } from "../../store/listen";
import { useNav } from "../../store/nav";
import { listenThings, LISTEN_INTRO, type ListenId } from "../../lib/roomListen";
import { roomLayoutFromSearch } from "../../lib/roomLayout";

export function RoomListen({
  onAct,
}: {
  onAct: (id: ListenId) => void;
}) {
  const { preview, setPreview, announcement, announce, scene } = useListen();
  const { touring, setRoomFace } = useNav();
  const layout = useMemo(() => roomLayoutFromSearch(), []);
  const things = listenThings({
    layout,
    seated: scene?.seated ?? false,
    shopOpen: scene?.shopOpen ?? false,
  });

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.pitch = 0.95;
    window.speechSynthesis.speak(u);
  };

  if (touring) return null;

  return (
    <>
      <nav
        id="ks-room-things"
        tabIndex={-1}
        className={`ks-listen${preview ? " is-open" : ""}`}
        data-room-listen
        data-listen-preview={preview ? "1" : "0"}
        aria-label="Things in the room"
      >
        <div className="ks-listen-card">
          <p className="ks-listen-name">THE HOUSE</p>
          <div className="ks-listen-box">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg text-ink">Things in this room</h2>
                <p className="mt-1 text-sm text-ink/65">{LISTEN_INTRO}</p>
              </div>
              {preview && (
                <button type="button" className="ks-chip" aria-label="Hide the spoken list" onClick={() => setPreview(false)}>
                  <X size={16} />
                </button>
              )}
            </div>
            <ol className="ks-listen-list">
              {things.map((thing) => (
                <li key={thing.id}>
                  <div className="ks-listen-row">
                    <button
                      type="button"
                      className="ks-listen-thing"
                      data-listen-id={thing.id}
                      aria-describedby={`ks-listen-hint-${thing.id}`}
                      onFocus={() => setRoomFace(thing.face)}
                      onClick={() => {
                        announce(thing.hint);
                        onAct(thing.id);
                      }}
                    >
                      <span className="ks-listen-thing-name">{thing.name}</span>
                      <span id={`ks-listen-hint-${thing.id}`} className="ks-listen-thing-hint">
                        {thing.hint}
                      </span>
                    </button>
                    {preview && (
                      <button
                        type="button"
                        className="ks-chip ks-listen-hear"
                        aria-label={`Hear ${thing.name}`}
                        onClick={() => speak(`${thing.name}. ${thing.hint}`)}
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </nav>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-listen-live>
        {announcement}
      </div>
    </>
  );
}
