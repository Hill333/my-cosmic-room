import { LANGUAGES, languageNames } from '../../strings/index.ts';
import type { Language } from '../../core/types.ts';
import { useRef } from 'preact/hooks';
import { useFocusOnMount } from '../hooks.ts';
import { trapTab } from './Dialog.tsx';

interface Props {
  onChoose: (lang: Language) => void;
}

/**
 * First-launch language overlay (SPEC §3.3). Shown in all three languages at once. Modal: Tab
 * stays inside (AT-38); there is nothing to escape to, a language must be chosen.
 */
export function LanguageChoice({ onChoose }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const box = useRef<HTMLDivElement>(null);
  return (
    <div
      class="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-title"
      onKeyDown={(e) => trapTab(e, box.current)}
    >
      <div class="card lang-card" ref={box}>
        <h1 id="lang-title" class="lang-title" tabIndex={-1} ref={heading}>
          Which language? · Hangi dil? · Welke taal?
        </h1>
        <div class="lang-buttons">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              class="btn btn-primary btn-xl"
              lang={lang}
              data-testid={`lang-${lang}`}
              onClick={() => onChoose(lang)}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
