import { redirect } from 'next/navigation';

/** Entrée **Application** : performances live par défaut ; sous-routes activité / retours. */
export default function ApplicationIndexRedirect() {
  redirect('/backoffice/analytics/application/performance');
}
