"use client";

import { useAuth } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DevelopmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) {
      router.push("/");
      return;
    }

    if (!loading && !user) {
      router.push("/login");
    } else if (
      !loading &&
      user &&
      !["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ) {
      router.push("/access-denied");
    }
  }, [user, loading, router, isDev]);

  if (!isDev) {
    return <div>Ces outils ne sont disponibles qu'en mode développement</div>;
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  return (
    <div>
      <div className="bg-yellow-500 text-black p-2 text-center font-bold">
        ⚠️ MODE DÉVELOPPEMENT
      </div>
      {children}
    </div>
  );
}
