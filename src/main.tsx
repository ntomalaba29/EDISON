import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installEdisonCsrfFetch } from './lib/csrfFetch.ts';

installEdisonCsrfFetch();

createRoot(document.getElementById('root')!).render(<App />);
