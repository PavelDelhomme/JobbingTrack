import { redirect } from 'next/navigation';

/** Ancienne URL : détail réseau = périmètre Performances uniquement. */
export default function AnalyticsNetworkRedirectPage() {
  redirect('/backoffice/performances/network');
}
