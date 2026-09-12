import { useEffect, useRef, useState } from 'preact/hooks';
import { itemById } from '../../catalog/index.ts';
import {
  createFreshSave,
  EXPORT_FILENAME,
  exportSave,
  importSave,
  resetSave,
  writeNotice,
  type ImportResult,
} from '../../core/save.ts';
import type {
  ElapsedLevel,
  Language,
  MissionSummary,
  MotionSetting,
  ReadingLevel,
} from '../../core/types.ts';
import { dispatch, flushSave, language, notice, save, storage } from '../../state/store.ts';
import { go, type Screen } from '../../state/nav.ts';
import { LANGUAGES, languageNames, type StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { groupKeyHandler, useFocusOnMount } from '../hooks.ts';
import { Dialog } from '../components/Dialog.tsx';
import { HoldButton } from '../components/HoldButton.tsx';

interface Props {
  /** The screen that opened the corner; "Done" returns there (SPEC §3.9). */
  returnTo: Screen;
}

export const GEAR_HOLD_MS = 1500;
const RESET_HOLD_MS = 2000;
const RECENT_ROWS = 10;
const READING: ReadingLevel[] = [1, 2, 3, 4];
const ELAPSED: ElapsedLevel[] = [1, 2, 3];
const MOTIONS: MotionSetting[] = ['system', 'reduced', 'full'];

/**
 * S6 Parent corner (SPEC §3.9): language, levels with the lock, clock options, sound and
 * motion, export / import / reset of the save, recent missions, the damaged-save notice and
 * the about block. Every setting change goes through the settings reducer; the save file
 * operations use core/save.ts and the store's storage.
 */
export function S6Parent({ returnTo }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const state = save.value;
  const settings = state.settings;
  const lang = language.value;
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<Extract<ImportResult, { ok: true }> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const done = () => go(returnTo);

  // Escape works like "Done" (SPEC §13.1: Escape closes the open panel or dialog) unless the
  // import dialog is up (it handles its own Escape). Registered once and read through refs, so
  // the key that closes the dialog and the next one never race the effect re-registration.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const returnRef = useRef(returnTo);
  returnRef.current = returnTo;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingRef.current) go(returnRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exportFile = () => {
    flushSave();
    const blob = new Blob([exportSave(save.value)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT_FILENAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(t('s6.exportDone'));
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = importSave(await file.text());
    if (!result.ok) {
      setStatus(result.reason === 'newer-version' ? t('s6.importNewer') : t('s6.importInvalid'));
      return;
    }
    setStatus('');
    setPending(result);
  };

  /** Replaces the save; the store's next write turns the current save into the backup. */
  const confirmImport = () => {
    if (!pending) return;
    dispatch({ type: 'save/replace', save: pending.save });
    flushSave();
    setPending(null);
    setStatus(t('s6.imported'));
  };

  /** Reset (SPEC §11.3): main and backup removed, fresh save, back to the first-launch flow. */
  const reset = () => {
    resetSave(storage);
    notice.value = null;
    dispatch({ type: 'save/replace', save: createFreshSave() });
    go({ id: 'S0' });
  };

  const dismissNotice = () => {
    writeNotice(storage, null);
    notice.value = null;
  };

  const history = state.progress.history.slice(-RECENT_ROWS).reverse();

  return (
    <main class="screen s6" aria-labelledby="s6-title" data-testid="s6">
      <header class="s6-header">
        <h1 id="s6-title" class="s6-title" tabIndex={-1} ref={heading}>
          {t('s6.title')}
        </h1>
        <button type="button" class="btn btn-primary" data-testid="s6-done" onClick={done}>
          {t('s6.done')}
        </button>
      </header>
      <div class="s6-body">
        {notice.value && (
          <p class="s6-notice" role="status" data-testid="s6-notice">
            {t(notice.value.kind === 'damaged' ? 's6.damagedSave' : 's6.newerSave', {
              date: formatDate(notice.value.at, lang),
            })}{' '}
            <button type="button" class="btn btn-small" onClick={dismissNotice}>
              {t('s6.dismiss')}
            </button>
          </p>
        )}
        <div class="s6-columns">
          <div class="s6-column">
            <section class="s6-section" aria-labelledby="s6-language">
              <h2 id="s6-language">{t('s6.language')}</h2>
              <div class="lang-switch" role="group" aria-label={t('s6.language')}>
                {LANGUAGES.map((code: Language) => (
                  <button
                    key={code}
                    type="button"
                    class="chip"
                    lang={code}
                    aria-pressed={lang === code}
                    data-testid={`s6-lang-${code}`}
                    onClick={() => dispatch({ type: 'settings/language', language: code })}
                  >
                    {languageNames[code]}
                  </button>
                ))}
              </div>
            </section>

            <section class="s6-section" aria-labelledby="s6-levels">
              <h2 id="s6-levels">{t('s6.levels')}</h2>
              <h3 id="s6-reading">{t('s6.reading')}</h3>
              <div
                class="radio-rows"
                role="radiogroup"
                aria-labelledby="s6-reading"
                data-testid="s6-levels-A"
                onKeyDown={groupKeyHandler}
              >
                {READING.map((level) => (
                  <RadioRow
                    key={level}
                    checked={settings.readingLevel === level}
                    name={t(`level.r${level}` as StringKey)}
                    description={t(`level.r${level}.desc` as StringKey)}
                    testId={`s6-level-r${level}`}
                    onSelect={() =>
                      dispatch({ type: 'settings/readingLevel', level, byParent: true })
                    }
                  />
                ))}
              </div>
              <h3 id="s6-elapsed">{t('s6.elapsed')}</h3>
              <div
                class="radio-rows"
                role="radiogroup"
                aria-labelledby="s6-elapsed"
                data-testid="s6-levels-B"
                onKeyDown={groupKeyHandler}
              >
                {ELAPSED.map((level) => (
                  <RadioRow
                    key={level}
                    checked={settings.elapsedLevel === level}
                    name={t(`level.e${level}` as StringKey)}
                    description={t(`level.e${level}.desc` as StringKey)}
                    testId={`s6-level-e${level}`}
                    onSelect={() =>
                      dispatch({ type: 'settings/elapsedLevel', level, byParent: true })
                    }
                  />
                ))}
              </div>
              <Switch
                label={t('s6.lock')}
                checked={settings.levelsLocked}
                testId="s6-lock"
                onChange={(locked) => dispatch({ type: 'settings/levelsLocked', locked })}
              />
            </section>

            <section class="s6-section" aria-labelledby="s6-clock">
              <h2 id="s6-clock">{t('s6.clock')}</h2>
              <Switch
                label={t('s6.hour24')}
                checked={settings.hour24Reading}
                testId="s6-hour24"
                onChange={(enabled) => dispatch({ type: 'settings/hour24Reading', enabled })}
              />
            </section>

            <section class="s6-section" aria-labelledby="s6-sound">
              <h2 id="s6-sound">{t('s6.sound')}</h2>
              <Switch
                label={t('s6.sound')}
                checked={settings.sound}
                testId="s6-sound"
                onChange={(sound) => dispatch({ type: 'settings/sound', sound })}
              />
              <h3 id="s6-motion">{t('s6.motion')}</h3>
              <div
                class="chips"
                role="radiogroup"
                aria-labelledby="s6-motion"
                data-testid="s6-motion"
                onKeyDown={groupKeyHandler}
              >
                {MOTIONS.map((motion) => (
                  <button
                    key={motion}
                    type="button"
                    role="radio"
                    class="chip"
                    aria-checked={settings.motion === motion}
                    data-testid={`s6-motion-${motion}`}
                    onClick={() => dispatch({ type: 'settings/motion', motion })}
                  >
                    {t(`s6.motion.${motion}`)}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div class="s6-column">
            <section class="s6-section" aria-labelledby="s6-save">
              <h2 id="s6-save">{t('s6.save')}</h2>
              <div class="s6-actions">
                <button type="button" class="btn" data-testid="s6-export" onClick={exportFile}>
                  {t('s6.export')}
                </button>
                <button
                  type="button"
                  class="btn"
                  data-testid="s6-import"
                  onClick={() => fileInput.current?.click()}
                >
                  {t('s6.import')}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".json,application/json"
                  class="visually-hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-testid="s6-import-file"
                  onChange={(e) => void onFile(e)}
                />
                <HoldButton
                  label={t('s6.reset')}
                  holdMs={RESET_HOLD_MS}
                  variant="wide"
                  testId="s6-reset"
                  onHold={reset}
                >
                  {t('s6.reset')}
                </HoldButton>
              </div>
              <p class="s6-status" role="status" data-testid="s6-status">
                {status}
              </p>
            </section>

            <section class="s6-section" aria-labelledby="s6-recent">
              <h2 id="s6-recent">{t('s6.recent')}</h2>
              {history.length === 0 ? (
                <p class="s6-muted">{t('s6.recentEmpty')}</p>
              ) : (
                <table class="s6-table" data-testid="s6-history">
                  <thead>
                    <tr>
                      <th>{t('s6.col.when')}</th>
                      <th>{t('s6.col.mission')}</th>
                      <th>{t('s6.col.level')}</th>
                      <th>{t('s6.col.wrong')}</th>
                      <th>{t('s6.col.hints')}</th>
                      <th>{t('s6.col.time')}</th>
                      <th>{t('s6.col.prize')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={`${h.endedAt}-${i}`}>
                        <td>{formatDate(h.endedAt, lang)}</td>
                        <td>{t(`mission.${h.activity.toLowerCase()}.${h.theme}` as StringKey)}</td>
                        <td>
                          {t(`level.${h.activity === 'A' ? 'r' : 'e'}${h.level}` as StringKey)}
                        </td>
                        <td>{h.wrong}</td>
                        <td>{h.hints}</td>
                        <td>{formatSeconds(h.seconds)}</td>
                        <td>{prizeLabel(h)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section class="s6-section" aria-labelledby="s6-about">
              <h2 id="s6-about">{t('s6.about')}</h2>
              <p data-testid="s6-version">{t('s6.version', { version: __APP_VERSION__ })}</p>
              <p class="s6-muted">{t('s6.credits')}</p>
              <p class="s6-privacy">{t('s6.privacy')}</p>
            </section>
          </div>
        </div>
      </div>
      {pending && (
        <Dialog titleId="import-title" onClose={() => setPending(null)} testId="import-dialog">
          <h2 id="import-title" class="dialog-title">
            {t('s6.importTitle')}
          </h2>
          <p class="dialog-body">
            {t('s6.importSummary', {
              space: pending.summary.collected.space,
              sweet: pending.summary.collected.sweet,
              stars: pending.summary.stars.space + pending.summary.stars.sweet,
              date: formatDate(pending.summary.updatedAt, lang),
            })}
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="btn"
              data-testid="import-cancel"
              onClick={() => setPending(null)}
            >
              {t('s6.cancel')}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              data-testid="import-confirm"
              onClick={confirmImport}
            >
              {t('s6.importConfirm')}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

interface RadioRowProps {
  checked: boolean;
  name: string;
  description: string;
  testId: string;
  onSelect: () => void;
}

/** A radio row: child-facing level name plus a short adult description (SPEC §3.9). */
function RadioRow({ checked, name, description, testId, onSelect }: RadioRowProps) {
  return (
    <button
      type="button"
      role="radio"
      class="radio-row"
      aria-checked={checked}
      data-testid={testId}
      onClick={onSelect}
    >
      <span class="radio-mark" aria-hidden="true">
        {checked ? '●' : ''}
      </span>
      <span class="radio-text">
        <span class="radio-name">{name}</span>
        <span class="radio-desc">{description}</span>
      </span>
    </button>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  testId: string;
  onChange: (checked: boolean) => void;
}

/** On/off switch; the state is also written out so it is never colour alone (SPEC §13.2). */
function Switch({ label, checked, testId, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      class="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
    >
      <span class="switch-track" aria-hidden="true">
        <span class="switch-knob" />
      </span>
      <span class="switch-label">{label}</span>
      <span class="switch-state">{checked ? t('ui.on') : t('ui.off')}</span>
    </button>
  );
}

function formatDate(iso: string, lang: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function prizeLabel(h: MissionSummary): string {
  if (h.claimed === null) return '—';
  if (h.claimed === 'star') return `★ ${t('s6.star')}`;
  const item = itemById(h.claimed);
  return item ? t(item.nameKey as StringKey) : h.claimed;
}
