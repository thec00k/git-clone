import {useEffect, useRef} from 'react';
import {DoorOpen, Users} from 'lucide-react';
import {useNav} from '../../store/nav';

export function DoorLanding({friends}: {friends: boolean}) {
  const {enterRoom} = useNav();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {heading.current?.focus();}, [friends]);
  return <main className="min-h-screen flex items-center justify-center p-6">
    <section className="ks-panel w-full max-w-md p-8 text-center">
      <div className="flex justify-center mb-4">{friends ? <Users size={32}/> : <DoorOpen size={32}/>}</div>
      <p className="ks-handnote mb-2">Keepsake</p>
      <h1 ref={heading} tabIndex={-1} className="font-display text-3xl">{friends ? 'Friends’ rooms' : 'Your room is closed'}</h1>
      <p className="my-4 text-paper/75">{friends ? 'A little visit, a shared memory. When online rooms arrive, your close friends and invitations will live here.' : 'Your books and memories are saved on this device. Come back whenever you like.'}</p>
      <p className="mb-6 text-sm text-paper/60">{friends ? 'Online visits are not available in this local prototype yet.' : 'This closes the local experience; it is not an account lock on a shared device.'}</p>
      <button className="ks-tool ks-tool--accent" onClick={enterRoom}>Return to my room</button>
    </section>
  </main>;
}
