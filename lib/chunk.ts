/**
 * Tiny, dependency-free document chunker for ingestion.
 *
 * Provider docs are short (profile / reviews / service notes), so a paragraph-
 * aware splitter with a soft character cap is plenty — no need to pull in a
 * heavyweight text splitter. Each chunk keeps its `source` label so citations can
 * say *where* in the provider's docs a fact came from.
 */

export interface RawDoc {
  source: string; // "profile" | "reviews" | "service_notes" | ...
  content: string;
}

export interface Chunk {
  source: string;
  content: string;
}

const MAX_CHARS = 600;

export function chunkDoc(doc: RawDoc): Chunk[] {
  const paragraphs = doc.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.trim();
    if (text) chunks.push({ source: doc.source, content: text });
    buffer = "";
  };

  for (const para of paragraphs) {
    if (para.length >= MAX_CHARS) {
      flush();
      // Split an oversized paragraph on sentence boundaries.
      for (const sentence of para.match(/[^.!?]+[.!?]*/g) ?? [para]) {
        if (buffer.length + sentence.length > MAX_CHARS) flush();
        buffer += sentence;
      }
      flush();
    } else if (buffer.length + para.length + 2 > MAX_CHARS) {
      flush();
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  flush();
  return chunks;
}

export function chunkDocs(docs: RawDoc[]): Chunk[] {
  return docs.flatMap(chunkDoc);
}
