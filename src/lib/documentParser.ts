import dayjs from 'dayjs';
import { ABBREVIATIONS } from './programAbbreviations';

// --- Result Types ---

export interface ExtractedProposal {
  clientName: string;
  clientDomain: string;
  programName: string;
  dollarAmountMin: number | null;
  dollarAmountMax: number | null;
  programDescription: string;
  participantCount: number | null;
  contactEmail: string;
}

export interface ExtractedOutreach {
  clientName: string;
  clientDomain: string;
  senderName: string;
  senderEmail: string;
  dateSent: string;
  programName: string;
  contactName: string;
  contactEmail: string;
  notes: string;
}

export type ParseResult =
  | { type: 'proposal'; data: ExtractedProposal }
  | { type: 'outreach'; data: ExtractedOutreach }
  | { type: 'error'; message: string };

// --- Known program name patterns (sorted longest first for greedy matching) ---

const KNOWN_PROGRAMS = Object.keys(ABBREVIATIONS).sort(
  (a, b) => b.length - a.length,
);

// Keywords that commonly start a program name in WPNT proposal filenames
const PROGRAM_KEYWORDS = [
  'Advanced', 'Virtual', 'Presentation', 'Stakeholder', 'Executive',
  'Change', 'Crisis', 'Media', 'Senior', 'Strategic', 'Investor',
];

const WPNT_SUFFIXES = /\s*\(WPNT(?:\s+Communications)?\)\s*/gi;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// --- Main Entry ---

export async function parseDocument(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { type: 'error', message: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 20MB.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'docx') return parseDocx(file);
  if (ext === 'pdf') return parsePdf(file);
  if (ext === 'msg') return parseMsg(file);

  return {
    type: 'error',
    message: `Unsupported file type: .${ext}. Supported: .docx, .pdf, .msg`,
  };
}

// --- .docx Parser ---

async function parseDocx(file: File): Promise<ParseResult> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const { clientName, programName } = extractNamesFromFilename(file.name);
    const clientDomain = guessClientDomain(clientName);
    const { min, max } = extractFeesFromHtml(html);
    const description = extractDescriptionFromHtml(html);
    const participantCount = extractParticipantCount(html);
    const contactEmail = extractEmailFromHtml(html);

    return {
      type: 'proposal',
      data: {
        clientName,
        clientDomain,
        programName,
        dollarAmountMin: min,
        dollarAmountMax: max,
        programDescription: description,
        participantCount,
        contactEmail,
      },
    };
  } catch (e) {
    return { type: 'error', message: `Failed to parse .docx: ${(e as Error).message}` };
  }
}

// --- .pdf Parser ---

async function parsePdf(file: File): Promise<ParseResult> {
  try {
    // Polyfill Promise.withResolvers for Safari < 17.4
    // @ts-expect-error Polyfill for older browsers
    if (typeof Promise.withResolvers === 'undefined') {
      // @ts-expect-error Polyfill for older browsers
      Promise.withResolvers = function <T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }

    const { extractText, getDocumentProxy } = await import('unpdf');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    const { clientName, programName } = extractNamesFromFilename(file.name);
    const clientDomain = guessClientDomain(clientName);
    const { min, max } = extractFeesFromText(text as string);

    return {
      type: 'proposal',
      data: {
        clientName,
        clientDomain,
        programName,
        dollarAmountMin: min,
        dollarAmountMax: max,
        programDescription: '',
        participantCount: null,
        contactEmail: '',
      },
    };
  } catch (e) {
    return { type: 'error', message: `Failed to parse .pdf: ${(e as Error).message}` };
  }
}

// --- .msg Parser ---

async function parseMsg(file: File): Promise<ParseResult> {
  try {
    const MsgReaderModule = await import('wl-msg-reader');
    // Handle both ESM default and named export patterns
    const MsgReader = MsgReaderModule.MSGReader || MsgReaderModule.default?.MSGReader || MsgReaderModule.default;
    const arrayBuffer = await file.arrayBuffer();
    const reader = new MsgReader(arrayBuffer);
    const data = reader.getFileData();

    // Client name from filename prefix (e.g., "Honeywell - 2025-05-02 - ...")
    const filenameParts = file.name.replace(/\.msg$/i, '').split(' - ');
    const clientNameFromFile = filenameParts[0]?.trim() || '';

    // Date from email
    const dateRaw = data.compileTime || data.headers?.match(/Date:\s*(.+)/)?.[1] || '';
    const dateParsed = dayjs(dateRaw);
    const dateSent = dateParsed.isValid() ? dateParsed.format('YYYY-MM-DD') : '';

    // Client domain from To: recipient email
    let clientDomain = '';
    let contactName = '';
    let contactEmail = '';
    if (data.recipients && data.recipients.length > 0) {
      const primary = data.recipients[0];
      contactName = primary.name || '';
      contactEmail = primary.email || '';
      const emailDomain = contactEmail.split('@')[1];
      if (emailDomain) {
        clientDomain = emailDomain.toLowerCase();
      }
    }

    // Program name from subject
    const programName = extractProgramFromSubject(data.subject || '');

    // Body summary for notes
    const bodyText = (data.body || '').trim();
    const notesSummary = bodyText.length > 300
      ? bodyText.substring(0, 300) + '...'
      : bodyText;

    return {
      type: 'outreach',
      data: {
        clientName: clientNameFromFile,
        clientDomain,
        senderName: data.senderName || '',
        senderEmail: data.senderEmail || '',
        dateSent,
        programName,
        contactName,
        contactEmail,
        notes: notesSummary,
      },
    };
  } catch (e) {
    return { type: 'error', message: `Failed to parse .msg: ${(e as Error).message}` };
  }
}

// --- Extraction Helpers ---

function extractNamesFromFilename(filename: string): {
  clientName: string;
  programName: string;
} {
  // Remove extension and WPNT suffixes
  let name = filename.replace(/\.(docx|pdf)$/i, '').replace(WPNT_SUFFIXES, '');

  // Split on " - " delimiters (common in WPNT naming)
  const segments = name.split(/\s+-\s+/);
  name = segments[0].trim();

  // Try to match a known program name in the string
  const nameLower = name.toLowerCase();
  for (const prog of KNOWN_PROGRAMS) {
    const idx = nameLower.indexOf(prog.toLowerCase());
    if (idx > 0) {
      const client = name.substring(0, idx).trim();
      return { clientName: client, programName: prog };
    }
  }

  // Try keyword-based split: find first program keyword
  for (const kw of PROGRAM_KEYWORDS) {
    const idx = name.indexOf(kw);
    if (idx > 0) {
      const client = name.substring(0, idx).trim();
      const progPart = name.substring(idx).trim();
      // Try matching the program part against known programs
      for (const prog of KNOWN_PROGRAMS) {
        if (progPart.toLowerCase().includes(prog.toLowerCase())) {
          return { clientName: client, programName: prog };
        }
      }
      return { clientName: client, programName: progPart };
    }
  }

  // Fallback: entire string is the client name
  return { clientName: name, programName: '' };
}

function guessClientDomain(clientName: string): string {
  if (!clientName) return '';
  // Simple heuristic: lowercase, remove spaces/punctuation, add .com
  return clientName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
}

function extractFeesFromHtml(html: string): { min: number | null; max: number | null } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    // First row = headers (mammoth doesn't produce <th>)
    const headerCells = rows[0].querySelectorAll('td');
    let feeColIndex = -1;
    const skipColIndices: number[] = [];

    headerCells.forEach((cell, i) => {
      const text = (cell.textContent || '').trim().toLowerCase();
      if (text.includes('professional fee') || (text.includes('fee') && !text.includes('per person'))) {
        feeColIndex = i;
      }
      if (text.includes('per person') || text.includes('cost per')) {
        skipColIndices.push(i);
      }
    });

    if (feeColIndex >= 0) {
      const fees: number[] = [];
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll('td');
        if (cells[feeColIndex]) {
          const amount = parseDollarAmount(cells[feeColIndex].textContent || '');
          if (amount !== null && amount >= 1000 && amount <= 1000000) {
            fees.push(amount);
          }
        }
      }
      if (fees.length > 0) {
        return { min: Math.min(...fees), max: Math.max(...fees) };
      }
    }
  }

  // Tier 3 fallback: regex all dollar amounts from full text
  return extractFeesFromText(doc.body.textContent || '');
}

function extractFeesFromText(text: string): { min: number | null; max: number | null } {
  const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
  const matches = text.match(dollarRegex) || [];
  const amounts = matches
    .map(parseDollarAmount)
    .filter((a): a is number => a !== null && a >= 1000 && a <= 1000000);

  if (amounts.length === 0) return { min: null, max: null };
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

function parseDollarAmount(text: string): number | null {
  const cleaned = text.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractDescriptionFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Take first few paragraphs as description
  const paras = doc.querySelectorAll('p');
  const texts: string[] = [];
  for (let i = 0; i < Math.min(paras.length, 5); i++) {
    const t = (paras[i].textContent || '').trim();
    if (t.length > 20) texts.push(t);
  }
  return texts.join(' ').substring(0, 500);
}

function extractParticipantCount(html: string): number | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || '';
  // Look for patterns like "up to twenty-four participants" or "24 participants"
  const match = text.match(/(?:up to\s+)?(\d+)\s+participants/i);
  if (match) return parseInt(match[1], 10);
  // Number words
  const wordNumbers: Record<string, number> = {
    'twenty-four': 24, 'twenty-five': 25, 'twenty': 20,
    'thirty': 30, 'fifteen': 15, 'ten': 10, 'twelve': 12,
  };
  for (const [word, num] of Object.entries(wordNumbers)) {
    if (text.toLowerCase().includes(`${word} participants`)) return num;
  }
  return null;
}

function extractEmailFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || '';
  const match = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  return match ? match[0] : '';
}

function extractProgramFromSubject(subject: string): string {
  // Strip common WPNT prefixes from subject lines
  let cleaned = subject
    .replace(/^\[?\s*WPNT\s*(Participant\s*)?(Feedback|Evaluations|Program\s*Evaluations?)\s*[:\]]\s*/i, '')
    .replace(/^WPNT\s*(Participant\s*)?(Feedback|Evaluations|Program\s*Evaluations?)\s*[-–]\s*/i, '')
    .trim();

  // Try to match against known program names
  for (const prog of KNOWN_PROGRAMS) {
    if (cleaned.toLowerCase().includes(prog.toLowerCase())) {
      return prog;
    }
  }

  // Strip date suffixes like "- April 7, 2025" or "- 26 March 2025"
  cleaned = cleaned.replace(/\s*[-–]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '');
  cleaned = cleaned.replace(/\s*[-–]\s*\w+\s+\d{1,2},?\s+\d{4}\s*$/, '');

  // Strip client prefix patterns like "Honeywell's " or "bp - "
  cleaned = cleaned.replace(/^[\w\s]+['']s\s+/i, '');
  cleaned = cleaned.replace(/^[\w\s]+\s*[-–]\s*/i, '');

  return cleaned.trim() || subject;
}
