// Standalone design preview of the paper controls used in the editor.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PaperSlipSelect} from '../components/PaperSlipSelect';
import {PetalInkPicker} from '../components/PetalInkPicker';
import {PAPER_MATERIALS} from '../lib/materials';
import {SHARPIE_INKS} from '../types/scrapbook';
import '../fonts.css';
import './paper-controls-preview.css';

const PAPERS = Object.entries(PAPER_MATERIALS).map(([id, s]) => ({
  value: id,
  label: s.name,
  swatch: s.color,
}));

function Preview() {
  const [paper, setPaper] = useState(PAPERS[0].value);
  const [ink, setInk] = useState<string>(SHARPIE_INKS[0].color);
  return (
    <main className="ks-pc">
      <header>
        <p>KEEPSAKE / CONTROL STUDY</p>
        <h1>Paper you can pick from.</h1>
        <p>A menu that spills out like paper slips, and an ink picker that opens like a pressed flower.</p>
      </header>
      <section className="ks-pc-board">
        <figure>
          <div style={{width: 250}}>
            <PaperSlipSelect label="Page paper" value={paper} options={PAPERS} onChange={setPaper} />
          </div>
          <figcaption>Paper slip menu · click the tag</figcaption>
        </figure>
        <figure>
          <PetalInkPicker inks={SHARPIE_INKS} value={ink} onChange={setInk} />
          <figcaption>Pressed-flower ink picker · click the centre</figcaption>
        </figure>
      </section>
      <section className="ks-pc-toolbar" aria-label="Compact picker as used in the caption toolbar">
        <h2>In the caption toolbar</h2>
        <div>
          <PetalInkPicker compact inks={SHARPIE_INKS} value={ink} onChange={setInk} />
          <span style={{color: ink}}>Summer 2004</span>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
