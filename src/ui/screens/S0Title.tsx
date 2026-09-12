import { useEffect, useRef } from 'preact/hooks';
import { LANGUAGES, languageNames } from '../../strings/index.ts';
import type { Language, Theme } from '../../core/types.ts';
import { dispatch, language, languageChosen, lastTheme, soundOn } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import { t } from '../i18n.ts';
import { LanguageChoice } from '../components/LanguageChoice.tsx';
import { RoomCard } from '../components/RoomCard.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { HoldButton } from '../components/HoldButton.tsx';
import { GEAR_HOLD_MS } from './S6Parent.tsx';

/** S0 Title and room choice (SPEC §3.3). */
export function S0Title() {
  const lastCard = useRef<HTMLButtonElement | null>(null);
  const chosen = languageChosen.value;

  // Focus: the language dialog focuses itself (its effect runs first, so the title must not
  // take focus back); afterwards the last-used room card is pre-focused (SPEC §3.3), so
  // Enter opens it straight away.
  useEffect(() => {
    if (chosen) lastCard.current?.focus({ preventScroll: true });
  }, [chosen]);

  const openRoom = (theme: Theme) => {
    dispatch({ type: 'settings/lastTheme', theme });
    go({ id: 'S1', theme });
  };

  const chooseLanguage = (lang: Language) => {
    dispatch({ type: 'settings/language', language: lang });
  };

  const preFocusRef = (el: HTMLButtonElement | null) => {
    lastCard.current = el;
  };

  return (
    <main class="screen s0" aria-labelledby="s0-title">
      {!languageChosen.value && <LanguageChoice onChoose={chooseLanguage} />}
      <header class="s0-header">
        <h1 id="s0-title" class="title-lockup" tabIndex={-1}>
          {t('app.title')}
        </h1>
        <p class="s0-sub">{t('s0.choose')}</p>
      </header>
      <div class="room-cards">
        {(['space', 'sweet'] as const).map((theme) => (
          <RoomCard
            key={theme}
            theme={theme}
            name={t(`room.${theme}`)}
            onOpen={() => openRoom(theme)}
            cardRef={lastTheme.value === theme ? preFocusRef : undefined}
          />
        ))}
      </div>
      <div class="s0-footer">
        <div class="lang-switch" role="group" aria-label={t('ui.language')}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              class="chip"
              lang={lang}
              aria-pressed={languageChosen.value && language.value === lang}
              data-testid={`switch-${lang}`}
              onClick={() => chooseLanguage(lang)}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
        <div class="corner-buttons">
          <IconButton
            label={soundOn.value ? t('ui.soundOn') : t('ui.soundOff')}
            pressed={soundOn.value}
            testId="sound-toggle"
            onClick={() => dispatch({ type: 'settings/sound', sound: !soundOn.value })}
          >
            <span aria-hidden="true">{soundOn.value ? '🔊' : '🔇'}</span>
          </IconButton>
          <HoldButton
            label={t('ui.parentCorner')}
            holdMs={GEAR_HOLD_MS}
            testId="parent-gear"
            onHold={() => go({ id: 'S6', returnTo: { id: 'S0' } })}
          >
            <span aria-hidden="true">⚙️</span>
          </HoldButton>
        </div>
      </div>
    </main>
  );
}
