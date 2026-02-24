import './style.css';
import { marked } from 'marked';

const md = await fetch(`${import.meta.env.BASE_URL}documentation.md`).then(r => r.text());
document.getElementById('docs-content').innerHTML = marked(md);
