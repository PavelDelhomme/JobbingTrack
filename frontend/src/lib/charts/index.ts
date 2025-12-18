/**
 * ✅ OPTIMISATION: Lazy loading pour les composants Recharts
 * Réduit la taille du bundle initial en chargeant les graphiques uniquement quand nécessaire
 */

import { lazy } from 'react';

// Lazy load des composants Recharts
export const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));
export const Line = lazy(() => import('recharts').then(mod => ({ default: mod.Line })));
export const AreaChart = lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart })));
export const Area = lazy(() => import('recharts').then(mod => ({ default: mod.Area })));
export const BarChart = lazy(() => import('recharts').then(mod => ({ default: mod.BarChart })));
export const Bar = lazy(() => import('recharts').then(mod => ({ default: mod.Bar })));
export const XAxis = lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
export const YAxis = lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
export const CartesianGrid = lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
export const Tooltip = lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
export const Legend = lazy(() => import('recharts').then(mod => ({ default: mod.Legend })));
export const ResponsiveContainer = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));
export const ComposedChart = lazy(() => import('recharts').then(mod => ({ default: mod.ComposedChart })));
export const PieChart = lazy(() => import('recharts').then(mod => ({ default: mod.PieChart })));
export const Pie = lazy(() => import('recharts').then(mod => ({ default: mod.Pie })));
export const Cell = lazy(() => import('recharts').then(mod => ({ default: mod.Cell })));

