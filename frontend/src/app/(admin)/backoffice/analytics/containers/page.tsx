import { redirect } from "next/navigation";

/** Ancienne URL : métriques conteneurs = périmètre Performances uniquement. */
export default function AnalyticsContainersRedirectPage() {
  redirect("/backoffice/performances/containers");
}
