import type {
  Availability,
  DonorCategory,
  GiftType,
  PaymentMethod,
  PledgeSchedule,
  Role,
  TaskStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './types';

export const STATION_NAME = 'Wantok Radio Light';
export const STATION_TAGLINE = 'PNG Christian Broadcasting Network';
export const STATION_FREQUENCY = '93.9 FM';

export const ROLES: Role[] = ['Administrator', 'General Manager', 'Program Director', 'Ministry Chaplain', 'Announcer'];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrator: 'Full access, including users and the archive',
  'General Manager': 'Oversight of records, reports, show prep and issues',
  'Program Director': 'Records, show prep reviews, team progress and issues',
  'Ministry Chaplain': 'All listener records, prayer follow-up and reports',
  Announcer: 'Own listener records and weekly show prep',
};

export const PNG_PROVINCES = [
  'Bougainville (Autonomous Region)',
  'Central',
  'Chimbu (Simbu)',
  'East New Britain',
  'East Sepik',
  'Eastern Highlands',
  'Enga',
  'Gulf',
  'Hela',
  'Jiwaka',
  'Madang',
  'Manus',
  'Milne Bay',
  'Morobe',
  'National Capital District (Port Moresby)',
  'New Ireland',
  'Northern (Oro)',
  'Southern Highlands',
  'West New Britain',
  'West Sepik (Sandaun)',
  'Western',
  'Western Highlands',
  'Not Mentioned',
];

export const OVERSEAS = 'Overseas';

export const GENDERS = ['Male', 'Female', 'Not Mentioned'];

export const COMMUNICATION_METHODS = ['SMS', 'WhatsApp', 'Facebook', 'Email', 'Live-App'];
export const PHONE_METHODS = ['SMS', 'WhatsApp'];

export const MESSAGE_CATEGORIES = ['Song Request', 'Prayer Request', 'Toksave', 'Others'];

export const SALVATION = 'Salvation Request';
export const MARRIAGE = 'Pray for Marriage Problem';

export const PRAYER_CATEGORIES = [
  SALVATION,
  MARRIAGE,
  'Pray for Education',
  'Pray for Future Partners',
  'Pray for Work',
  'Pray for Sick',
  'Witchcraft',
  'Others',
];

export const MARRIAGE_PROBLEMS = [
  { key: 'deserted', label: 'Deserted' },
  { key: 'divorced', label: 'Divorced' },
  { key: 'abuse', label: 'Abuse' },
  { key: 'cheating', label: 'Cheating' },
] as const;

export const AVAILABILITY: Record<Availability, { label: string; hint: string }> = {
  active: { label: 'Available', hint: 'On duty — reminders and referrals on' },
  leave: { label: 'On leave', hint: 'Planned time off' },
  sick: { label: 'Sick leave', hint: 'Unwell and resting' },
  unavailable: { label: 'Unavailable', hint: 'Temporarily away' },
};

export const TICKET_CATEGORIES: TicketCategory[] = ['Technical Issue', 'Program Issue', 'Others'];

export const TICKET_STATUS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const TICKET_PRIORITY: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_ORDER: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const TASK_STATUS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

// ---------- Shareathon pledges & gifts ----------

export const GIFT_TYPES: Record<GiftType, { label: string; hint: string }> = {
  pledge: { label: 'Pledge', hint: 'A promise to give, paid now or later' },
  cash: { label: 'Cash gift', hint: 'Money received today' },
  kind: { label: 'In-kind gift', hint: 'Goods, food, equipment or services' },
};

export const DONOR_CATEGORIES: DonorCategory[] = [
  'Individual',
  'Family',
  'Church',
  'Group',
  'Company',
  'Government',
  'School',
];
export const PLEDGE_SCHEDULES: PledgeSchedule[] = ['Single', 'Fortnightly', 'Monthly', 'Others'];
export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Mobile/Internet Banking', 'Cheque'];

export const STATION_ADDRESS = 'P.O. Box 1273, Port Moresby, National Capital District, Papua New Guinea';
export const STATION_CONTACT = 'Phone: (675) 326 0946  |  Mobile: (675) 73 882 283  |  wantok@wantokradio.org';
export const BANK_ACCOUNTS = [
  'BSP Direct Deposit # 1000908049 (Account name: Wantok Radio Light)',
  'Kina Bank Direct Deposit # 1175 7718 (Account name: Wantok Radio Light)',
];
export const PLEDGE_VERSE =
  '"Now may He who supplies seed to the sower and bread for food, supply and multiply the seed you have sown and increase the fruits of your righteousness." 2 Corinthians 9:10';

export const TOKSAVE = 'Toksave';
/** Toksave messages go straight to these roles. */
export const TOKSAVE_ROLES = ['Program Director', 'General Manager'] as const;

export const INTERVIEW_FORMATS = ['In studio', 'By phone', 'Pre-recorded', 'Outside broadcast'] as const;

export const SCHEDULE_CHANGE_REASONS = [
  { value: 'National program', label: 'National program', hint: 'e.g. Independence Day, national prayer, state funeral' },
  { value: 'Organisational program', label: 'Organisational program', hint: 'e.g. Shareathon, church conference, station event' },
  { value: 'Other', label: 'Other', hint: 'Anything else that replaces the normal schedule' },
] as const;
