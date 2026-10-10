import {createRoot} from 'react-dom/client';
import {RansomText} from '../components/RansomText';
const host = document.getElementById('r');
if (host) createRoot(host).render(<RansomText text="Summer 2004" />);
