import {ShopRoomVariants,ShopCreativeExtras} from './ShopCreativeExtras';
import {useNav} from '../store/nav';
import {RoomShopGoods} from './RoomShopGoods';
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { EVERYDAY_PACK_ID, STICKER_PACKS } from "../lib/stickerPacks";
import { useApp } from "../store/appStore";

export function StickerStore({ onClose }: { onClose: () => void }) {
  const { state, buyStickerPack } = useApp(); const {isVisitor}=useNav();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  const [tab,setTab]=useState('stickers');
  const [note, setNote] = useState<string | null>(null);

  if(isVisitor)return null;
  return (
    <div className="ks-sticker-shop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="ks-sticker-shop-panel ks-panel"
        role="dialog"
        aria-modal="true"
        aria-label="The drawer mini shop"
        data-sticker-store
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl text-paper">The drawer</p>
            <p className="ks-caption text-paper/70" style={{ fontSize: "1.05rem" }}>
              little treasures, paid in stamps
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="ks-stamp-count" data-stamps>
              {state.stamps} stamps
            </span>
            <button type="button" className="ks-chip" aria-label="Close the drawer" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-paper/55">A local shop in the drawer — nothing leaves this room, and no real money changes hands.</p>
        {note && (
          <p className="mb-3 text-sm text-accent-fg" role="status">
            {note}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Shop categories">{[['stickers','Sticker packs'],['sill','Windowsill'],['variants','Room variants'],['extras','Creative extras']].map(([id,label])=><button key={id} className="ks-tool" aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
        {tab==='sill'?<RoomShopGoods/>:tab==='variants'?<ShopRoomVariants/>:tab==='extras'?<ShopCreativeExtras/>:<ul className="ks-sticker-shop-list">
          {STICKER_PACKS.filter((p) => p.id !== EVERYDAY_PACK_ID).map((pack) => {
            const owned = state.ownedStickerPacks.includes(pack.id);
            const short = !owned && state.stamps < pack.price;
            return (
              <li key={pack.id} className="ks-sticker-pack" data-pack={pack.id} data-owned={owned ? "1" : "0"}>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-paper">{pack.title}</p>
                  <p className="text-sm text-paper/55">{pack.blurb}</p>
                  <p className="ks-sticker-pack-glyphs" aria-hidden="true">
                    {pack.glyphs.join(" ")}
                  </p>
                </div>
                {owned ? (
                  <span className="ks-sticker-owned">In the tin</span>
                ) : (
                  <button
                    type="button"
                    className="ks-tool ks-tool--accent"
                    disabled={short}
                    onClick={() => {
                      const result = buyStickerPack(pack.id);
                      if (result === "ok") setNote(`Tucked “${pack.title}” into the tin.`);
                      else if (result === "short") setNote("Not enough stamps for that pack.");
                    }}
                  >
                    {pack.price} stamps
                  </button>
                )}
              </li>
            );
          })}
        </ul>}
      </div>
    </div>
  );
}
