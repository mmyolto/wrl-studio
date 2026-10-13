import type { ReactNode } from 'react';
import logo from '../assets/logo.png';
import { STATION_TAGLINE } from '../lib/constants';

/** Split-screen frame for sign-in, first-run setup and account messages. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(60rem 40rem at 110% -10%, rgba(246,200,0,0.28), transparent 60%), radial-gradient(50rem 30rem at -20% 120%, rgba(224,38,45,0.25), transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="inline-block rounded-2xl bg-white p-3 shadow-lg">
            <img src={logo} alt="Wantok Radio Light 93.9 FM" className="h-14 w-auto" />
          </div>
        </div>
        <div className="relative max-w-md text-white">
          <p className="text-sm font-semibold tracking-widest text-sun-300 uppercase">Studio</p>
          <h2 className="mt-3 text-4xl leading-tight font-extrabold">
            Every call, every prayer, every show — in one place.
          </h2>
          <p className="mt-4 text-brand-100">
            Listener records, salvation follow-up, weekly show prep and team reporting for the Wantok Radio Light
            family.
          </p>
        </div>
        <p className="relative text-sm leading-5 text-brand-200">{STATION_TAGLINE}</p>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-5 pt-10 pb-24 sm:px-8 lg:pb-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src={logo} alt="Wantok Radio Light 93.9 FM" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>

        {/* Credit — sits on the same line as the tagline at the bottom of the green panel. */}
        <footer className="absolute inset-x-0 bottom-8 px-5 text-center text-sm leading-5 text-stone-500 lg:bottom-12">
          <p className="mb-1 lg:hidden">{STATION_TAGLINE}</p>
          <p>
            Designed and built by <span className="font-semibold text-stone-700">Melvin Yolto</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
