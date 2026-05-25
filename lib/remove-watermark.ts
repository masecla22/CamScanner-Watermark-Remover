import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFArray,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from "pdf-lib";

const textDecoder = new TextDecoder("latin1");
const textEncoder = new TextEncoder();

function bytesToLatin1(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

function latin1ToBytes(str: string): Uint8Array {
  // Use Latin1 round-trip to preserve every byte (content streams are binary-safe text)
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}
// reference to silence unused-var lint
void textEncoder;

function getStreamBytes(stream: PDFRawStream): Uint8Array {
  try {
    return decodePDFRawStream(stream).decode();
  } catch {
    return stream.contents;
  }
}

/**
 * Walk a content stream and remove every `q ... Q` block whose body contains
 * a `Do` operator referencing one of the supplied XObject names.
 *
 * Properly handles nested q/Q pairs.
 */
function stripXObjectDraws(content: string, targetNames: Set<string>): string {
  const out: string[] = [];
  let i = 0;
  const n = content.length;

  const isDelim = (ch: string) =>
    ch === " " ||
    ch === "\t" ||
    ch === "\n" ||
    ch === "\r" ||
    ch === "\f" ||
    ch === "(" ||
    ch === ")" ||
    ch === "<" ||
    ch === ">" ||
    ch === "[" ||
    ch === "]" ||
    ch === "{" ||
    ch === "}" ||
    ch === "/" ||
    ch === "%";

  // Find a `q` token followed by a matching `Q`, and look for a `/Name Do` inside
  // that references one of targetNames. If found, drop the whole block.
  while (i < n) {
    // Try to match a standalone `q` token at position i
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : " ";
    if (
      ch === "q" &&
      (i + 1 >= n || isDelim(content[i + 1])) &&
      isDelim(prev)
    ) {
      // Find matching Q with nesting
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const cj = content[j];
        const pj = content[j - 1];
        const nj = j + 1 < n ? content[j + 1] : " ";
        if (cj === "q" && isDelim(pj) && isDelim(nj)) {
          depth++;
          j++;
        } else if (cj === "Q" && isDelim(pj) && (j + 1 >= n || isDelim(nj))) {
          depth--;
          j++;
        } else if (cj === "(") {
          // skip literal string
          let pdepth = 1;
          j++;
          while (j < n && pdepth > 0) {
            if (content[j] === "\\") {
              j += 2;
              continue;
            }
            if (content[j] === "(") pdepth++;
            else if (content[j] === ")") pdepth--;
            j++;
          }
        } else {
          j++;
        }
      }
      const block = content.slice(i, j);
      // Look for /Name Do inside this block referencing target XObjects.
      const doRegex = /\/([A-Za-z0-9_.+\-#]+)\s+Do\b/g;
      let match: RegExpExecArray | null;
      let hit = false;
      while ((match = doRegex.exec(block)) !== null) {
        if (targetNames.has(match[1])) {
          hit = true;
          break;
        }
      }
      if (hit) {
        // Drop the block entirely.
        i = j;
        continue;
      }
      out.push(block);
      i = j;
      continue;
    }
    out.push(ch);
    i++;
  }
  return out.join("");
}

/**
 * Find XObjects on this page that look like CamScanner watermarks:
 * - Drawn by a `cm` matrix whose scaled height is small (<= 40 user units),
 *   typically at the bottom strip of the page.
 *
 * Also accept the conventional CamScanner name `/X1`.
 */
function detectWatermarkNames(
  content: string,
  resourceXObjectNames: Set<string>
): Set<string> {
  const names = new Set<string>();
  if (resourceXObjectNames.has("X1")) names.add("X1");

  // Pattern:   a b c d e f cm   ... /Name Do
  // Inside the same q/Q block. We'll search for `<num> 0 0 <num> <num> <num> cm`
  // close to a `/Name Do`. If the second number (height scale) is small, treat as watermark.
  const re =
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+cm\s+\/([A-Za-z0-9_.+\-#]+)\s+Do/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const d = parseFloat(m[4]); // y-scale
    const a = parseFloat(m[1]); // x-scale
    const name = m[7];
    if (!resourceXObjectNames.has(name)) continue;
    // A page-sized image has a or d in the hundreds. A watermark is tiny.
    if (Math.abs(d) > 0 && Math.abs(d) <= 40 && Math.abs(a) <= 300) {
      names.add(name);
    }
  }
  return names;
}

export interface RemoveResult {
  bytes: Uint8Array;
  pageCount: number;
  removedAnnots: number;
  removedXObjects: number;
}

export async function removeCamScannerWatermark(
  input: ArrayBuffer | Uint8Array
): Promise<RemoveResult> {
  const pdfDoc = await PDFDocument.load(input, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  let removedAnnots = 0;
  let removedXObjects = 0;

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const node = page.node;

    // 1) Remove all link/widget annotations (CamScanner adds a link annot per page).
    const annots = node.Annots();
    if (annots instanceof PDFArray) {
      const refs: PDFRef[] = [];
      for (let i = 0; i < annots.size(); i++) {
        const v = annots.get(i);
        if (v instanceof PDFRef) refs.push(v);
      }
      for (const r of refs) {
        try {
          node.removeAnnot(r);
          removedAnnots++;
        } catch {
          /* ignore */
        }
      }
      // Also clear inline (non-ref) annots
      node.delete(PDFName.of("Annots"));
    } else if (annots) {
      node.delete(PDFName.of("Annots"));
    }

    // 2) Inspect Resources/XObject and content stream to find + strip watermark draws.
    const resources = node.Resources();
    const xobjects =
      resources?.lookup(PDFName.of("XObject"), PDFDict) ?? undefined;
    const xobjectNames = new Set<string>();
    if (xobjects) {
      for (const key of xobjects.keys()) {
        xobjectNames.add(key.asString().replace(/^\//, ""));
      }
    }

    // Gather all content streams referenced by this page.
    const contentsEntry = node.Contents();
    const streams: PDFRawStream[] = [];
    if (contentsEntry instanceof PDFRawStream) {
      streams.push(contentsEntry);
    } else if (contentsEntry instanceof PDFArray) {
      for (let i = 0; i < contentsEntry.size(); i++) {
        const v = contentsEntry.lookup(i);
        if (v instanceof PDFRawStream) streams.push(v);
      }
    }

    if (streams.length === 0) continue;

    // Concatenate decoded streams so cross-stream q/Q is handled correctly.
    let combined = "";
    for (const s of streams) {
      combined += bytesToLatin1(getStreamBytes(s));
      if (!combined.endsWith("\n")) combined += "\n";
    }

    const watermarkNames = detectWatermarkNames(combined, xobjectNames);
    if (watermarkNames.size === 0) continue;

    const cleaned = stripXObjectDraws(combined, watermarkNames);

    // Replace the page contents with a single new flate-compressed stream.
    const newStream = pdfDoc.context.flateStream(latin1ToBytes(cleaned));
    const newRef = pdfDoc.context.register(newStream);
    node.set(PDFName.of("Contents"), newRef);

    // Remove the watermark XObject entries from Resources/XObject to keep the file lean.
    if (xobjects) {
      for (const name of watermarkNames) {
        xobjects.delete(PDFName.of(name));
        removedXObjects++;
      }
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return {
    bytes,
    pageCount: pages.length,
    removedAnnots,
    removedXObjects,
  };
}
