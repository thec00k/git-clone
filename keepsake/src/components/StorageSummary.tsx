import {useEffect,useState} from 'react';
export function StorageSummary(){
 const [usage,setUsage]=useState<StorageEstimate|null>(null);
 useEffect(()=>{let live=true;navigator.storage?.estimate?.().then(value=>{if(live)setUsage(value);}).catch(()=>{});return()=>{live=false;};},[]);
 return <p className="text-sm my-3">{usage?.quota!==undefined?`Browser storage: ${((usage.usage??0)/1048576).toFixed(1)} MB used of approximately ${(usage.quota/1048576).toFixed(0)} MB available to this site.`:'Your browser does not report its storage allowance.'} Photographs are stored separately and reused between pages. Folder imports support up to 100 files or 200 MB at a time.</p>;
}
