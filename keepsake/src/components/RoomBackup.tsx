import { Download, FolderOpen, ArchiveRestore } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../store/appStore';
import { useNav } from '../store/nav';
import { downloadRoom, parseRoomBackup } from '../lib/roomBackup';
import type { AppState } from '../types/app';
export function RoomBackup(){
 const {state,restoreRoom}=useApp();const {isVisitor}=useNav();const input=useRef<HTMLInputElement>(null);
 const [pending,setPending]=useState<AppState|null>(null);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
 if(isVisitor)return null;
 return <details className="ks-backup"><summary>Keep a room backup</summary><p>Save your books, photographs, pins, guestbook and room settings together.</p>
  <button className="ks-tool" disabled={busy} onClick={async()=>{setBusy(true);setStatus('Preparing your room and preserved originals…');try{await downloadRoom(state);setStatus('Backup download started. Keep the file somewhere safe.');}catch(e){setStatus(e instanceof Error?e.message:'Backup failed.');}finally{setBusy(false);}}}><Download size={16}/> Download room backup</button>
  <button className="ks-tool" onClick={()=>input.current?.click()}><FolderOpen size={16}/> Open a backup…</button>
  <input ref={input} type="file" accept=".json,application/json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';setPending(null);if(!file)return;try{if(file.size>250*1024*1024)throw new Error('This backup is too large to open here (250 MB maximum).');setPending(parseRoomBackup(await file.text()));setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Could not read that backup.');}}}/>
  {pending && <div className="ks-restore-preview"><strong>{pending.profile.displayName}’s room</strong><p>{pending.books.length} books · {pending.archive.length} photographs · {pending.pins.length} pins</p><p>Restoring replaces this room. We’ll download a backup of your current room first.</p><button className="ks-tool" disabled={busy} onClick={async()=>{setBusy(true);try{await downloadRoom(state);await restoreRoom(pending);setPending(null);setStatus('Your room has been restored.');}catch{setStatus('Restore failed. Your current room is still open.');}finally{setBusy(false);}}}><ArchiveRestore size={16}/> Back up current room & restore</button><button className="ks-tool" disabled={busy} onClick={()=>setPending(null)}>Cancel</button></div>}
  {status && <p role="status">{status}</p>}
 </details>;
}
