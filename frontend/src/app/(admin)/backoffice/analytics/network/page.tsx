import { redirect } from 'next/navigation';

/** Ancienne URL : détail réseau = périmètre Performances uniquement. */
export default function AnalyticsNetworkRedirectPage() {
  redirect('/b4ck0ff1ce/performances/network');
}
