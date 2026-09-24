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
  title: "Hubera Jobs — Suivi de candidatures",
  description:
    "Hubera Jobs : suivi de candidatures, entreprises, entretiens et mobile.",
};

export default async function HomePage() {
  const host = (await headers()).get("host");
  const h = (host || "").split(":")[0].toLowerCase();

  if (isBackofficeHost(host)) {
    redirect(BACKOFFICE_BASE_PATH);
  }

  const backofficeCanonical = h.endsWith("hubera.cloud")
    ? "/backoffice"
    : `${resolveBackofficeOriginFromHost(host)}/login`;

  return <VitrinePage backofficeCanonical={backofficeCanonical} />;
}
