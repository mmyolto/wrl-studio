import { Gift as GiftIcon, HandCoins, Package } from 'lucide-react';
import { Badge } from '../../components/ui/misc';
import { GIFT_TYPES } from '../../lib/constants';
import type { Gift } from '../../lib/types';
import { pledgeStatus } from '../../services/gifts';

const ICONS = { pledge: HandCoins, cash: GiftIcon, kind: Package };
const TONES = { pledge: 'violet', cash: 'brand', kind: 'blue' } as const;

export function GiftBadges({ gift }: { gift: Gift }) {
  const status = gift.type === 'pledge' ? pledgeStatus(gift) : null;
  return (
    <>
      <Badge tone={TONES[gift.type]} icon={ICONS[gift.type]}>
        {GIFT_TYPES[gift.type].label}
      </Badge>
      {status === 'paid' && <Badge tone="brand">Fully paid</Badge>}
      {status === 'part' && <Badge tone="amber">Part paid</Badge>}
      {status === 'unpaid' && <Badge tone="neutral">Not yet paid</Badge>}
    </>
  );
}
