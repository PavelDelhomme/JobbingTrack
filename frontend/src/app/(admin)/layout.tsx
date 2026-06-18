"use client";

import { PageLoader } from "@/lib/ui";
import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackofficePageRefreshProvider } from "@/contexts/BackofficePageRefreshContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (
      !loading &&
      user &&
      !["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ) {
      router.push("/access-denied");
    }
  }, [user, loading, router]);

  if (!mounted || loading) {
    return <PageLoader message="Connexion au backoffice…" />;
  }

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  return (
    <BackofficePageRefreshProvider>{children}</BackofficePageRefreshProvider>
  );
}
