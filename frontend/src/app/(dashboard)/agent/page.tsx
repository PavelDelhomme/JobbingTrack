"use client";

import { Suspense } from "react";
import AgentEmailContent from "./AgentEmailContent";

function AgentLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  );
}

export default function AgentRoutePage() {
  return (
    <Suspense fallback={<AgentLoading />}>
      <AgentEmailContent />
    </Suspense>
  );
}
