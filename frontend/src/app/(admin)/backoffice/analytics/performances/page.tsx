import { redirect } from 'next/navigation';

/** Ancienne URL : entrée canonique **Performances** → `/b4ck0ff1ce/performances`. */
export default function AnalyticsPerformancesLegacyRedirect() {
  redirect('/b4ck0ff1ce/performances');
}
