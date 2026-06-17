"use client";

import { useState, useTransition } from "react";

import { ActionButton } from "../../../components/ui/action-button";
import { FormField, inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { createListingAction, suggestListingFieldsAction } from "../actions/listing.actions";
import { uploadListingImage, type UploadedImage } from "../upload-image.client";

export function ListingForm() {
  const [userHint, setUserHint] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
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
      setImages((current) => [...current, ...uploaded].slice(0, 10));
    } catch {
      setUploadMessage("Image upload failed.");
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
          imageUrls: images.map((image) => image.url),
        });
        setTitle(suggestion.title);
        setDescription(suggestion.description);
        setCategory(suggestion.category);
        setCondition(suggestion.condition);
        setConfidenceNotes(suggestion.confidenceNotes);
      } catch {
        setAssistMessage("AI suggestion failed.");
      }
    });
  }

  const canAssist = !isPending && (userHint.trim().length > 0 || images.length > 0);

  return (
    <GlassPanel className="p-4 md:p-5">
      <form action={createListingAction} className="grid gap-5">
        <input name="images" type="hidden" value={JSON.stringify(images)} />
        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Product</h2>
              <p className="mt-1 text-sm text-neutral-500">Add photos and fill the fields, or let AI draft them from your photos and a short note.</p>
            </div>
          </div>

          <FormField label="Photos">
            <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((image) => (
                    <div className="relative" key={image.hash}>
                      {/* アップロード済み画像はstorageを直接読む公開アセット */}
                      <img alt="" className="size-24 rounded-lg object-cover" src={image.url} />
                      <button
                        aria-label="Remove image"
                        className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-neutral-900 text-xs text-white shadow"
                        onClick={() => removeImage(image.hash)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  accept="image/*"
                  className="text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-white"
                  disabled={isUploading || images.length >= 10}
                  multiple
                  onChange={handleFileChange}
                  type="file"
                />
                {isUploading && <p className="text-xs text-neutral-500">Uploading...</p>}
                {uploadMessage !== undefined && <p className="text-xs text-neutral-500">{uploadMessage}</p>}
              </div>
            </div>
          </FormField>

          <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-3">
            <FormField label="AI note">
              <textarea
                className={textareaClassName}
                onChange={(event) => setUserHint(event.target.value)}
                placeholder="Black sneakers, bought last year, worn a few times, original box included."
                value={userHint}
              />
            </FormField>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ActionButton disabled={!canAssist} onClick={generateListingFields}>
                {isPending ? "Generating..." : "Fill fields with AI"}
              </ActionButton>
              {assistMessage !== undefined && <p className="text-xs text-neutral-500">{assistMessage}</p>}
            </div>
            {confidenceNotes.length > 0 && (
              <p className="text-xs leading-5 text-neutral-500">{confidenceNotes[0]}</p>
            )}
          </div>

          <FormField label="Title">
            <input
              className={inputClassName}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Refurbished camera kit"
              required
              value={title}
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className={textareaClassName}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Condition, included accessories, and notes for the buyer."
              required
              value={description}
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Price">
              <input className={inputClassName} min="1" name="price" placeholder="42000" required type="number" />
            </FormField>
            <FormField label="Category">
              <input
                className={inputClassName}
                name="category"
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Camera"
                required
                value={category}
              />
            </FormField>
            <FormField label="Condition">
              <input
                className={inputClassName}
                name="condition"
                onChange={(event) => setCondition(event.target.value)}
                placeholder="Good"
                required
                value={condition}
              />
            </FormField>
          </div>
        </section>
        <div className="flex justify-end">
          <ActionButton type="submit" variant="primary">Create draft</ActionButton>
        </div>
      </form>
    </GlassPanel>
  );
}
