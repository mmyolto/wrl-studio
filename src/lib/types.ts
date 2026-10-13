export type Role = 'Administrator' | 'General Manager' | 'Program Director' | 'Ministry Chaplain' | 'Announcer';

export type Availability = 'active' | 'leave' | 'sick' | 'unavailable';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled?: boolean;
  availability?: Availability;
  returnDate?: string;
  availabilityUpdatedAt?: string;
  createdAt: string;
  lastSignIn?: string;
}

export interface MarriageProblems {
  deserted: boolean;
  divorced: boolean;
  abuse: boolean;
  cheating: boolean;
}

/** The fields an announcer fills in on the record form. */
export interface ListenerFields {
  fullName: string;
  gender: string;
  communicationMethod: string;
  phoneNumber?: string;
  countryCode?: string;
  facebookName?: string;
  emailAddress?: string;
  country: string;
  province: string;
  location: string;
  messageCategory: string;
  songTitle?: string;
  artist?: string;
  prayerCategory?: string;
  marriageProblems?: MarriageProblems;
  message: string;
}

export interface ListenerRecord extends ListenerFields {
  id: string;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;

  salvationStatus?: 'pending' | 'soul_saved';
  salvationFollowUpBy?: string;
  salvationFollowUpByName?: string;
  salvationFollowUpAt?: string;

  flaggedForPrayer?: boolean;
  flaggedBy?: string;
  flaggedByName?: string;
  flaggedAt?: string;

  referredTo?: string;
  referredToName?: string;
  referredBy?: string;
  referredByName?: string;
  referredAt?: string;
  referralStatus?: 'pending' | 'completed';
  referralCompletedAt?: string;
}

export interface ArchivedRecord extends Omit<ListenerRecord, 'id'> {
  id: string;
  originalRecordId: string;
  archiveType: 'edited' | 'deleted';
  archivedAt: string;
  archivedBy: string;
  archivedByName: string;
}

export type NotificationType =
  | 'referral'
  | 'referral_completed'
  | 'flagged_prayer'
  | 'show_prep'
  | 'show_prep_reviewed'
  | 'ticket_created'
  | 'ticket_updated'
  | 'task_assigned'
  | 'task_updated'
  | 'toksave'
  | 'schedule_change';

export interface AppNotification {
  id: string;
  type: NotificationType;
  recipientId: string;
  senderId: string;
  senderName: string;
  targetId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TimeSlot {
  airTimeHour: string;
  talkingPoints: string;
}

export type InterviewFormat = 'In studio' | 'By phone' | 'Pre-recorded' | 'Outside broadcast';

/** One person the presenter plans to interview on air. */
export interface Interviewee {
  name: string;
  position: string;
  organisation?: string;
  phone: string;
  topic: string;
  /** yyyy-mm-dd */
  date: string;
  /** e.g. "7:30 am" */
  time: string;
  format: InterviewFormat;
  notes?: string;
}

export interface ShowPrepFields {
  showName: string;
  weekStarting: string;
  topics: string;
  timeSlots: TimeSlot[];
  /** Ticked when the show includes at least one interview this week. */
  hasInterview?: boolean;
  interviews?: Interviewee[];
  /** Free-text guests from older submissions (before the interview section existed). */
  guests?: string;
  musicPlaylist?: string;
  technicalRequest?: string;
}

export interface ShowPrep extends ShowPrepFields {
  id: string;
  submittedBy: string;
  submittedByName: string;
  submittedByRole: Role;
  createdAt: string;
  updatedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type TicketCategory = 'Technical Issue' | 'Program Issue' | 'Others';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  submittedBy: string;
  submittedByName: string;
  submittedByRole: Role;
  notes?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskUpdate {
  at: string;
  by: string;
  byName: string;
  text: string;
  status?: TaskStatus;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  /** yyyy-mm-dd, optional */
  dueDate?: string;
  status: TaskStatus;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: Role;
  updates: TaskUpdate[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export type GiftType = 'pledge' | 'cash' | 'kind';
export type DonorCategory = 'Individual' | 'Family' | 'Church' | 'Group' | 'Company' | 'Government' | 'School';
export type PaymentMethod = 'Cash' | 'Mobile/Internet Banking' | 'Cheque';
export type PledgeSchedule = 'Single' | 'Fortnightly' | 'Monthly' | 'Others';

export interface GiftPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  at: string;
  by: string;
  byName: string;
}

export interface GiftFields {
  type: GiftType;
  donorName: string;
  category: DonorCategory;
  location: 'PNG' | 'Overseas';
  city?: string;
  province?: string;
  country: string;
  overseasLocation?: string;
  address?: string;
  mobile?: string;
  email?: string;
  church?: string;
  congregation?: string;
  currency: string;
  /** yyyy-mm-dd the gift/pledge was made */
  giftDate: string;
  /** pledge only */
  pledgeAmount?: number;
  schedule?: PledgeSchedule;
  scheduleDetails?: string;
  /** in-kind only */
  itemDescription?: string;
  quantity?: string;
  estimatedValue?: number;
  notes?: string;
}

export interface Gift extends GiftFields {
  id: string;
  /** e.g. "WRL26 - 0007" */
  refNo: string;
  seq: number;
  year: string;
  payments: GiftPayment[];
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt?: string;
  updatedByName?: string;
}

export type ScheduleChangeReason = 'National program' | 'Organisational program' | 'Other';

/** A day (or days) when national / organisational programmes replace the normal on-air schedule. */
export interface ScheduleChangeFields {
  reason: ScheduleChangeReason;
  title: string;
  /** yyyy-mm-dd */
  startDate: string;
  /** yyyy-mm-dd — same as startDate for a single day */
  endDate: string;
  allDay: boolean;
  /** e.g. "6 am" / "12 pm" when not all day */
  fromTime?: string;
  toTime?: string;
  affectedShows?: string;
  details?: string;
}

export interface ScheduleChange extends ScheduleChangeFields {
  id: string;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt?: string;
  /** Management who have seen it. */
  acknowledgedBy?: string[];
  acknowledgedNames?: string[];
}
