import { useMemo } from 'react';
import type { OutreachEntry } from '@/types/outreach';

export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 148;
export const CARD_GAP = 16;
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

  // STEP 1: Lane-based positioning
  // Each lane tracks the rightmost card's x-center. A card fits in a lane if
  // its x is at least CARD_WIDTH + CARD_GAP past the lane's rightmost card.
  // This guarantees no two cards in the same lane overlap horizontally.
  const laneRightmost: number[] = [];

  const cardResults: { entry: OutreachEntry; x: number; lane: number; isOverflow: boolean }[] = [];

  for (const item of visible) {
    let assignedLane = -1;
    for (let lane = 0; lane < maxStack; lane++) {
      if (lane >= laneRightmost.length || item.x - laneRightmost[lane] >= CARD_WIDTH + CARD_GAP) {
        assignedLane = lane;
        break;
      }
    }

    if (assignedLane >= 0) {
      if (assignedLane >= laneRightmost.length) laneRightmost.push(item.x);
      else laneRightmost[assignedLane] = item.x;
      cardResults.push({ entry: item.entry, x: item.x, lane: assignedLane, isOverflow: false });
    } else {
      cardResults.push({ entry: item.entry, x: item.x, lane: -1, isOverflow: true });
    }
  }

  // STEP 2: Group into columns (anchor-based, for overflow badge positioning only)
  const groups: { anchorX: number; items: typeof cardResults }[] = [];

  for (const item of cardResults) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && Math.abs(item.x - lastGroup.anchorX) < CARD_WIDTH + CARD_GAP) {
      lastGroup.items.push(item);
    } else {
      groups.push({ anchorX: item.x, items: [item] });
    }
  }

  // STEP 3: Build output
  const allCards: PositionedCard[] = [];
  const allColumns: CardColumn[] = [];
  let actualMaxStack = 0;

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = groups[gIdx];
    const columnId = `${section}-${gIdx}`;
    const columnCards: PositionedCard[] = [];
    const columnX = group.items[0].x - CARD_WIDTH / 2;

    for (const item of group.items) {
      const y = item.isOverflow
        ? 0
        : section === 'proposal'
          ? -(item.lane + 1) * STACK_OFFSET
          : item.lane * STACK_OFFSET;

      const card: PositionedCard = {
        entry: item.entry,
        x: item.x - CARD_WIDTH / 2,
        y,
        stackIndex: item.isOverflow ? -1 : item.lane,
        isOverflow: item.isOverflow,
        columnId,
      };

      columnCards.push(card);
      if (!item.isOverflow) {
        allCards.push(card);
        if (item.lane + 1 > actualMaxStack) actualMaxStack = item.lane + 1;
      }
    }

    const overflowCount = group.items.filter((i) => i.isOverflow).length;

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
