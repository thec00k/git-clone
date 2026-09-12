import {useRef, useState} from 'react';
import {DoorOpen, LogOut, Sparkles, Users} from 'lucide-react';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {useFocusTrap} from '../../hooks/useFocusTrap';
import {logout as spotifyLogout} from '../../lib/spotify';

export function LeavePanel({onClose}: {onClose: () => void}) {
  const {flushSave, tidyRoom} = useApp();
  const {go, closeRoom, isVisitor} = useNav();
  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useFocusTrap(panelRef, () => { if (!busy) onClose(); });
  const leave = async (destination: 'closed' | 'friends') => {
    setBusy(true); setNote('Saving your room…');
    if (!await flushSave()) {
      setBusy(false); setNote('Your room could not be saved. Please try again before leaving.'); return;
    }
    if (destination === 'closed') { spotifyLogout(); closeRoom(); }
    else go('friends');
    onClose();
  };
  const tidy = async () => {
    setBusy(true); setNote('Putting the room in order…');
    const saved = await tidyRoom();
    setBusy(false);
    setNote(saved ? 'All settled. Every scrapbook and card binder is back on the bookshelf, the weather is clear, and the lights are on.' : 'The room is tidied, but saving failed. Please try again before leaving.');
  };
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => {if (!busy) onClose();}}>
    <div ref={panelRef} className="ks-panel w-full max-w-md p-5" role="dialog" aria-modal="true" aria-label="The door" aria-busy={busy} data-leave-panel onClick={e => e.stopPropagation()}>
      <DoorOpen size={24} className="mb-3"/>
      <h2 className="font-display text-2xl">Before you go</h2>
      <p className="ks-handnote mb-4">Your quiet corner will be here.</p>
      <button className="ks-tool mt-2 w-full justify-center" disabled={busy} data-leave-friends onClick={() => void leave('friends')}><Users size={17}/> Visit friends’ rooms</button>
      {!isVisitor && <button className="ks-tool mt-2 w-full justify-center" disabled={busy} data-leave-tidy onClick={() => void tidy()}><Sparkles size={17}/> Tidy up room</button>}
      <p className="mt-2 text-xs text-paper/60">Tidying returns every scrapbook and card binder to the bookshelf, then resets the hour, weather and lights. Your memories and decorations stay safe.</p>
      <button className="ks-tool mt-3 w-full justify-center" disabled={busy} data-leave-logout onClick={() => void leave('closed')}><LogOut size={17}/> Log out</button>
      <p className="mt-2 text-xs text-paper/60">For now, logging out saves and closes this local room. Accounts and online visits are coming later.</p>
      <p className="mt-3 text-sm text-paper/80" role="status" data-leave-note>{note}</p>
      <button className="ks-tool ks-tool--accent mt-3 w-full justify-center" disabled={busy} onClick={onClose}>Stay in the room</button>
    </div>
  </div>;
}
