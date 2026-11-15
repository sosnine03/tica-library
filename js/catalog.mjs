const CATALOG_URL = new URL('../data/catalog.json', import.meta.url);
const normalize = value => value.normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[-–—_]/g,' ');

function validPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('\\')) throw new Error('Недопустимый путь к документу.');
  const parts=path.split('/').slice(1);
  if (parts.some(part => part === '.' || part === '..' || !part && path !== '/')) throw new Error('Недопустимый путь к документу.');
  return ('/' + parts.map(part=>part.normalize('NFC')).join('/')).replace(/\/$/,'') || '/';
}
const fileUrl = path => new URL('../documents/'+path.slice(1).split('/').map(encodeURIComponent).join('/'),CATALOG_URL).href;

export function matchesSearch(text, query) { const haystack=normalize(text); return normalize(query).trim().split(/\s+/).every(word=>haystack.includes(word)); }
export function formatBytes(bytes) { if(!bytes)return '0 Б'; const units=['Б','КБ','МБ','ГБ']; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1); return `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(bytes/1024**i)} ${units[i]}`; }
export function viewerUrlFor(path,page) { const url=new URL('viewer.html',globalThis.location?.href||'https://example.test/'); url.searchParams.set('path',path); if(Number.isInteger(page)&&page>0)url.searchParams.set('page',page); return `${url.pathname}${url.search}`; }
export function libraryUrlFor(path) { const url=new URL('library.html',globalThis.location?.href||'https://example.test/'); url.searchParams.set('path',path); return `${url.pathname}${url.search}`; }

export async function fetchResource(input,fetchImpl=fetch) {
  const path=validPath(input);
  const response=await fetchImpl(CATALOG_URL);
  if(!response.ok)throw new Error(`Каталог библиотеки не загрузился: ${response.status}`);
  const catalog=await response.json();
  const docs=catalog.documents||[];
  const exact=docs.find(doc=>doc.path.normalize('NFC')===path);
  if(exact)return {...exact,type:'file',mime_type:'application/pdf',file:fileUrl(exact.path)};
  const prefix=path==='/'?'/':path+'/';
  const descendants=docs.filter(doc=>doc.path.normalize('NFC').startsWith(prefix));
  if(!descendants.length)throw new Error('Раздел или документ не найден.');
  const children=new Map();
  for(const doc of descendants){
    const remainder=doc.path.slice(prefix.length); const [first,...rest]=remainder.split('/');
    if(rest.length){ const childPath=(path==='/'?'':path)+'/'+first; if(!children.has(childPath))children.set(childPath,{type:'dir',path:childPath,name:first}); }
    else children.set(doc.path,{...doc,type:'file',mime_type:'application/pdf',file:fileUrl(doc.path)});
  }
  return {type:'dir',path,name:path==='/'?'Вся библиотека':path.split('/').pop(),_embedded:{items:[...children.values()].sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name,'ru'):a.type==='dir'?-1:1)}};
}
