import type { ListenerRecord, Role, UserProfile } from './types';

const is = (role: Role | undefined, ...roles: Role[]) => !!role && roles.includes(role);

/** Every role-based decision in the UI goes through here (mirrors firestore.rules). */
export function permissionsFor(role: Role | undefined) {
  return {
    viewAllRecords: is(role, 'Administrator', 'General Manager', 'Program Director', 'Ministry Chaplain'),
    addRecords: is(role, 'Administrator', 'Program Director', 'Ministry Chaplain', 'Announcer'),
    editAnyRecord: is(role, 'Administrator', 'Program Director', 'Ministry Chaplain'),
    deleteAnyRecord: is(role, 'Administrator', 'Program Director'),
    flagForPrayer: is(role, 'Announcer', 'Program Director'),
    submitShowPrep: is(role, 'Administrator', 'Program Director', 'Announcer'),
    showPrepReminder: is(role, 'Program Director', 'Announcer'),
    trackShowPrep: is(role, 'Administrator', 'General Manager', 'Program Director'),
    viewReports: is(role, 'Administrator', 'General Manager', 'Program Director', 'Ministry Chaplain'),
    viewTeam: is(role, 'Administrator', 'General Manager', 'Program Director'),
    manageTickets: is(role, 'Administrator', 'General Manager', 'Program Director'),
    deleteTickets: is(role, 'Administrator'),
    assignTasks: is(role, 'Administrator', 'General Manager', 'Program Director', 'Ministry Chaplain'),
    viewAllTasks: is(role, 'Administrator', 'General Manager'),
    recordGiving: !!role,
    viewAllGiving: is(role, 'Administrator', 'General Manager', 'Program Director'),
    deleteGiving: is(role, 'Administrator'),
    /** Anyone on air can tell management a day's show prep will not be used. */
    reportScheduleChange: is(role, 'Administrator', 'General Manager', 'Program Director', 'Announcer'),
    acknowledgeScheduleChange: is(role, 'Administrator', 'General Manager', 'Program Director'),
    manageUsers: is(role, 'Administrator'),
    viewArchive: is(role, 'Administrator'),
  };
}

export const canEditRecord = (user: UserProfile, record: ListenerRecord) =>
  permissionsFor(user.role).editAnyRecord || record.createdBy === user.id;

export const canDeleteRecord = (user: UserProfile, record: ListenerRecord) =>
  permissionsFor(user.role).deleteAnyRecord || record.createdBy === user.id;

export const MANAGEMENT_ROLES: Role[] = ['Administrator', 'General Manager', 'Program Director'];
