import {useEffect,useRef,useState} from 'react';
import {useApp} from '../store/appStore';
import {checkImportCapacity,checkStorageCapacity} from '../lib/importLimits';
import {loadImageFile} from '../lib/image';
import {useFocusTrap} from '../hooks/useFocusTrap';
export function FolderUpload({onImported}:{onImported:(category:string)=>void}){
 const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 return <><button className="ks-tool" onClick={()=>input.current?.click()}>Upload folder</button><input ref={input} type="file" multiple {...{webkitdirectory:'',directory:''}} hidden aria-label="Upload a photo folder" onChange={e=>{setFiles(Array.from(e.target.files??[]));e.target.value='';}}/>{!!files.length&&<FolderDialog files={files} onClose={()=>setFiles([])} onImported={onImported}/>}</>;
}
function FolderDialog({files,onClose,onImported}:{files:File[];onClose:()=>void;onImported:(id:string)=>void}){
 const {addArchivePhoto,addArchiveTab}=useApp();const root=useRef<HTMLDivElement>(null);const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');
 const stop=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop.current=true;};},[]);
 const [name,setName]=useState(files[0]?.webkitRelativePath.split('/')[0]||'New category');
 useFocusTrap(root,()=>{if(!busy)onClose();});
 async function upload(){
  setBusy(true);stop.current=false;let category='',count=0,failed=0;let reason='';
  try{
   await checkImportCapacity(files);
   for(let i=0;i<files.length;i++){
    if(stop.current)break;
    setStatus(`Reading ${i+1} of ${files.length}…`);
    let photo;try{photo=await loadImageFile(files[i]);}catch{failed++;continue;}
    if(stop.current)break;
    await checkStorageCapacity(photo.src.length);
    if(!category)category=addArchiveTab(name.trim());addArchivePhoto(photo.src,photo.aspect,[category]);count++;
   }
  }catch(error){reason=error instanceof Error?error.message:'Import could not finish.';}
  if(!alive.current)return;
  setBusy(false);setStatus(`${stop.current?'Import stopped. ':''}${count} photo(s) imported${failed?`; ${failed} unsupported or unreadable file(s) skipped`:''}. ${reason}`);
  if(category){onImported(category);setImported(true);}
 }
 const [imported,setImported]=useState(false);
 return <div className="ks-import-backdrop"><div ref={root} className="ks-import-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-import-title"><h2 id="folder-import-title">Import photo folder</h2><p>Up to 100 files / 200 MB per import, 25 MB per image. {files.length} files selected. Images in subfolders join the same category.</p><label>Category name <input aria-label="New folder category name" value={name} maxLength={80} disabled={busy||imported} onChange={e=>setName(e.target.value)}/></label><p role="status">{status}</p><footer>{busy&&<button onClick={()=>{stop.current=true;setStatus("Stopping after the current image…");}}>Stop import</button>}<button disabled={busy} onClick={onClose}>{imported?'Done':'Cancel'}</button>{!imported&&<button disabled={busy||!name.trim()} onClick={()=>void upload()}>Import folder</button>}</footer><p>Folder selection depends on your device. You can also use Upload to select multiple photographs.</p></div></div>;
}
