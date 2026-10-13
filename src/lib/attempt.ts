import { toast } from '../components/ui/toast';
import { friendlyError } from './errors';

/** Runs an action, shows a success toast, or shows a friendly error toast and rethrows. */
export async function attempt<T>(action: () => Promise<T>, success?: string): Promise<T> {
  try {
    const result = await action();
    if (success) toast.success(success);
    return result;
  } catch (error) {
    console.error(error);
    toast.error(friendlyError(error));
    throw error;
  }
}

/** Same as attempt() but swallows the error (for fire-and-forget buttons). */
export function attemptQuietly<T>(action: () => Promise<T>, success?: string) {
  attempt(action, success).catch(() => undefined);
}
