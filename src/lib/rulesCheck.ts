import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Must match the version in firestore.rules (match /rulesVersion/{version}).
 * Bump both together whenever the rules change, so an out-of-date deploy is spotted.
 */
export const RULES_VERSION = '2026-10-07';

let outdated = false;

/** True once we know the rules published on Firebase are older than this app. */
export const rulesOutdated = () => outdated;

/**
 * Asks Firebase whether the published rules know this app's version.
 * Resolves true when they are out of date; network problems are ignored.
 */
export async function checkRules(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'rulesVersion', RULES_VERSION));
    outdated = false;
  } catch (error) {
    outdated = (error as { code?: string })?.code === 'permission-denied';
  }
  return outdated;
}
