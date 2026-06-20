"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ActionButton } from "../../../components/ui/action-button";
import { inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { createListingAction, suggestListingFieldsAction } from "../actions/listing.actions";
import { categoryLabel, CATEGORY_SLUGS } from "../category-labels";
import { uploadListingImage, type UploadedImage } from "../upload-image.client";

const MAX_IMAGES = 10;
const TITLE_MAX = 40;
const DESCRIPTION_MAX = 1000;
const MIN_PRICE = 300;
const FEE_RATE = 0.1;

// 状態は Mercari と同じ6段階。値は表示ラベル文字列をそのまま送信する（API は自由文字列）。
const CONDITION_KEYS = ["new", "likeNew", "good", "fair", "poor", "bad"] as const;

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export function ListingForm() {
  const tf = useTranslations("listingForm");
  const locale = useLocale();
  const [userHint, setUserHint] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("");
  const [confidenceNotes, setConfidenceNotes] = useState<string[]>([]);
  const [assistMessage, setAssistMessage] = useState<string | undefined>();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadMessage(undefined);

    try {
      const uploaded = await Promise.all(files.map((file) => uploadListingImage(file)));
      setImages((current) => [...current, ...uploaded].slice(0, MAX_IMAGES));
    } catch {
      setUploadMessage(tf("uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage(hash: string) {
    setImages((current) => current.filter((image) => image.hash !== hash));
  }

  function generateListingFields() {
    startTransition(async () => {
      setAssistMessage(undefined);

      try {
        const suggestion = await suggestListingFieldsAction({
          userHint,
          imageUrls: images.map((image) => image.aiUrl ?? image.url),
        });
        setTitle(suggestion.title.slice(0, TITLE_MAX));
        setDescription(suggestion.description.slice(0, DESCRIPTION_MAX));
        setCategory(suggestion.category);
        setCondition(suggestion.condition);
        setConfidenceNotes(suggestion.confidenceNotes);
      } catch {
        setAssistMessage(tf("aiFailed"));
      }
    });
  }

  const conditionOptions = CONDITION_KEYS.map((key) => tf(`condition.${key}`));
  // カテゴリは abo の正準スラッグ（DB/AI 制約と一致）。値=スラッグ、表示=対訳ラベル。
  // AI提案などで定型外の値が来たら、選択肢に補って必ず表示・選択できるようにする。
  const categoryChoices =
    category.length > 0 && !CATEGORY_SLUGS.includes(category)
      ? [category, ...CATEGORY_SLUGS]
      : CATEGORY_SLUGS;

  const priceNumber = Number(price);
  const hasValidPrice = Number.isFinite(priceNumber) && priceNumber >= MIN_PRICE;
  const fee = hasValidPrice ? Math.floor(priceNumber * FEE_RATE) : 0;
  const profit = hasValidPrice ? priceNumber - fee : 0;

  const canAssist = !isPending && images.length > 0;
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    category.length > 0 &&
    condition.length > 0 &&
    hasValidPrice &&
    !isPending;

  return (
    <form action={createListingAction} className="mx-auto max-w-2xl pb-24">
      <input name="images" type="hidden" value={JSON.stringify(images)} />
      <input name="condition" type="hidden" value={condition} />

      <Section title={tf("photosSectionTitle")} note={tf("photoCount", { count: images.length })}>
        <p className="text-sm text-ink-soft">{tf("photosHint")}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <div className="relative aspect-square" key={image.hash}>
              {/* アップロード済み画像はstorageを直接読む公開アセット */}
              <img alt="" className="size-full rounded-md object-cover" src={image.url} />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-sm bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-paper">
                  {tf("mainBadge")}
                </span>
              )}
              <button
                aria-label={tf("removeImage")}
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink text-xs text-paper shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                onClick={() => removeImage(image.hash)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed border-line-strong text-ink-faint transition-colors hover:border-ink hover:text-ink-soft focus-within:border-ink focus-within:text-ink-soft">
              <input
                accept="image/*"
                className="sr-only"
                disabled={isUploading}
                multiple
                onChange={handleFileChange}
                type="file"
              />
              <span className="flex flex-col items-center gap-1 text-center">
                <span className="text-2xl leading-none">＋</span>
                <span className="text-[11px] font-medium">{tf("addPhoto")}</span>
              </span>
            </label>
          )}
        </div>
        {isUploading && <p className="mt-2 text-xs text-ink-soft">{tf("uploading")}</p>}
        {uploadMessage !== undefined && <p className="mt-2 text-xs text-seal-strong">{uploadMessage}</p>}
      </Section>

      <Section title={tf("aiSectionTitle")}>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
            {tf("aiNoteLabel")}
          </span>
          <textarea
            className={textareaClassName}
            onChange={(event) => setUserHint(event.target.value)}
            placeholder={tf("aiNotePlaceholder")}
            value={userHint}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ActionButton disabled={!canAssist} onClick={generateListingFields} variant="accent">
            {isPending ? tf("generating") : tf("fillWithAi")}
          </ActionButton>
          {images.length === 0 && <p className="text-xs text-ink-faint">{tf("aiNeedsImage")}</p>}
          {assistMessage !== undefined && <p className="text-xs text-seal-strong">{assistMessage}</p>}
        </div>
        {confidenceNotes.length > 0 && (
          <p className="mt-2 text-xs leading-5 text-ink-soft">{confidenceNotes[0]}</p>
        )}
      </Section>

      <Section title={tf("detailSectionTitle")}>
        <div className="grid gap-5">
          <Field counter={`${title.length}/${TITLE_MAX}`} label={tf("titleLabel")}>
            <input
              className={inputClassName}
              maxLength={TITLE_MAX}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={tf("titlePlaceholder")}
              required
              value={title}
            />
          </Field>

          <Field counter={`${description.length}/${DESCRIPTION_MAX}`} label={tf("descriptionLabel")}>
            <textarea
              className={textareaClassName}
              maxLength={DESCRIPTION_MAX}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={tf("descriptionPlaceholder")}
              required
              value={description}
            />
          </Field>

          <Field label={tf("categoryLabel")}>
            <select
              className={inputClassName}
              name="category"
              onChange={(event) => setCategory(event.target.value)}
              required
              value={category}
            >
              <option disabled value="">
                {tf("categorySelectPlaceholder")}
              </option>
              {categoryChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {categoryLabel(choice, locale)}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
              {tf("conditionLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((label) => {
                const active = condition === label;
                return (
                  <button
                    aria-pressed={active}
                    className={
                      active
                        ? "rounded-full border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-paper"
                        : "rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                    }
                    key={label}
                    onClick={() => setCondition(label)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title={tf("priceSectionTitle")}>
        <Field label={tf("priceLabel")}>
          <div className="flex items-stretch overflow-hidden rounded-md border border-line-strong bg-surface focus-within:border-ink">
            <span className="grid place-items-center px-3 font-mono text-sm text-ink-faint">¥</span>
            <input
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-4 font-mono text-sm text-ink outline-none placeholder:text-ink-faint"
              inputMode="numeric"
              min={MIN_PRICE}
              name="price"
              onChange={(event) => setPrice(event.target.value)}
              placeholder={String(MIN_PRICE)}
              required
              type="number"
              value={price}
            />
          </div>
        </Field>
        <p className="mt-1.5 text-xs text-ink-faint">{tf("priceMinHint")}</p>

        {hasValidPrice && (
          <dl className="mt-4 space-y-2 rounded-md border border-line bg-paper p-3">
            <div className="flex items-center justify-between text-sm text-ink-soft">
              <dt>{tf("feeLabel")}</dt>
              <dd className="font-mono">- {yen(fee)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold text-ink">
              <dt>{tf("profitLabel")}</dt>
              <dd className="font-mono text-base text-seal-strong">{yen(profit)}</dd>
            </div>
          </dl>
        )}
      </Section>

      <div className="sticky bottom-0 mt-2 border-t border-line bg-paper/95 py-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <ActionButton className="flex-1" disabled={!canSubmit} type="submit" variant="secondary">
            {tf("createDraft")}
          </ActionButton>
          <ActionButton
            className="flex-1"
            disabled={!canSubmit}
            name="publish"
            type="submit"
            value="true"
            variant="primary"
          >
            {tf("createAndPublish")}
          </ActionButton>
        </div>
      </div>
    </form>
  );
}

function Section({ children, note, title }: { children: ReactNode; note?: string; title: string }) {
  return (
    <section className="border-b border-line py-6 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        {note !== undefined && <span className="font-mono text-[11px] text-ink-faint">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  counter,
  label,
}: {
  children: ReactNode;
  counter?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</span>
        {counter !== undefined && <span className="font-mono text-[11px] text-ink-faint">{counter}</span>}
      </span>
      {children}
    </label>
  );
}
