// Screenshot of every caption look on paper. Plain DOM, so it works under software rendering.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5184',out=process.env.SHOT_DIR||'ci-shots';
mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:620},reducedMotion:'reduce'});
await p.goto(base+'/lettering-sheet.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
await p.screenshot({path:out+'/lettering.png'});await b.close();
