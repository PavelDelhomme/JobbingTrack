/**
 * Orchestrateur de parcours : execute un scenario etape par etape,
 * notifie l'appelant a chaque changement d'etat.
 */
import { AdbClient, LogFn } from './adb-client';
import { MobileScenario, STEP_LABELS } from './adb-scenarios';
import { executeStep } from './adb-steps';

/** Étapes critiques : si l'une échoue, le parcours s'arrête immédiatement (pas de suite inutile). */
const CRITICAL_STEP_IDS = new Set([
  'ensure_logged_out',
  'fill_register_form',
  'fill_register_form_gmail',
  'fill_register_form_proton',
  'fill_register_form_bluemail',
  'fill_login_form',
  'fill_login_form_user1',
  'fill_login_form_gmail',
  'fill_login_form_proton',
  'fill_login_form_bluemail',
  'submit_register',
  'submit_login',
  'view_dashboard_ui',
  'ensure_on_dashboard',
]);

export type StepStatus = 'pending' | 'running' | 'success' | 'error';

export interface StepResult {
  id: string;
  name: string;
  status: StepStatus;
  message?: string;
  durationMs?: number;
}

export interface RunnerCallbacks {
  onStepStart?: (index: number, stepId: string) => void;
  onStepEnd?: (index: number, result: StepResult) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (results: StepResult[]) => void;
}

export class AdbRunner {
  private adb: AdbClient;
  private log: LogFn;
  private cancelled = false;
  private abortController: AbortController | null = null;

  constructor(controllerUrl: string, deviceId: string, log?: LogFn) {
    this.log = log || (() => {});
    this.adb = new AdbClient(controllerUrl, deviceId, this.log);
  }

  /** Annule le parcours et l'étape en cours (abort des requêtes fetch). */
  cancel() {
    this.cancelled = true;
    if (this.abortController) this.abortController.abort();
  }
  get isCancelled() { return this.cancelled; }

  async run(scenario: MobileScenario, callbacks?: RunnerCallbacks): Promise<StepResult[]> {
    this.cancelled = false;
    this.abortController = new AbortController();
    this.adb.setAbortSignal(this.abortController.signal);

    const { steps } = scenario;
    const results: StepResult[] = steps.map((id) => ({
      id,
      name: STEP_LABELS[id] || id.replace(/_/g, ' '),
      status: 'pending' as const,
    }));

    this.log(`Parcours "${scenario.name}" demarre (${steps.length} etapes) [UI reelle]`);

    for (let i = 0; i < steps.length; i++) {
      if (this.cancelled) {
        this.log('Parcours annule');
        break;
      }

      const stepId = steps[i];
      results[i].status = 'running';
      callbacks?.onStepStart?.(i, stepId);
      callbacks?.onProgress?.(i + 1, steps.length);

      const t0 = Date.now();
      const isAbortError = (err: any) => err?.name === 'AbortError' || /abort|NS_BINDING_ABORTED/i.test(String(err?.message ?? ''));

      try {
        let msg: string;
        try {
          msg = await executeStep(stepId, this.adb, { isCancelled: () => this.cancelled });
        } catch (firstErr: any) {
          if (!this.cancelled && isAbortError(firstErr)) {
            this.log(`  ⚠ Requête interrompue (NS_BINDING_ABORTED / Abort), retry une fois...`);
            await new Promise((r) => setTimeout(r, 800));
            msg = await executeStep(stepId, this.adb, { isCancelled: () => this.cancelled });
          } else {
            throw firstErr;
          }
        }
        results[i] = { ...results[i], status: 'success', message: msg, durationMs: Date.now() - t0 };
        this.log(`  ✅ ${results[i].name}: ${msg}`);
      } catch (e: any) {
        results[i] = { ...results[i], status: 'error', message: e?.message || String(e), durationMs: Date.now() - t0 };
        this.log(`  ❌ ${results[i].name}: ${e?.message || String(e)}`);
        if (this.cancelled) {
          this.log('Parcours annulé par l\'utilisateur.');
          callbacks?.onStepEnd?.(i, results[i]);
          break;
        }
        if (CRITICAL_STEP_IDS.has(stepId)) {
          this.log(`  ⛔ Étape critique en échec — parcours arrêté.`);
          callbacks?.onStepEnd?.(i, results[i]);
          break;
        }
      }

      callbacks?.onStepEnd?.(i, results[i]);
      if (this.cancelled) break;
    }

    this.adb.setAbortSignal(null);
    this.abortController = null;
    this.log(`Parcours "${scenario.name}" termine`);
    callbacks?.onComplete?.(results);
    return results;
  }
}
