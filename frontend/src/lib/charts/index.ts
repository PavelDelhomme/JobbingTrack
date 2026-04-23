/**
 * ✅ OPTIMISATION: Lazy loading pour les composants Recharts
 * Réduit la taille du bundle initial en chargeant les graphiques uniquement quand nécessaire
 */

import type { ComponentType } from 'react';
import { lazy } from 'react';

const lazyRechart = <T,>(loader: () => Promise<T>) =>
  lazy(loader as () => Promise<{ default: ComponentType<any> }>);

// Lazy load des composants Recharts
export const LineChart = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.LineChart })));
export const Line = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Line })));
export const AreaChart = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.AreaChart })));
export const Area = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Area })));
export const BarChart = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.BarChart })));
export const Bar = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Bar })));
export const XAxis = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.XAxis })));
export const YAxis = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.YAxis })));
export const CartesianGrid = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.CartesianGrid })));
export const Tooltip = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Tooltip })));
export const Legend = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Legend })));
export const ResponsiveContainer = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })));
export const ComposedChart = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.ComposedChart })));
export const PieChart = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.PieChart })));
export const Pie = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Pie })));
export const Cell = lazyRechart(() => import('recharts').then((mod) => ({ default: mod.Cell })));

