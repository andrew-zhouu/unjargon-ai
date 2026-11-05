'use client';

import { Field, Label, Switch } from '@headlessui/react';
import { Eye, FileText, Image as ImageIcon, X } from 'lucide-react';
import TextInput from '@/components/TextInput';
import DomainSelect from '@/components/DomainSelect';
import LevelSelect from '@/components/LevelSelect';
import UploadBox from '@/components/UploadBox';
import SimplifyButton from '@/components/SimplifyButton';
import { cn } from '@/lib/utils';

function CompareSwitch({ checked, onChange, disabled, className }) {
  return (
    <Field disabled={disabled} className={cn('flex items-center gap-3', className)}>
      <Label className="text-sm text-text-soft data-[disabled]:opacity-50">Side-by-side</Label>
      <Switch
        checked={checked}
        onChange={onChange}
        className={cn(
          'group relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors',
          'bg-white/15 data-[checked]:bg-brand-blue data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40'
        )}
      >
        <span
          aria-hidden="true"
          className="inline-block size-4 translate-x-1 rounded-full bg-white shadow transition-transform group-data-[checked]:translate-x-5"
        />
      </Switch>
    </Field>
  );
}

/**
 * The text editor card: textarea, upload, domain / level, optional
 * side-by-side preference, character count, and the Unjargon action.
 */
export default function Composer({
  textareaRef,
  text,
  onTextChange,
  onSubmit,
  submitText,
  submitLabel = 'Unjargon',
  loading,
  maxChars,
  rows = 8,
  // controls
  showSelects = true,
  domain,
  onDomainChange,
  level,
  onLevelChange,
  showCompare = false,
  compare = false,
  onCompareChange,
  compareDisabled = false,
  // attachments
  attachment,
  onUploaded,
  onUploadError,
  onPreview,
  onRemoveAttachment,
  previewSrc,
  onClosePreview,
  // first-visit tip
  showTip = false,
  onDismissTip,
}) {
  const length = text?.length ?? 0;
  const over = length > maxChars;
  const isPdf = attachment?.mime === 'application/pdf';
  const AttIcon = isPdf ? FileText : ImageIcon;

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!loading && submitText?.trim()) onSubmit();
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-px',
        'bg-[linear-gradient(135deg,rgb(60_203_234/0.45),rgb(74_123_255/0.28)_45%,rgb(139_92_246/0.5))]',
        'focus-within:bg-[linear-gradient(135deg,rgb(60_203_234/0.85),rgb(74_123_255/0.6)_45%,rgb(139_92_246/0.9))]'
      )}
    >
      <div className="rounded-[15px] bg-ink-850">
        <TextInput
          ref={textareaRef}
          value={text}
          onChange={onTextChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          className="min-h-[9rem]"
          aria-describedby="char-count"
        />

        {/* Attachment */}
        {attachment && (
          <div className="mx-3 mb-3 sm:mx-4">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-white/[0.03] py-2 pl-3 pr-2">
              <AttIcon className="size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  {attachment.file?.name || attachment.name || 'Uploaded file'}
                </p>
                <p className="text-xs text-text-muted">
                  {attachment.mime?.split('/')[1]?.toUpperCase() || 'FILE'}
                  {' · '}
                  {Math.round((attachment.file?.size || attachment.size) / 102.4) / 10} KB
                  {' · '}
                  Unjargon will read this file
                </p>
              </div>
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-text-soft hover:bg-white/[0.07] hover:text-text"
              >
                <Eye className="size-3.5" aria-hidden="true" /> Preview
              </button>
              <button
                type="button"
                onClick={onRemoveAttachment}
                aria-label="Remove file"
                className="grid size-8 place-items-center rounded-md text-text-muted hover:bg-white/[0.07] hover:text-text"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {previewSrc && (
              <div className="mt-2 rounded-lg border border-line bg-ink-900 p-2">
                <div className="mb-2 flex items-center justify-between pl-1">
                  <span className="text-xs font-medium text-text-soft">File preview</span>
                  <button
                    type="button"
                    onClick={onClosePreview}
                    className="h-7 rounded-md px-2.5 text-xs font-medium text-text-soft hover:bg-white/[0.07]"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-96 overflow-auto rounded bg-black/20">
                  {isPdf ? (
                    <iframe src={previewSrc} title="PDF preview" className="h-96 w-full rounded" />
                  ) : (
                    // Blob / data URLs can't go through next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="Attachment preview" className="mx-auto max-h-96 object-contain" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 sm:gap-2 sm:px-4">
          <UploadBox onUploaded={onUploaded} onError={onUploadError} disabled={loading} compact />
          {showSelects && (
            <>
              <DomainSelect value={domain} onChange={onDomainChange} />
              <LevelSelect value={level} onChange={onLevelChange} />
            </>
          )}
          {showCompare && (
            <CompareSwitch
              checked={compare}
              onChange={onCompareChange}
              disabled={compareDisabled || loading}
              className="ml-2 max-sm:hidden"
            />
          )}
          <span
            id="char-count"
            className={cn('ml-auto pl-2 text-xs tabular-nums', over ? 'font-semibold text-red-400' : 'text-text-muted')}
          >
            {length.toLocaleString()} / {maxChars.toLocaleString()}
            <span className="sr-only"> characters</span>
          </span>
        </div>

        {/* Action row */}
        <div className="flex flex-col-reverse gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative">
            <SimplifyButton
              onClick={onSubmit}
              loading={loading}
              text={submitText}
              label={submitLabel}
              className="w-full sm:w-auto"
            />

            {showTip && (
              <div
                role="dialog"
                aria-label="Unjargon tip"
                className="absolute left-0 top-full z-40 mt-3 w-72 rounded-xl border border-line-strong bg-ink-800 px-4 py-3 text-sm leading-snug text-text shadow-2xl shadow-black/50 sm:left-full sm:top-1/2 sm:mt-0 sm:ml-4 sm:-translate-y-1/2"
              >
                <p className="font-semibold">Unjargon = Simplify</p>
                <p className="mt-1 text-text-soft">
                  Click this button to turn jargon into clear language. Works for text, images, and PDFs you upload.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onDismissTip}
                    className="h-8 rounded-md bg-white px-3 text-xs font-semibold text-ink-900 hover:bg-white/90"
                  >
                    Got it
                  </button>
                  <span className="text-xs text-text-muted">Shown only once</span>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute bottom-full left-8 -mb-[5px] size-2.5 rotate-45 border-l border-t border-line-strong bg-ink-800 sm:bottom-auto sm:left-0 sm:top-1/2 sm:-mb-0 sm:-ml-[5px] sm:-mt-[5px] sm:border-b sm:border-l sm:border-r-0 sm:border-t-0"
                />
              </div>
            )}
          </div>

          <p className="hidden text-xs text-text-muted [@media(hover:hover)]:sm:block">
            <kbd className="rounded border border-line px-1.5 py-0.5 font-sans text-[0.6875rem]">Ctrl</kbd>
            {' + '}
            <kbd className="rounded border border-line px-1.5 py-0.5 font-sans text-[0.6875rem]">Enter</kbd>
          </p>

          {showCompare && (
            <CompareSwitch
              checked={compare}
              onChange={onCompareChange}
              disabled={compareDisabled || loading}
              className="justify-between px-1 sm:hidden"
            />
          )}
        </div>
      </div>
    </div>
  );
}
