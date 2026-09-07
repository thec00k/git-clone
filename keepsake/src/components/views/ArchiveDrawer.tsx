import { Lock } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav, type ArchiveFolderKey } from "../../store/nav";
import { ViewShell } from "./ViewShell";

export function ArchiveDrawer() {
  const { state } = useApp();
  const { isVisitor, openArchiveFolder } = useNav();
  const tabs = state.archiveTabs;
  const photos = state.archive;
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
        <p className="ks-archive-well-note">
          Lift a file by the tab. The front one is every photograph. The others keep a category.
        </p>
        <div className="ks-archive-bar" aria-hidden="true" />
        <div className="ks-archive-rail" role="list" aria-label="Archive files">
          {files.map((file, i) => (
            <button
              key={file.id}
              type="button"
              role="listitem"
              className={`ks-archive-file ks-archive-file--${file.kind}`}
              style={{ zIndex: files.length - i, ["--ks-file-i" as string]: i }}
              data-archive-file={file.id}
              aria-label={
                file.id === "all"
                  ? `All photographs, ${file.count}`
                  : `${file.name}, ${file.count} photograph${file.count === 1 ? "" : "s"}`
              }
              onClick={() => openArchiveFolder(file.id)}
            >
              <span className="ks-archive-file-hook" aria-hidden="true" />
              <span className="ks-archive-file-tab">{file.name}</span>
              <span className="ks-archive-file-body">
                <span className="ks-archive-file-count">
                  {file.count} photograph{file.count === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </ViewShell>
  );
}
