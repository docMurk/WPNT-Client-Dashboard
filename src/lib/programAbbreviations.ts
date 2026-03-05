export const ABBREVIATIONS: Record<string, string> = {
  'Presentation Skills': 'PS',
  'Stakeholder Engagement Training': 'SET',
  'Executive Communication Coaching': 'ECC',
  'Change Communication Training': 'CCT',
  'Crisis Tabletop Training': 'CTT',
  'Advanced Crisis Tabletop Training': 'CTT',
  'Media Training': 'MT',
  'Virtual Stakeholder Engagement Training': 'vSET',
  'Virtual Change Communication Training': 'vCCT',
  'Virtual Crisis Tabletop Training': 'vCTT',
  'Virtual Media Training': 'vMT',
  'Virtual Strategic Communication': 'vSC',
  'Virtual Investor Relations': 'vIR',
  'Virtual Executive Coaching': 'vEC',
  'Virtual Presentation Skills': 'vPS',
  'Senior Management Engagement': 'SMET',
  'Strategic Communication': 'SC',
  'Investor Relations': 'IR',
};

export function getAbbreviation(programName: string): string {
  if (!programName) return '';

  const exact = ABBREVIATIONS[programName];
  if (exact) return exact;

  // Fallback: first letter of each word
  return programName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
