"use client";

import { uiSurfaces } from "../surfaces";
import { TableSkeleton, type TableSkeletonProps } from "./TableSkeleton";

/** Skeleton tableau dans un panneau dark-ready (pages sécurité / incidents). */
export function TablePanelSkeleton(props: TableSkeletonProps) {
  return (
    <div className={uiSurfaces.tableWrap}>
      <TableSkeleton {...props} />
    </div>
  );
}
