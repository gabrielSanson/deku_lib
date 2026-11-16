// A tiny Markdown subset for the platform's legal texts: "# " and "## " headings, "- " list
// items and paragraphs. Rendered as plain text blocks, so no HTML from a file reaches the page.

export type DocBlock = { type: 'h1' | 'h2' | 'p'; text: string } | { type: 'ul'; items: string[] };

export function parseDocText(source: string): DocBlock[] {
	const blocks: DocBlock[] = [];
	let para: string[] = [];
	let list: string[] | null = null;
	const flush = () => {
		if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
		para = [];
		if (list) blocks.push({ type: 'ul', items: list });
		list = null;
	};
	for (const raw of source.split('\n')) {
		const line = raw.trim();
		if (!line) {
			flush();
		} else if (line.startsWith('## ')) {
			flush();
			blocks.push({ type: 'h2', text: line.slice(3) });
		} else if (line.startsWith('# ')) {
			flush();
			blocks.push({ type: 'h1', text: line.slice(2) });
		} else if (line.startsWith('- ')) {
			if (para.length) {
				blocks.push({ type: 'p', text: para.join(' ') });
				para = [];
			}
			(list ??= []).push(line.slice(2));
		} else {
			if (list) {
				blocks.push({ type: 'ul', items: list });
				list = null;
			}
			para.push(line);
		}
	}
	flush();
	return blocks;
}
