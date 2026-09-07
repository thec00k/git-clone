/** Only public SoundCloud URLs; no credentials or private share tokens in room backups. */
export function soundCloudUrl(input:string):string|null{
 try{const u=new URL(input.trim());if(u.protocol!=='https:'||!['soundcloud.com','www.soundcloud.com'].includes(u.hostname)||u.username||u.password||u.port)return null;const parts=u.pathname.split('/').filter(Boolean);if(!parts.length||parts.length>3||!parts.every(p=>/^[a-zA-Z0-9_-]+$/.test(p))||['discover','you','search','settings','stream','signin'].includes(parts[0]))return null;if(parts.length===3&&parts[1]!=='sets')return null;return 'https://soundcloud.com/'+parts.join('/');}catch{return null;}
}
