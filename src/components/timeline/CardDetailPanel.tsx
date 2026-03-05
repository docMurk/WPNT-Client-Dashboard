import { useEffect, useState } from 'react';
import { Pencil, Eye } from 'lucide-react';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { getAbbreviation } from '@/lib/programAbbreviations';
import type { OutreachEntry } from '@/types/outreach';
import { CARD_WIDTH } from '@/hooks/useTimelineLayout';

const PANEL_WIDTH = 300;

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const TYPE_BADGE: Record<string, string> = {
  Proposal: 'bg-proposal/10 text-proposal',
  'Follow-Up': 'bg-follow-up/10 text-follow-up',
};

interface CardDetailPanelProps {
  entry: OutreachEntry;
  cardX: number;
  cardTop: number;
  containerWidth: number;
  onClose: () => void;
  onEdit: () => void;
  onViewFull: () => void;
}

export function CardDetailPanel({
  entry,
  cardX,
  cardTop,
  containerWidth,
  onClose,
  onEdit,
  onViewFull,
}: CardDetailPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Position: to the right of the card, or left if near right edge
  const cardRight = cardX + CARD_WIDTH + 8;
  const openRight = cardRight + PANEL_WIDTH < containerWidth;
  const left = openRight ? cardRight : cardX - PANEL_WIDTH - 8;

  const abbrev = getAbbreviation(entry.programName);

  return (
    <>
      {/* Invisible backdrop to close on click outside */}
      <div
        className="absolute inset-0 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute z-30 rounded-xl border border-wpnt-border bg-white shadow-lg"
        style={{
          width: PANEL_WIDTH,
          left,
          top: cardTop,
          transform: visible ? 'translateX(0)' : `translateX(${openRight ? '-10px' : '10px'})`,
          opacity: visible ? 1 : 0,
          transition: 'transform 150ms ease-out, opacity 150ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-6 space-y-4">
          {/* Header: Logo + Name */}
          <div className="flex items-center gap-3">
            <ClientLogo clientId={entry.clientId} size={36} />
            <span className="text-sm font-semibold text-wpnt-body leading-tight">
              {entry.clientName}
            </span>
          </div>

          {/* Program type badge */}
          {entry.programName && (
            <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[entry.outreachType]}`}>
              {entry.outreachType}{abbrev ? ` — ${abbrev}` : ''}
            </span>
          )}

          {/* Date */}
          <div className="text-xs text-wpnt-text">
            {formatDate(entry.dateSent)}
          </div>

          {/* CRM Owner */}
          {entry.crmOwner && (
            <div className="text-xs text-wpnt-text">
              CRM: <span className="font-medium text-wpnt-body">{entry.crmOwner}</span>
            </div>
          )}

          {/* Description */}
          {entry.programDescription && (
            <p className="text-xs text-wpnt-body line-clamp-4">
              {entry.programDescription}
            </p>
          )}

          {/* SharePoint placeholder */}
          <div className="text-xs text-wpnt-blue">
            [SharePoint placeholder link]
          </div>

          {/* Divider */}
          <div className="border-t border-wpnt-border" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-md border border-wpnt-border bg-white shadow-sm px-3 py-1.5 text-xs text-wpnt-text hover:shadow hover:border-wpnt-blue/30 transition-all"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              onClick={onViewFull}
              className="flex items-center gap-1.5 rounded-md border border-wpnt-border bg-white shadow-sm px-3 py-1.5 text-xs text-wpnt-text hover:shadow hover:border-wpnt-blue/30 transition-all"
            >
              <Eye size={12} />
              View Full Detail
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
