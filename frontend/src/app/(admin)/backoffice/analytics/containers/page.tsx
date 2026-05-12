import { redirect } from 'next/navigation';

/** Ancienne URL : métriques conteneurs = périmètre Performances uniquement. */
export default function AnalyticsContainersRedirectPage() {
  redirect('/b4ck0ff1ce/performances/containers');
}
