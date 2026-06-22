"use client";

import { Suspense } from "react";
import AgentEmailContent from "./AgentEmailContent";

function AgentLoading() {
  return <div className="p-6">Chargement de l&apos;agent email…</div>;
}

export default function AgentRoutePage() {
  return (
    <Suspense fallback={<AgentLoading />}>
      <AgentEmailContent />
    </Suspense>
  );
}
