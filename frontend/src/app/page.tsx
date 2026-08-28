import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VitrinePage } from "@/components/vitrine/VitrinePage";
import {
  isBackofficeHost,
  resolveBackofficeOriginFromHost,
} from "@/lib/site/hosts";
import { BACKOFFICE_BASE_PATH } from "@/config/backoffice.config";

export const metadata: Metadata = {
  title: "JobbingTrack — Suivi de candidatures",
  description:
    "JobbingTrack : plateforme de suivi de candidatures, entreprises, entretiens et mobile.",
};

export default async function HomePage() {
  const host = (await headers()).get("host");

  if (isBackofficeHost(host)) {
    redirect(BACKOFFICE_BASE_PATH);
  }

  const backofficeCanonical = `${resolveBackofficeOriginFromHost(host)}/login`;

  return <VitrinePage backofficeCanonical={backofficeCanonical} />;
}
