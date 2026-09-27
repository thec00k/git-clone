import { Lock } from "lucide-react";
import {useRef, useState, type CSSProperties} from 'react';
import { useApp } from "../../store/appStore";
import { useNav, type ArchiveFolderKey } from "../../store/nav";
import { ViewShell } from "./ViewShell";

export function ArchiveDrawer() {
  const { state } = useApp();
  const { isVisitor, openArchiveFolder } = useNav();
  const tabs = state.archiveTabs;
  const photos = state.archive;
  const [query,setQuery]=useState('');
  const [sort, setSort] = useState('recent');
  const rail=useRef<HTMLUListElement>(null);
  const favCount = photos.filter((p) => p.favorite).length;

  const files: { id: ArchiveFolderKey; name: string; count: number; kind: "all" | "favorites" | "tab" }[] = [
    { id: "all", name: "All", count: photos.length, kind: "all" },
    { id: "favorites", name: "Favourites", count: favCount, kind: "favorites" },
    ...tabs.map((t) => ({
      id: t.id,
      name: t.name,
      count: photos.filter((p) => p.categories.includes(t.id)).length,
      kind: "tab" as const,
    })),
  ];
  // Tabs are appended when created. Keep the two collection shortcuts pinned;
  // reverse that stored creation order for newest-first without mutating memories.
  const categories = files.slice(2);
  if (sort === 'recent') categories.reverse();
  if (sort === 'alphabetical') categories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  const visibleFiles = [...files.slice(0, 2), ...categories].filter(file => file.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  if (isVisitor) {
    return (
      <ViewShell title="The archive" subtitle="filing cabinet">
        <div className="mt-16 flex flex-col items-center gap-3 text-paper/60">
          <Lock size={26} /> The archive is private.
        </div>
      </ViewShell>
    );
  }

  return (
    <ViewShell title="The archive" subtitle="the drawer is open" fill>
      <div className="ks-archive-well" data-archive-drawer>
        <div className="ks-archive-drawer-heading"><span>YOUR PHOTOGRAPHS, FILED AWAY</span>
          <p className="ks-archive-well-note">Choose a named tab to open its photographs.</p>
          <label className="ks-archive-sort">Sort folders
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="recent">Recently added</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="date">Date added · oldest first</option>
            </select>
          </label>
          {files.length>8&&<input className="ks-archive-find" aria-label="Find a folder" placeholder="Find a folder…" value={query} onChange={e=>setQuery(e.target.value)}/>}
        </div>
        <div className="ks-archive-bar" aria-hidden="true" />
        <div className="ks-archive-drawer-scroll">
        <ul ref={rail} className="ks-archive-rail" aria-label="Archive files">
          {visibleFiles.map((file, i) => (
            <li key={file.id} className="ks-archive-file-slot" style={{'--ks-file-i':i, '--ks-tab-offset':`${(i%3)*22}%`} as CSSProperties}>
            <button
              type="button"
              className={`ks-archive-file ks-archive-file--${file.kind}`}
              data-archive-file={file.id}
              title={file.name}
              aria-label={
                file.id === "all"
                  ? `All photographs, ${file.count}`
                  : `${file.name}, ${file.count} photograph${file.count === 1 ? "" : "s"}`
              }
              onClick={() => openArchiveFolder(file.id)}
              onKeyDown={e=>{
                const buttons=Array.from(rail.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
                const next=e.key==='ArrowDown'||e.key==='ArrowRight'?i+1:e.key==='ArrowUp'||e.key==='ArrowLeft'?i-1:e.key==='Home'?0:e.key==='End'?buttons.length-1:null;
                if(next!==null){e.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,next))]?.focus();}
              }}
            >
              <span className="ks-archive-file-hook" aria-hidden="true" />
              <span className="ks-archive-file-tab">{file.name}</span>
              <span className="ks-archive-file-body">
                <span className="ks-archive-file-title">{file.name}</span>
                <span className="ks-archive-file-count">
                  {file.count} photograph{file.count === 1 ? "" : "s"}
                </span>
              </span>
            </button>
            </li>
          ))}
        </ul>
        {visibleFiles.length===0&&<p className="ks-archive-empty" role="status">No folders match “{query}”.</p>}
        </div>
        <div className="ks-archive-drawer-front" aria-hidden="true"><span>PHOTOGRAPH ARCHIVE</span><i/></div>
      </div>
    </ViewShell>
  );
}
