import { NextRequest } from "next/server";
import {
  MetricsAggregatorRouteContext,
  proxyMetricsAggregatorRequest,
} from "@/lib/api/metricsAggregatorProxy";

/**
 * Alias `/api/mon/*` → metrics-aggregator (évite uBlock sur `/api/metrics-*`).
 * Route App Router explicite : les rewrites next.config seuls ne suffisent pas ici.
 */
export async function GET(
  request: NextRequest,
  context: MetricsAggregatorRouteContext,
) {
  return proxyMetricsAggregatorRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: MetricsAggregatorRouteContext,
) {
  return proxyMetricsAggregatorRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: MetricsAggregatorRouteContext,
) {
  return proxyMetricsAggregatorRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: MetricsAggregatorRouteContext,
) {
  return proxyMetricsAggregatorRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: MetricsAggregatorRouteContext,
) {
  return proxyMetricsAggregatorRequest(request, context);
}
