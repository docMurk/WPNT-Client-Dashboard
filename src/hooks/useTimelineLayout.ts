import { useMemo } from 'react';
import type { OutreachEntry } from '@/types/outreach';

export const CARD_WIDTH = 160;
export const CARD_HEIGHT = 162;
export const CARD_GAP = 8;
export const STACK_OFFSET = CARD_HEIGHT + CARD_GAP;
export const MAX_PROPOSAL_STACK = 3;
export const MAX_FOLLOWUP_STACK = 1;

export interface PositionedCard {
  entry: OutreachEntry;
  x: number;
  y: number;
  stackIndex: number;
  isOverflow: boolean;
  columnId: string;
}

export interface CardColumn {
  id: string;
  x: number;
  cards: PositionedCard[];
  overflowCount: number;
}

export interface TimelineLayout {
  proposals: PositionedCard[];
  followUps: PositionedCard[];
  proposalColumns: CardColumn[];
  followUpColumns: CardColumn[];
  maxProposalStack: number;
  maxFollowUpStack: number;
}

function layoutCards(
  entries: OutreachEntry[],
  containerWidth: number,
  visibleTimeStart: number,
  visibleTimeEnd: number,
  section: 'proposal' | 'followUp',
): { cards: PositionedCard[]; columns: CardColumn[]; maxStack: number } {
  const timeSpan = visibleTimeEnd - visibleTimeStart;
  if (timeSpan <= 0 || containerWidth <= 0) {
    return { cards: [], columns: [], maxStack: 0 };
  }

  const maxStack = section === 'proposal' ? MAX_PROPOSAL_STACK : MAX_FOLLOWUP_STACK;

  // Sort by date
  const sorted = [...entries].sort(
    (a, b) => new Date(a.dateSent).getTime() - new Date(b.dateSent).getTime(),
  );

  // Calculate exact x positions (use T00:00:00 suffix to parse as local time)
  const withX = sorted.map((entry) => ({
    entry,
    x: ((new Date(entry.dateSent + 'T00:00:00').getTime() - visibleTimeStart) / timeSpan) * containerWidth,
  }));

  // Filter off-screen
  const visible = withX.filter(
    (item) => item.x > -CARD_WIDTH && item.x < containerWidth + CARD_WIDTH,
  );

  // Group overlapping cards into clusters
  // Two cards overlap if |card.x - group anchor x| < CARD_WIDTH + CARD_GAP
  const groups: { anchorX: number; items: { entry: OutreachEntry; x: number }[] }[] = [];

  for (const item of visible) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && Math.abs(item.x - lastGroup.anchorX) < CARD_WIDTH + CARD_GAP) {
      lastGroup.items.push(item);
    } else {
      groups.push({ anchorX: item.x, items: [item] });
    }
  }

  // Assign positions within groups — each card uses exact x, stack vertically
  const allCards: PositionedCard[] = [];
  const allColumns: CardColumn[] = [];
  let actualMaxStack = 0;

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = groups[gIdx];
    const columnId = `${section}-${gIdx}`;
    const columnCards: PositionedCard[] = [];
    // Use first card's x as the column anchor for overflow badge positioning
    const columnX = group.items[0].x - CARD_WIDTH / 2;

    for (let i = 0; i < group.items.length; i++) {
      const isOverflow = i >= maxStack;
      const stackIndex = isOverflow ? -1 : i;

      // y: proposals stack upward (negative y from axis), follow-ups stack downward
      const y =
        section === 'proposal'
          ? -(stackIndex + 1) * STACK_OFFSET
          : stackIndex * STACK_OFFSET;

      const card: PositionedCard = {
        entry: group.items[i].entry,
        x: group.items[i].x - CARD_WIDTH / 2, // Center card on its exact date position
        y: isOverflow ? 0 : y,
        stackIndex,
        isOverflow,
        columnId,
      };

      columnCards.push(card);
      if (!isOverflow) allCards.push(card);
    }

    const overflowCount = Math.max(0, group.items.length - maxStack);
    const visibleCount = Math.min(group.items.length, maxStack);
    if (visibleCount > actualMaxStack) actualMaxStack = visibleCount;

    allColumns.push({
      id: columnId,
      x: columnX,
      cards: columnCards,
      overflowCount,
    });
  }

  return { cards: allCards, columns: allColumns, maxStack: actualMaxStack };
}

export function useTimelineLayout(
  entries: OutreachEntry[],
  containerWidth: number,
  visibleTimeStart: number,
  visibleTimeEnd: number,
): TimelineLayout {
  return useMemo(() => {
    const proposals = entries.filter((e) => e.outreachType === 'Proposal');
    const followUps = entries.filter((e) => e.outreachType === 'Follow-Up');

    const proposalResult = layoutCards(
      proposals,
      containerWidth,
      visibleTimeStart,
      visibleTimeEnd,
      'proposal',
    );

    const followUpResult = layoutCards(
      followUps,
      containerWidth,
      visibleTimeStart,
      visibleTimeEnd,
      'followUp',
    );

    return {
      proposals: proposalResult.cards,
      followUps: followUpResult.cards,
      proposalColumns: proposalResult.columns,
      followUpColumns: followUpResult.columns,
      maxProposalStack: proposalResult.maxStack,
      maxFollowUpStack: followUpResult.maxStack,
    };
  }, [entries, containerWidth, visibleTimeStart, visibleTimeEnd]);
}
