"use client";

import { PageLoader } from "@/lib/ui";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackofficePageRefreshProvider } from "@/contexts/BackofficePageRefreshContext";

function isBackofficeAdmin(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  /** Une fois la session admin connue, ne plus masquer toute la page (flash « reload »). */
  const sessionReadyRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (user && isBackofficeAdmin(user.role)) {
    sessionReadyRef.current = true;
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !isBackofficeAdmin(user.role)) {
      router.push("/access-denied");
    }
  }, [user, loading, router]);

  // Premier montage / auth initiale seulement — pas de PageLoader après session OK.
  if (!mounted || (loading && !sessionReadyRef.current)) {
    return <PageLoader message="Connexion au backoffice…" />;
  }

  if (!user || !isBackofficeAdmin(user.role)) {
    // Session déjà vue : garder l’arbre pendant un éventuel flip loading (évite null flash).
    if (sessionReadyRef.current) {
      return (
        <BackofficePageRefreshProvider>{children}</BackofficePageRefreshProvider>
      );
    }
    return null;
  }

  return (
    <BackofficePageRefreshProvider>{children}</BackofficePageRefreshProvider>
  );
}
