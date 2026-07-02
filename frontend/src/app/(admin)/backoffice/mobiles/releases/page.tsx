import { redirect } from "next/navigation";

/** Redirection typo fréquente « mobiles » → « mobile ». */
export default function MobilesReleasesTypoRedirect() {
  redirect("/backoffice/mobile/releases");
}
