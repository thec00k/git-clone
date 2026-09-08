import {useRef,useState} from 'react';
import {useApp} from '../store/appStore';
import {loadImageFile} from '../lib/image';
import {useFocusTrap} from '../hooks/useFocusTrap';
export function FolderUpload({onImported}:{onImported:(category:string)=>void}){
 const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 return <><button className="ks-tool" onClick={()=>input.current?.click()}>Upload folder</button><input ref={input} type="file" multiple {...{webkitdirectory:'',directory:''}} hidden aria-label="Upload a photo folder" onChange={e=>{setFiles(Array.from(e.target.files??[]));e.target.value='';}}/>{!!files.length&&<FolderDialog files={files} onClose={()=>setFiles([])} onImported={onImported}/>}</>;
}
function FolderDialog({files,onClose,onImported}:{files:File[];onClose:()=>void;onImported:(id:string)=>void}){
 const {addArchivePhoto,addArchiveTab}=useApp();const root=useRef<HTMLDivElement>(null);const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');
 const [name,setName]=useState(files[0]?.webkitRelativePath.split('/')[0]||'New category');
 useFocusTrap(root,()=>{if(!busy)onClose();});
 async function upload(){
  setBusy(true);let category='';let count=0,failed=0;
  for(let i=0;i<files.length;i++){
   setStatus(`Reading ${i+1} of ${files.length}…`);
   try{const {src,aspect}=await loadImageFile(files[i]);if(!category)category=addArchiveTab(name.trim());addArchivePhoto(src,aspect,[category]);count++;}catch{failed++;}
  }
  setBusy(false);setStatus(`${count} photo(s) imported${failed?`; ${failed} unsupported or unreadable file(s) skipped`:''}.`);
  if(category){onImported(category);setImported(true);}
 }
 const [imported,setImported]=useState(false);
 return <div className="ks-import-backdrop"><div ref={root} className="ks-import-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-import-title"><h2 id="folder-import-title">Import photo folder</h2><p>{files.length} files selected. Images in subfolders join the same category.</p><label>Category name <input aria-label="New folder category name" value={name} maxLength={80} disabled={busy||imported} onChange={e=>setName(e.target.value)}/></label><p role="status">{status}</p><footer><button disabled={busy} onClick={onClose}>{imported?'Done':'Cancel'}</button>{!imported&&<button disabled={busy||!name.trim()} onClick={()=>void upload()}>Import folder</button>}</footer><p>Folder selection depends on your device. You can also use Upload to select multiple photographs.</p></div></div>;
}
