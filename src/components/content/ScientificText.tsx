import katex from 'katex';
import 'katex/contrib/mhchem';

// Text remains escaped by React. Only KaTeX-generated, untrusted-mode HTML is rendered.
export function ScientificText({ text }: { text: string }) {
  return <span className="whitespace-pre-wrap break-words">{text.split(/(\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\))/g).map((part, i) => {
    const block = part.startsWith('$$') && part.endsWith('$$');
    const inline = part.startsWith('\\(') && part.endsWith('\\)');
    if (!block && !inline) return <span key={i}>{part}</span>;
    try {
      const html = katex.renderToString(part.slice(2, -2), { displayMode: block, throwOnError: true, trust: false, maxExpand: 200, maxSize: 20, strict: 'ignore' });
      return <span key={i} dir="ltr" className="inline-block max-w-full overflow-x-auto align-middle" dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { return <span key={i} dir="ltr">{part}</span>; }
  })}</span>;
}
