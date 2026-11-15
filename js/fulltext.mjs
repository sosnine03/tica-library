const normalize = text => text.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[\u00ad\ufffe]/g, '').replace(/[-–—_]/g, ' ');

export function searchDocuments(documents, query) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const results = [];
  for (const doc of documents) {
    const name = normalize(doc.name);
    const nameHits = words.filter(word => name.includes(word)).length;
    let best;
    for (const page of doc.pages) {
      const text = normalize(page.text);
      if (!words.every(word => name.includes(word) || text.includes(word))) continue;
      const score = nameHits * 100 + words.filter(word => text.includes(word)).length;
      if (best && best.score >= score) continue;
      const positions = words.map(word => text.indexOf(word)).filter(n => n >= 0);
      const start = positions.length ? Math.max(0, Math.min(...positions) - 80) : 0;
      const snippet = (start ? '…' : '') + page.text.slice(start, start + 240) + (page.text.length > start + 240 ? '…' : '');
      best = { path: doc.path, name: doc.name, page: page.page, snippet, score };
    }
    // An image-only PDF is still discoverable by its filename.
    if (!best && nameHits === words.length) best = { path:doc.path, name:doc.name, page:1, snippet:'Совпадение в названии документа.', score:nameHits*100 };
    if (best) results.push(best);
  }
  return results.sort((a,b) => b.score-a.score || a.name.localeCompare(b.name,'ru'));
}
