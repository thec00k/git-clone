const IMAGE_DATA=/^data:image\/(png|jpeg|webp|gif);base64,/i;
const PRIVATE_HOST=/^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[?::1\]?)$/i;

export interface CardMetadataReference {title:string;image:string}

/** Read the small interoperable subset shared by Metaplex and NFT metadata. */
export function cardMetadataReference(value:unknown,fallback='Imported card'):CardMetadataReference {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Card metadata must be one JSON object.');
 const item=value as Record<string,unknown>;
 const properties=item.properties&&typeof item.properties==='object'&&!Array.isArray(item.properties)?item.properties as Record<string,unknown>:undefined;
 const files=Array.isArray(properties?.files)?properties.files:[];
 const candidate=[item.image,item.image_url,...files.map(file=>file&&typeof file==='object'?(file as Record<string,unknown>).uri:undefined)].find(v=>typeof v==='string'&&v.length>0);
 if(typeof candidate!=='string')throw new Error('Metadata needs an image, image_url, or properties.files[].uri value.');
 let image=candidate.trim();
 if(image.startsWith('ipfs://'))image=`https://ipfs.io/ipfs/${image.slice(7).replace(/^ipfs\//,'')}`;
 if(!IMAGE_DATA.test(image)){
  let url:URL;try{url=new URL(image);}catch{throw new Error('The metadata image URL is invalid.');}
  if(url.protocol!=='https:'||url.username||url.password||PRIVATE_HOST.test(url.hostname))throw new Error('Metadata images must use a public HTTPS or IPFS address.');
  image=url.href;
 }
 const rawTitle=typeof item.name==='string'?item.name:typeof item.symbol==='string'?item.symbol:fallback;
 return {title:rawTitle.trim().slice(0,100)||fallback,image};
}
