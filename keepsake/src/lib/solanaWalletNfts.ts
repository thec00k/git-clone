import {cardMetadataReference} from './cardMetadata.ts';

export type WalletKind='phantom'|'backpack';
export interface WalletNft {id:string;title:string;image:string;collection?:string}
const DAS_STORAGE_KEY='ks-solana-das-rpc';
interface InjectedProvider {isPhantom?:boolean;publicKey?:{toString():string};connect(options?:{onlyIfTrusted?:boolean}):Promise<{publicKey?:{toString():string}}|void>}

declare global {
 interface Window {
  phantom?:{solana?:InjectedProvider};
  backpack?:InjectedProvider|{solana?:InjectedProvider};
 }
}

export function injectedWallet(kind:WalletKind):InjectedProvider|undefined {
 if(kind==='phantom')return window.phantom?.solana;
 const backpack=window.backpack;
 return backpack&&'solana' in backpack&&backpack.solana?backpack.solana:backpack as InjectedProvider|undefined;
}

export async function connectWallet(kind:WalletKind) {
 const provider=injectedWallet(kind);
 if(!provider)throw new Error(`${kind==='phantom'?'Phantom':'Backpack'} is not installed in this browser.`);
 const result=await provider.connect();
 const publicKey=result?.publicKey??provider.publicKey;
 const address=publicKey?.toString();
 if(!address)throw new Error('The wallet connected without providing a Solana address.');
 return address;
}

export function hasSolanaDasEndpoint() {return Boolean(localStorage.getItem(DAS_STORAGE_KEY)||String(import.meta.env.VITE_SOLANA_DAS_RPC_URL??'').trim());}
export function saveSolanaDasEndpoint(value:string) {
 const url=new URL(value.trim());
 if(url.protocol!=='https:')throw new Error('The NFT indexer must use HTTPS.');
 localStorage.setItem(DAS_STORAGE_KEY,url.href);
}
function dasEndpoint() {
 const configured=localStorage.getItem(DAS_STORAGE_KEY)||String(import.meta.env.VITE_SOLANA_DAS_RPC_URL??'').trim();
 if(!configured)throw new Error('Add the Helius endpoint below before connecting a wallet.');
 const url=new URL(configured,window.location.origin);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('The NFT indexer must use HTTPS.');
 return url.href;
}

type DasItem={id?:unknown;interface?:unknown;content?:{metadata?:{name?:unknown};links?:{image?:unknown};files?:Array<{uri?:unknown;cdn_uri?:unknown;mime?:unknown}>};grouping?:Array<{group_key?:unknown;group_value?:unknown}>};
export function nftAssetsFromDas(items:unknown):WalletNft[] {
 if(!Array.isArray(items))return [];
 const found:WalletNft[]=[];
 for(const item of items as DasItem[]){
  if(typeof item.id!=='string')continue;
  const file=item.content?.files?.find(f=>typeof(f.cdn_uri??f.uri)==='string'&&(!f.mime||String(f.mime).startsWith('image/')));
  const raw=item.content?.links?.image??file?.cdn_uri??file?.uri;
  if(typeof raw!=='string')continue;
  try {const title=typeof item.content?.metadata?.name==='string'&&item.content.metadata.name.trim()?item.content.metadata.name.trim():`NFT ${item.id.slice(0,6)}`;const ref=cardMetadataReference({name:title,image:raw},title);found.push({id:item.id,title:ref.title,image:ref.image,collection:item.grouping?.find(g=>g.group_key==='collection')?.group_value as string|undefined});}
  catch {continue;}
 }
 return found;
}

export async function loadWalletNfts(ownerAddress:string) {
 const response=await fetch(dasEndpoint(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'keepsake-wallet',method:'getAssetsByOwner',params:{ownerAddress,page:1,limit:250,displayOptions:{showFungible:false,showNativeBalance:false}}})});
 if(!response.ok)throw new Error(`The NFT indexer returned ${response.status}. Check its URL and access key.`);
 const body=await response.json() as {result?:{items?:unknown};error?:{message?:string}};
 if(body.error)throw new Error(body.error.message||'The NFT indexer could not load this wallet.');
 return nftAssetsFromDas(body.result?.items);
}
