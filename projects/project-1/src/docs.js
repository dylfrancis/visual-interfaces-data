import './style.css';
import { marked } from 'marked';

const md = await fetch('/documentation.md').then(r => r.text());
document.getElementById('docs-content').innerHTML = marked(md);
