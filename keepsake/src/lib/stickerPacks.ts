import { STICKER_GLYPHS } from "../types/scrapbook";

/** Sticker packs sold from the desk drawer. Everyday is always owned. */

export interface StickerPack {
  id: string;
  title: string;
  blurb: string;
  price: number;
  glyphs: readonly string[];
}

export const EVERYDAY_PACK_ID = "everyday";

export const STICKER_PACKS: StickerPack[] = [
  {
    id: EVERYDAY_PACK_ID,
    title: "Everyday",
    blurb: "The tin that already lives in the drawer.",
    price: 0,
    glyphs: STICKER_GLYPHS,
  },
  {id:'keepsake-field',title:'Woodland keepsakes',blurb:'Original paper-cut leaves, a moth and the cup beside your book.',price:0,glyphs:['keepsake:oak-leaf','keepsake:toadstool','keepsake:moth','keepsake:teacup','keepsake:acorn']},
  {id:'keepsake-tide',title:'Tide-pool keepsakes',blurb:'Original conch, sea glass, sailboat and ocean postmark illustrations.',price:0,glyphs:['keepsake:conch','keepsake:sailboat','keepsake:sea-glass','keepsake:tidal-postmark','keepsake:beach-umbrella']},
  {id:'keepsake-city',title:'City afterglow keepsakes',blurb:'A neon cat, mixtape, ramen, rainy window and pocket arcade.',price:0,glyphs:['keepsake:neon-cat','keepsake:city-cassette','keepsake:ramen','keepsake:city-window','keepsake:arcade']},
  {id:'keepsake-snow',title:'Snowy mountain keepsakes',blurb:'A cabin, wool mittens, alpine peaks, pinecone and warm cocoa.',price:0,glyphs:['keepsake:snow-cabin','keepsake:mittens','keepsake:mountain','keepsake:pinecone','keepsake:cocoa']},
  {id:'keepsake-storm',title:'Lighthouse keepsakes',blurb:'A lighthouse, lantern, compass, passing storm and bottled message.',price:0,glyphs:['keepsake:lighthouse','keepsake:storm-lantern','keepsake:compass','keepsake:storm-cloud','keepsake:message-bottle']},
  {
    id: "garden",
    title: "Garden cuttings",
    blurb: "Pressed petals and a little dirt under the nails.",
    price: 4,
    glyphs: ["🌸", "🌿", "🍃", "🌷", "🌼", "🦋", "🍄", "🪴"],
  },
  {
    id: "post",
    title: "Post office",
    blurb: "Wax, twine, and things that still arrive by hand.",
    price: 4,
    glyphs: ["✉️", "📦", "🎀", "🏷️", "📌", "📎", "💌", "📮"],
  },
  {
    id: "night",
    title: "After dark",
    blurb: "The hour the lamp is the only honest light.",
    price: 5,
    glyphs: ["🌙", "✨", "🕯️", "🦇", "🦉", "🌌", "⭐", "🛌"],
  },
  {
    id: "travel",
    title: "Ticket stubs",
    blurb: "Maps folded wrong and kept anyway.",
    price: 5,
    glyphs: ["🚂", "🗺️", "🧭", "🧳", "🚲", "⛵", "🗽", "🎫"],
  },
  {
    id: "kitchen",
    title: "Sunday kitchen",
    blurb: "Butter on the counter, something in the oven.",
    price: 4,
    glyphs: ["🥐", "🫖", "🍯", "🧁", "🧀", "🥖", "🍓", "🥄"],
  },
];

export const STARTING_STAMPS = 12;

export function packById(id: string): StickerPack | undefined {
  return STICKER_PACKS.find((p) => p.id === id);
}

export function ownedStickerGlyphs(ownedPackIds: string[]): string[] {
  const ids = new Set(ownedPackIds.includes(EVERYDAY_PACK_ID) ? ownedPackIds : [EVERYDAY_PACK_ID, ...ownedPackIds]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pack of STICKER_PACKS) {
    if (!ids.has(pack.id)) continue;
    for (const g of pack.glyphs) {
      if (seen.has(g)) continue;
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}
