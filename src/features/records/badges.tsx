import { CircleCheck, Flag, HandHeart, Hourglass, Music, Megaphone, MessageCircle, UserPlus } from 'lucide-react';
import { Badge, type Tone } from '../../components/ui/misc';
import { SALVATION } from '../../lib/constants';
import { PNG } from '../../lib/countries';
import type { ListenerRecord } from '../../lib/types';

const CATEGORY: Record<string, { tone: Tone; icon: typeof Music }> = {
  'Song Request': { tone: 'blue', icon: Music },
  'Prayer Request': { tone: 'violet', icon: HandHeart },
  Toksave: { tone: 'amber', icon: Megaphone },
  Others: { tone: 'neutral', icon: MessageCircle },
};

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY[category] ?? CATEGORY.Others!;
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {category}
    </Badge>
  );
}

export const placeOf = (r: Pick<ListenerRecord, 'country' | 'province'>) =>
  r.country === PNG ? r.province : r.country;

/** Follow-up state chips: salvation, prayer flag, referral. */
export function StatusBadges({ record, meId }: { record: ListenerRecord; meId?: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {record.prayerCategory === SALVATION &&
        (record.salvationStatus === 'soul_saved' ? (
          <Badge tone="brand" icon={CircleCheck}>
            Soul saved
          </Badge>
        ) : (
          <Badge tone="amber" icon={Hourglass}>
            Salvation follow-up
          </Badge>
        ))}
      {record.flaggedForPrayer && (
        <Badge tone="red" icon={Flag}>
          Flagged
        </Badge>
      )}
      {record.referredTo && (
        <Badge tone={record.referralStatus === 'completed' ? 'neutral' : 'violet'} icon={UserPlus}>
          {record.referralStatus === 'completed'
            ? 'Referral done'
            : record.referredTo === meId
              ? 'Referred to you'
              : `→ ${record.referredToName}`}
        </Badge>
      )}
    </span>
  );
}
