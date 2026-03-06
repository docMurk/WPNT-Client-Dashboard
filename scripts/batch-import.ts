/**
 * Batch Import Script for WPNT Client Engagement Dashboard
 *
 * Generates import-data.json from the proposal files and .msg follow-up emails
 * in "Files for test entry/".
 *
 * Usage:  npx tsx scripts/batch-import.ts
 * Output: scripts/import-data.json
 *
 * After reviewing the JSON, load it in the browser console:
 *   window.__wpntImport(JSON.stringify(data))
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Types (mirrors src/types/outreach.ts but standalone for Node)
// ---------------------------------------------------------------------------

interface Client {
  id: string;
  name: string;
  clientDomain: string;
  logoUrl: string;
  industry: string;
  isActive: boolean;
}

interface OutreachEntry {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  outreachType: 'Proposal' | 'Follow-Up';
  senderName: string;
  senderEmail: string;
  dateSent: string;
  dollarAmountMin: number | null;
  dollarAmountMax: number | null;
  participantCount: number | null;
  participantCountMax: number | null;
  programName: string;
  programDescription: string;
  status: 'Open' | 'Accepted' | 'Declined' | 'No Response' | 'Other';
  outcomeSpend: boolean;
  spendAmount: number | null;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  notes: string;
  documentLink: string;
  sharepointLink: string;
  declineNotes: string;
  crmOwner: '' | 'Justin' | 'Sam';
  isArchived: boolean;
}

// ---------------------------------------------------------------------------
// Client definitions
// ---------------------------------------------------------------------------

const CLIENT_DEFS: { id: string; name: string; domain: string; industry: string }[] = [
  { id: 'c-amazon-ixt', name: 'Amazon IXT', domain: 'amazon.com', industry: 'Technology' },
  { id: 'c-deanship', name: 'Academic (Deanship)', domain: '', industry: 'Higher Education' },
  { id: 'c-fortive-hengstler', name: 'Fortive/Hengstler', domain: 'fortive.com', industry: 'Industrial Technology' },
  { id: 'c-bechtel', name: 'Bechtel', domain: 'bechtel.com', industry: 'Engineering & Construction' },
  { id: 'c-phillips66', name: 'Phillips 66', domain: 'phillips66.com', industry: 'Energy / Refining' },
  { id: 'c-nasa-jsc', name: 'NASA JSC', domain: 'nasa.gov', industry: 'Government / Aerospace' },
  { id: 'c-citi', name: 'Citi', domain: 'citi.com', industry: 'Financial Services' },
  { id: 'c-aramco', name: 'Aramco', domain: 'aramco.com', industry: 'Energy / Oil & Gas' },
  { id: 'c-halliburton', name: 'Halliburton', domain: 'halliburton.com', industry: 'Energy / Oilfield Services' },
  { id: 'c-bp', name: 'bp', domain: 'bp.com', industry: 'Energy / Oil & Gas' },
  { id: 'c-aws', name: 'AWS', domain: 'aws.amazon.com', industry: 'Technology / Cloud' },
  { id: 'c-exxonmobil', name: 'ExxonMobil', domain: 'exxonmobil.com', industry: 'Energy / Oil & Gas' },
  { id: 'c-microsoft', name: 'Microsoft', domain: 'microsoft.com', industry: 'Technology' },
  { id: 'c-fortive', name: 'Fortive', domain: 'fortive.com', industry: 'Industrial Technology' },
  { id: 'c-honeywell', name: 'Honeywell', domain: 'honeywell.com', industry: 'Industrial Technology' },
  { id: 'c-liftoff-mobile', name: 'Liftoff Mobile', domain: 'liftoff.io', industry: 'Technology / AdTech' },
  { id: 'c-katy-isd', name: 'Katy ISD', domain: 'katyisd.org', industry: 'Education' },
  { id: 'c-bnsf', name: 'BNSF', domain: 'bnsf.com', industry: 'Transportation / Rail' },
  { id: 'c-excelerate', name: 'Excelerate Energy', domain: 'excelerateenergy.com', industry: 'Energy / LNG' },
  { id: 'c-paws', name: 'PAWS', domain: '', industry: 'Nonprofit' },
  { id: 'c-noble', name: 'Noble', domain: 'noblecorp.com', industry: 'Energy / Drilling' },
  { id: 'c-kirby', name: 'Kirby Corp', domain: 'kirbycorp.com', industry: 'Marine Transportation' },
  { id: 'c-marathon', name: 'Marathon Petroleum', domain: 'marathonpetroleum.com', industry: 'Energy / Refining' },
  { id: 'c-mongodb', name: 'MongoDB', domain: 'mongodb.com', industry: 'Technology / Database' },
  { id: 'c-woodside', name: 'Woodside Energy', domain: 'woodside.com', industry: 'Energy / Oil & Gas' },
];

// ---------------------------------------------------------------------------
// Proposal data (from plan Phase 3 mapping — skips #6 and #41)
// ---------------------------------------------------------------------------

interface ProposalDef {
  num: number;
  clientId: string;
  clientName: string;
  program: string;
  programName: string;
  description: string;
  dateSent: string;
  filename: string;
}

const PROPOSALS: ProposalDef[] = [
  {
    num: 1, clientId: 'c-amazon-ixt', clientName: 'Amazon IXT',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive coaching for Amazon IXT leadership on communication presence and delivery',
    dateSent: '2025-02-10',
    filename: 'Executive Communications Coaching for Amazon IXT (WPNT Communications).docx',
  },
  {
    num: 2, clientId: 'c-deanship', clientName: 'Academic (Deanship)',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Communications skills training track for academic leadership development',
    dateSent: '2025-02-24',
    filename: 'Executive Communications Track for Deanship(WPNT Communications).docx',
  },
  {
    num: 3, clientId: 'c-fortive-hengstler', clientName: 'Fortive/Hengstler',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Executive presentation skills program for Hengstler senior leadership team',
    dateSent: '2025-01-15',
    filename: 'Executive Presentation Skills Training (WPNT Communications) Hengstler.docx',
  },
  {
    num: 4, clientId: 'c-bechtel', clientName: 'Bechtel',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Executive presentation skills training for Bechtel Brisbane team ahead of 2026',
    dateSent: '2025-09-22',
    filename: 'Executive Presentation Skills Training for Bechtel Brisbane 2026 (WPNT Communications).docx',
  },
  {
    num: 5, clientId: 'c-phillips66', clientName: 'Phillips 66',
    program: 'IR', programName: 'Investor Relations',
    description: 'Mock interview preparation for Phillips 66 financial communications season',
    dateSent: '2025-03-05',
    filename: 'Financial Communications Mock Interviews Phillips 66 (WPNT Communications).docx',
  },
  // #6 SKIPPED — Halliburton LIFE2026 (not a proposal)
  {
    num: 7, clientId: 'c-nasa-jsc', clientName: 'NASA JSC',
    program: 'MT', programName: 'Media Training',
    description: 'Media training for NASA Johnson Space Center public affairs officers',
    dateSent: '2025-04-14',
    filename: 'NASA JSC Public Affairs Media Training (WPNT Communications).docx',
  },
  {
    num: 8, clientId: 'c-citi', clientName: 'Citi',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Presentation skills and communications training for Citi banking leaders',
    dateSent: '2025-01-28',
    filename: 'Presentation Skills + Communications Training Overview for Citi (WPNT Communications).docx',
  },
  {
    num: 9, clientId: 'c-aramco', clientName: 'Aramco',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive messaging support and strategic communications for Aramco leadership',
    dateSent: '2025-05-12',
    filename: 'V4 REVISED Executive Messaging Support for Aramco (WPNT).docx',
  },
  {
    num: 10, clientId: 'c-halliburton', clientName: 'Halliburton',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Individual executive communications coaching for Halliburton leaders (v2)',
    dateSent: '2025-06-02',
    filename: 'WPNT Executive Communications Coaching - Halliburton v2.docx',
  },
  {
    num: 11, clientId: 'c-bp', clientName: 'bp',
    program: 'vSET', programName: 'Virtual Stakeholder Engagement Training',
    description: 'Virtual ASPM training for bp Trinidad and Tobago operations team',
    dateSent: '2025-11-17',
    filename: 'bp ASPM Virtual Training - Trinidad and Tobago (WPNT Communications) Dec 2025 MLO.docx',
  },
  {
    num: 12, clientId: 'c-bp', clientName: 'bp',
    program: 'SET', programName: 'Stakeholder Engagement Training',
    description: 'Advanced stakeholder management program for bp Trinidad & Tobago leadership',
    dateSent: '2025-04-28',
    filename: 'bp Advanced Stakeholder Management Training - Trinidad and Tobago (WPNT Communications).docx',
  },
  {
    num: 13, clientId: 'c-aws', clientName: 'AWS',
    program: 'MT', programName: 'Media Training',
    description: 'Advanced broadcast media training for Amazon Web Services executives',
    dateSent: '2025-03-18',
    filename: 'Advanced Broadcast Media Training for AWS (WPNT Communications).pdf',
  },
  {
    num: 14, clientId: 'c-exxonmobil', clientName: 'ExxonMobil',
    program: 'CCT', programName: 'Crisis Communication Training',
    description: 'Crisis awareness training for ExxonMobil Midland operations team',
    dateSent: '2025-07-21',
    filename: 'Crisis Awareness Training for ExxonMobil Midland (WPNT Communications).pdf',
  },
  {
    num: 15, clientId: 'c-exxonmobil', clientName: 'ExxonMobil',
    program: 'CCT', programName: 'Crisis Communication Training',
    description: 'Crisis communications training for ExxonMobil corporate spokespeople',
    dateSent: '2025-06-16',
    filename: 'EM Crisis Communications Training (WPNT Communications).pdf',
  },
  {
    num: 16, clientId: 'c-exxonmobil', clientName: 'ExxonMobil',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Presentation skills for ExxonMobil Projects Leadership Forum 2025',
    dateSent: '2025-04-07',
    filename: 'EM Projects Leadership Forum Proposal 2025 (WPNT Communications).pdf',
  },
  {
    num: 17, clientId: 'c-exxonmobil', clientName: 'ExxonMobil',
    program: 'PS', programName: 'Presentation Skills',
    description: 'EMbassador communications workshop series for ExxonMobil representatives',
    dateSent: '2025-05-05',
    filename: 'EMbassador Communications Workshop Series Overview(WPNT Communications).pdf',
  },
  {
    num: 18, clientId: 'c-citi', clientName: 'Citi',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Enhancing communications skills program for Citi senior leaders',
    dateSent: '2025-03-31',
    filename: 'Enhancing the communications skills of Citi leaders (WPNT Communications).pdf',
  },
  {
    num: 19, clientId: 'c-microsoft', clientName: 'Microsoft',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications coaching for Microsoft CSA leadership team',
    dateSent: '2025-07-14',
    filename: 'Executive Communications Coaching for Microsoft CSA (WPNT Communications).pdf',
  },
  {
    num: 20, clientId: 'c-halliburton', clientName: 'Halliburton',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications track for Halliburton leadership development',
    dateSent: '2025-05-28',
    filename: 'Executive Communications Track for Halliburton (WPNT Communications).pdf',
  },
  {
    num: 21, clientId: 'c-citi', clientName: 'Citi',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'One-on-one executive communications coaching for Citi executives',
    dateSent: '2025-08-11',
    filename: 'Executive communications coaching for Citi (WPNT Communications).pdf',
  },
  {
    num: 22, clientId: 'c-exxonmobil', clientName: 'ExxonMobil',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Conference presentation support for ExxonMobil Branded Wholesalers 2026',
    dateSent: '2025-10-06',
    filename: 'ExxonMobil Branded Wholesalers Conference Support 2026 (WPNT Communications).pdf',
  },
  {
    num: 23, clientId: 'c-fortive', clientName: 'Fortive',
    program: 'CUST', programName: 'Custom Program',
    description: 'Custom GMDP leadership development program for Fortive 2026',
    dateSent: '2025-09-08',
    filename: 'FTV - GMDP 2026 Proposal (WPNT Communications).pdf',
  },
  {
    num: 24, clientId: 'c-fortive', clientName: 'Fortive',
    program: 'PS', programName: 'Presentation Skills',
    description: 'HR onboarding presentation skills training for new Fortive leaders',
    dateSent: '2025-08-25',
    filename: 'Fortive  - HR Onboarding Training Proposal (WPNT Communications).pdf',
  },
  {
    num: 25, clientId: 'c-fortive-hengstler', clientName: 'Fortive/Hengstler',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications curriculum for Fortive-Hengstler leadership',
    dateSent: '2025-07-07',
    filename: 'Fortive-Hengstler - Executive Communications Curriculum (WPNT Communications).pdf',
  },
  {
    num: 26, clientId: 'c-honeywell', clientName: 'Honeywell',
    program: 'PS', programName: 'Presentation Skills',
    description: 'GM Workshop capstone presentation support for Honeywell 2026',
    dateSent: '2025-10-20',
    filename: "HONEYWELL'S GM WORKSHOP CAPSTONE SUPPORT 2026 (WPNT Communications).pdf",
  },
  {
    num: 27, clientId: 'c-halliburton', clientName: 'Halliburton',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications curriculum for Halliburton development program',
    dateSent: '2025-08-04',
    filename: 'Halliburton - Executive Communications Curriculum (WPNT Communications).pdf',
  },
  {
    num: 28, clientId: 'c-liftoff-mobile', clientName: 'Liftoff Mobile',
    program: 'IR', programName: 'Investor Relations',
    description: 'Investor communications coaching for Liftoff Mobile leadership team',
    dateSent: '2025-06-23',
    filename: 'Investor Communications Coaching for Liftoff Mobile (WPNT Communications).pdf',
  },
  {
    num: 29, clientId: 'c-katy-isd', clientName: 'Katy ISD',
    program: 'MT', programName: 'Media Training',
    description: 'Executive media training for Katy Independent School District leaders',
    dateSent: '2025-09-15',
    filename: 'Katy ISD Executive Media Training Overview (WPNT Communications).pdf',
  },
  {
    num: 30, clientId: 'c-katy-isd', clientName: 'Katy ISD',
    program: 'MT', programName: 'Media Training',
    description: 'Media awareness-building workshop for Katy ISD administrators',
    dateSent: '2025-11-03',
    filename: 'Katy ISD Media Awareness-Building Workshop Overview (WPNT Communications).pdf',
  },
  {
    num: 31, clientId: 'c-bnsf', clientName: 'BNSF',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Message development and presentation skills training for BNSF Railway',
    dateSent: '2025-07-28',
    filename: 'Message Development and Presentation Skills Training (WPNT Communications) BNSF Railway.pdf',
  },
  {
    num: 32, clientId: 'c-microsoft', clientName: 'Microsoft',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications curriculum for Microsoft leadership development',
    dateSent: '2025-10-13',
    filename: 'Microsoft - Executive Communications Curriculum (WPNT Communications).pdf',
  },
  {
    num: 33, clientId: 'c-phillips66', clientName: 'Phillips 66',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Leadership communications workshop for Phillips 66 senior managers',
    dateSent: '2025-09-01',
    filename: 'Phillips 66 Leadership Communications Workshop (WPNT Communications).pdf',
  },
  {
    num: 34, clientId: 'c-phillips66', clientName: 'Phillips 66',
    program: 'MT', programName: 'Media Training',
    description: 'Preparing Phillips 66 leaders for top-tier media interviews',
    dateSent: '2025-11-10',
    filename: 'Preparing PSX Leaders for Top Tier Media Interviews (WPNT Communications).pdf',
  },
  {
    num: 35, clientId: 'c-bechtel', clientName: 'Bechtel',
    program: 'SC', programName: 'Strategic Communication',
    description: 'Strategic communications support for Bechtel Mining & Metals 2026',
    dateSent: '2025-10-27',
    filename: 'Strategic Communications Support for Bechtel Mining & Metals 2026 (WPNT Communications).pdf',
  },
  {
    num: 36, clientId: 'c-excelerate', clientName: 'Excelerate Energy',
    program: 'SC', programName: 'Strategic Communication',
    description: 'Strategic communications support for Excelerate Energy 2025',
    dateSent: '2025-04-21',
    filename: 'Strategic Communications Support for Excelerate Energy 2025 (WPNT Communications).pdf',
  },
  {
    num: 37, clientId: 'c-paws', clientName: 'PAWS',
    program: 'CUST', programName: 'Custom Program',
    description: 'Custom training program supporting PAWS organizational success in 2026',
    dateSent: '2025-11-24',
    filename: 'Supporting PAWS success in 2026 (WPNT Communications).pdf',
  },
  {
    num: 38, clientId: 'c-noble', clientName: 'Noble',
    program: 'MT', programName: 'Media Training',
    description: 'Advanced media training for Noble Corporation spokespeople',
    dateSent: '2025-12-01',
    filename: 'WPNT Advanced Media Training - Noble.pdf',
  },
  {
    num: 39, clientId: 'c-phillips66', clientName: 'Phillips 66',
    program: 'SC', programName: 'Strategic Communication',
    description: 'Communications training overview covering onsite and virtual options for Phillips 66',
    dateSent: '2025-08-18',
    filename: 'WPNT Communications Training Overview (onsite and virtual) - Phillips 66.pdf',
  },
  {
    num: 40, clientId: 'c-kirby', clientName: 'Kirby Corp',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications coaching for Kirby Corporation leaders',
    dateSent: '2025-12-08',
    filename: 'WPNT Executive Communications Coaching - Kirby Corp.pdf',
  },
  // #41 SKIPPED — WPNT Executive Communications Curriculum (generic template)
  {
    num: 42, clientId: 'c-kirby', clientName: 'Kirby Corp',
    program: 'PS', programName: 'Presentation Skills',
    description: 'Presentation skills training overview for Kirby Corporation team',
    dateSent: '2025-12-15',
    filename: 'WPNT Presentation Skills Training Overview - Kirby Corp.pdf',
  },
  {
    num: 43, clientId: 'c-bnsf', clientName: 'BNSF',
    program: 'ECC', programName: 'Executive Communications Coaching',
    description: 'Executive communications track proposal for BNSF Railway leadership',
    dateSent: '2026-01-30',
    filename: 'WPNT Executive Communications Track - BNSF Proposal - 01 30 2026.pdf',
  },
];

// ---------------------------------------------------------------------------
// MSG file client mapping
// ---------------------------------------------------------------------------

const MSG_CLIENT_MAP: Record<string, string> = {
  'Amazon': 'c-aws',
  'ExxonMobil': 'c-exxonmobil',
  'Honeywell': 'c-honeywell',
  'Marathon Petroleum': 'c-marathon',
  'MongoDB': 'c-mongodb',
  'Woodside Energy': 'c-woodside',
  'bp': 'c-bp',
};

// ---------------------------------------------------------------------------
// Dollar amount extraction from DOCX text
// ---------------------------------------------------------------------------

async function tryExtractDollarAmounts(filePath: string): Promise<{ min: number | null; max: number | null }> {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === '.pdf') {
      // unpdf may not work reliably for all PDFs in Node
      try {
        const { extractText } = await import('unpdf');
        const buffer = fs.readFileSync(filePath);
        const result = await extractText(new Uint8Array(buffer));
        text = String(result.text ?? '');
      } catch {
        return { min: null, max: null };
      }
    }
  } catch {
    return { min: null, max: null };
  }

  if (!text) return { min: null, max: null };

  // Look for dollar amounts — focus on professional fees, ignore travel/per-person
  // Common patterns: $XX,XXX  or  $XX,XXX.XX
  const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
  const amounts: number[] = [];

  for (const match of String(text).matchAll(dollarRegex)) {
    const val = parseFloat(match[0].replace(/[$,]/g, ''));
    // Filter: likely professional fee range ($1,000 - $500,000)
    if (val >= 1000 && val <= 500000) {
      amounts.push(val);
    }
  }

  if (amounts.length === 0) return { min: null, max: null };

  // Sort and take min/max — these represent the fee range
  amounts.sort((a, b) => a - b);

  // If we have a clear min/max pair, use it
  if (amounts.length >= 2) {
    return { min: amounts[0], max: amounts[amounts.length - 1] };
  }
  // Single amount
  return { min: amounts[0], max: amounts[0] };
}

// ---------------------------------------------------------------------------
// Participant count extraction
// ---------------------------------------------------------------------------

async function tryExtractParticipants(filePath: string): Promise<{ min: number | null; max: number | null }> {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === '.pdf') {
      try {
        const { extractText } = await import('unpdf');
        const buffer = fs.readFileSync(filePath);
        const result = await extractText(new Uint8Array(buffer));
        text = String(result.text ?? '');
      } catch {
        return { min: null, max: null };
      }
    }
  } catch {
    return { min: null, max: null };
  }

  if (!text) return { min: null, max: null };

  // Look for participant count patterns
  // "up to X participants", "X-Y participants", "X participants", "group of X"
  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*participant/i);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  const upToMatch = text.match(/up\s+to\s+(\d+)\s*participant/i);
  if (upToMatch) {
    return { min: null, max: parseInt(upToMatch[1]) };
  }

  const singleMatch = text.match(/(\d+)\s*participant/i);
  if (singleMatch) {
    const n = parseInt(singleMatch[1]);
    if (n >= 1 && n <= 200) {
      return { min: n, max: null };
    }
  }

  return { min: null, max: null };
}

// ---------------------------------------------------------------------------
// MSG filename parsing
// ---------------------------------------------------------------------------

interface MsgParsed {
  clientName: string;
  clientId: string;
  dateSent: string;
  subject: string;
}

function parseMsgFilename(filename: string): MsgParsed | null {
  // Pattern: "Client - YYYY-MM-DD - Subject.msg"
  const match = filename.match(/^(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.msg$/);
  if (!match) return null;

  const clientName = match[1].trim();
  const dateSent = match[2];
  const subject = match[3].trim();
  const clientId = MSG_CLIENT_MAP[clientName];

  if (!clientId) {
    console.warn(`  Unknown MSG client: "${clientName}" in file: ${filename}`);
    return null;
  }

  return { clientName, clientId, dateSent, subject };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('WPNT Batch Import Script');
  console.log('========================\n');

  const proposalDir = path.join(ROOT, 'Files for test entry', 'Proposals for test entry');
  const msgDir = path.join(ROOT, 'Files for test entry', 'Post-program outreach for test entry');

  // Build clients
  const clients: Client[] = CLIENT_DEFS.map(c => ({
    id: c.id,
    name: c.name,
    clientDomain: c.domain,
    logoUrl: '',
    industry: c.industry,
    isActive: true,
  }));

  const entries: OutreachEntry[] = [];
  let entryNum = 0;

  // --- Process proposals ---
  console.log(`Processing ${PROPOSALS.length} proposals...\n`);

  for (const p of PROPOSALS) {
    entryNum++;
    const entryId = `p-${String(entryNum).padStart(2, '0')}`;
    const filePath = path.join(proposalDir, p.filename);

    let dollarMin: number | null = null;
    let dollarMax: number | null = null;
    let partMin: number | null = null;
    let partMax: number | null = null;

    // Try to extract data from file
    if (fs.existsSync(filePath)) {
      const dollars = await tryExtractDollarAmounts(filePath);
      dollarMin = dollars.min;
      dollarMax = dollars.max;

      const parts = await tryExtractParticipants(filePath);
      partMin = parts.min;
      partMax = parts.max;

      const dollarStr = dollarMin || dollarMax
        ? `$${dollarMin?.toLocaleString() ?? '?'} - $${dollarMax?.toLocaleString() ?? '?'}`
        : 'not found';
      const partStr = partMin || partMax
        ? `${partMin ?? '?'}-${partMax ?? '?'}`
        : 'not found';
      console.log(`  #${p.num} ${p.clientName} — ${p.program} — fees: ${dollarStr}, participants: ${partStr}`);
    } else {
      console.log(`  #${p.num} ${p.clientName} — ${p.program} — FILE NOT FOUND: ${p.filename}`);
    }

    entries.push({
      id: entryId,
      title: `${p.clientName} - Proposal - ${p.dateSent}`,
      clientId: p.clientId,
      clientName: p.clientName,
      outreachType: 'Proposal',
      senderName: 'WPNT Communications',
      senderEmail: '',
      dateSent: p.dateSent,
      dollarAmountMin: dollarMin,
      dollarAmountMax: dollarMax,
      participantCount: partMin,
      participantCountMax: partMax,
      programName: p.programName,
      programDescription: p.description,
      status: 'Open',
      outcomeSpend: false,
      spendAmount: null,
      contactName: '[placeholder]',
      contactEmail: '[placeholder]',
      contactTitle: '',
      notes: '',
      documentLink: '',
      sharepointLink: '',
      declineNotes: '',
      crmOwner: '',
      isArchived: false,
    });
  }

  // --- Process MSG files ---
  console.log(`\nProcessing MSG files...\n`);

  let msgFiles: string[] = [];
  try {
    msgFiles = fs.readdirSync(msgDir).filter(f => f.endsWith('.msg')).sort();
  } catch {
    console.warn('MSG directory not found, skipping follow-up entries');
  }

  for (const msgFile of msgFiles) {
    const parsed = parseMsgFilename(msgFile);
    if (!parsed) {
      console.log(`  SKIP (unparseable): ${msgFile}`);
      continue;
    }

    entryNum++;
    const entryId = `f-${String(entryNum - PROPOSALS.length).padStart(2, '0')}`;

    // Find display name from client defs
    const clientDef = CLIENT_DEFS.find(c => c.id === parsed.clientId);
    const displayName = clientDef?.name ?? parsed.clientName;

    console.log(`  ${displayName} — ${parsed.dateSent} — ${parsed.subject.substring(0, 60)}`);

    entries.push({
      id: entryId,
      title: `${displayName} - Follow-Up - ${parsed.dateSent}`,
      clientId: parsed.clientId,
      clientName: displayName,
      outreachType: 'Follow-Up',
      senderName: '[from email]',
      senderEmail: '',
      dateSent: parsed.dateSent,
      dollarAmountMin: null,
      dollarAmountMax: null,
      participantCount: null,
      participantCountMax: null,
      programName: '',
      programDescription: '',
      status: 'Open',
      outcomeSpend: false,
      spendAmount: null,
      contactName: '[from email]',
      contactEmail: '',
      contactTitle: '',
      notes: parsed.subject,
      documentLink: '',
      sharepointLink: '',
      declineNotes: '',
      crmOwner: '',
      isArchived: false,
    });
  }

  // --- Write output ---
  const output = { clients, entries };
  const outputPath = path.join(__dirname, 'import-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n========================`);
  console.log(`Generated ${clients.length} clients and ${entries.length} entries`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nTo load into the dashboard:`);
  console.log(`  1. Open the dashboard in a browser`);
  console.log(`  2. Open DevTools console`);
  console.log(`  3. Run: window.__wpntClear()`);
  console.log(`  4. Paste: window.__wpntImport(JSON.stringify(${JSON.stringify('...')})) with the JSON content`);
  console.log(`  5. Reload the page`);
}

main().catch(console.error);
