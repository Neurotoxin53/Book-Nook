'use client';

import { Check, Palette } from 'lucide-react';
import {
  constructions,
  coverTreatments,
  decorations,
  fonts,
  openedBackgrounds,
  pages,
  scenes,
} from '@/lib/appearance/registry';
import type { Appearance } from '@/lib/domain/types';

const fontGroups = [
  ['editorial-serif', 'Editorial serif'],
  ['classic-serif', 'Classic serif'],
  ['clean-sans', 'Clean sans'],
  ['typewriter-mono', 'Typewriter & mono'],
  ['handwriting', 'Handwriting'],
  ['decorative-fantasy', 'Decorative & fantasy'],
] as const;

type AppearanceDraft = Pick<
  Appearance,
  | 'constructionId'
  | 'sceneId'
  | 'pageId'
  | 'fontId'
  | 'accent'
  | 'decorations'
  | 'coverTreatmentId'
  | 'openedBackgroundId'
>;

export function BookCustomizer({
  value,
  onChange,
}: {
  value: AppearanceDraft;
  onChange: (next: AppearanceDraft) => void;
}) {
  const change = <Key extends keyof AppearanceDraft>(key: Key, next: AppearanceDraft[Key]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <aside className="customizer" aria-labelledby="customizer-title">
      <div className="customizer-heading">
        <Palette aria-hidden="true" />
        <div>
          <span className="eyebrow">Make it yours</span>
          <h2 id="customizer-title">Book studio</h2>
        </div>
      </div>

      <fieldset className="studio-group">
        <legend>Construction</legend>
        <div className="option-grid compact-options">
          {constructions.map((option) => (
            <OptionButton
              key={option.id}
              active={value.constructionId === option.id}
              label={option.label}
              description={option.description}
              onClick={() => change('constructionId', option.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="studio-group">
        <legend>Room</legend>
        <div className="scene-options">
          {scenes.map((scene) => (
            <button
              className={value.sceneId === scene.id ? 'scene-chip active' : 'scene-chip'}
              type="button"
              key={scene.id}
              aria-pressed={value.sceneId === scene.id}
              onClick={() => change('sceneId', scene.id)}
            >
              <span className="scene-swatches" aria-hidden="true">
                {scene.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
              </span>
              <span><strong>{scene.label}</strong><small>{scene.description}</small></span>
              {value.sceneId === scene.id && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="studio-group">
        <legend>Open-book background</legend>
        <select value={value.openedBackgroundId} onChange={(event) => change('openedBackgroundId', event.target.value)}>
          {openedBackgrounds.map((option) => <option key={option.id} value={option.id}>{option.label} — {option.description}</option>)}
        </select>
      </fieldset>

      <fieldset className="studio-group split-group">
        <label>
          <span>Page treatment</span>
          <select value={value.pageId} onChange={(event) => change('pageId', event.target.value)}>
            {pages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span>Cover treatment</span>
          <select value={value.coverTreatmentId} onChange={(event) => change('coverTreatmentId', event.target.value)}>
            {coverTreatments.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset className="studio-group">
        <legend>Type</legend>
        <select value={value.fontId} onChange={(event) => change('fontId', event.target.value)}>
          {fontGroups.map(([group, label]) => (
            <optgroup label={label} key={group}>
              {fonts.filter((item) => item.group === group).map((option) => (
                <option value={option.id} key={option.id}>{option.label}{option.headingOnly ? ' · headings' : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="field-note">36 open-source Google Fonts are pinned and self-hosted. Decorative families stay on headings for comfortable reading.</p>
      </fieldset>

      <fieldset className="studio-group split-group accent-group">
        <label>
          <span>Accent</span>
          <input type="color" value={value.accent} onChange={(event) => change('accent', event.target.value)} />
        </label>
        <label>
          <span>Hex color</span>
          <input
            type="text"
            value={value.accent}
            pattern="#[0-9a-fA-F]{6}"
            maxLength={7}
            spellCheck={false}
            onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && change('accent', event.target.value)}
          />
        </label>
      </fieldset>

      <fieldset className="studio-group">
        <legend>Page keepsakes</legend>
        <div className="decoration-options">
          {decorations.map((option) => {
            const checked = value.decorations.includes(option.id);
            return (
              <label className={checked ? 'decoration-chip active' : 'decoration-chip'} key={option.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => change(
                    'decorations',
                    checked ? value.decorations.filter((id) => id !== option.id) : [...value.decorations, option.id],
                  )}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </aside>
  );
}

function OptionButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? 'option-button active' : 'option-button'} aria-pressed={active} onClick={onClick}>
      <span><strong>{label}</strong><small>{description}</small></span>
      {active && <Check aria-hidden="true" />}
    </button>
  );
}
