import {defineConfig} from 'vite';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
export default defineConfig({plugins:[{name:'save-paper-textures',configureServer(server){server.middlewares.use('/save', (req,res)=>{const id=req.url.slice(1);if(req.method!=='POST'||!['warm-cream','handmade-cotton','creased-journal'].includes(id)){res.statusCode=400;res.end();return;}let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{writeFileSync(resolve('..',`keepsake-${id}.png`),Buffer.from(body.split(',')[1],'base64'));res.end('saved');});});}}]});
