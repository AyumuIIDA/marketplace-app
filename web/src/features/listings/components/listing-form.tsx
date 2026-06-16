"use client";

import { useState, useTransition } from "react";

import { ActionButton } from "../../../components/ui/action-button";
import { FormField, inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { createListingAction, suggestListingFieldsAction } from "../actions/listing.actions";

export function ListingForm() {
  const [userHint, setUserHint] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [confidenceNotes, setConfidenceNotes] = useState<string[]>([]);
  const [assistMessage, setAssistMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function generateListingFields() {
    startTransition(async () => {
      setAssistMessage(undefined);

      try {
        const suggestion = await suggestListingFieldsAction(userHint);
        setTitle(suggestion.title);
        setDescription(suggestion.description);
        setCategory(suggestion.category);
        setCondition(suggestion.condition);
        setConfidenceNotes(suggestion.confidenceNotes);
      } catch {
        setAssistMessage("Gemini suggestion failed.");
      }
    });
  }

  return (
    <GlassPanel className="p-4 md:p-5">
      <form action={createListingAction} className="grid gap-5">
        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Product</h2>
              <p className="mt-1 text-sm text-neutral-500">Fill the fields directly, or let AI draft them from a short note.</p>
            </div>
          </div>

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
              <ActionButton disabled={isPending || userHint.trim().length === 0} onClick={generateListingFields}>
                {isPending ? "Generating..." : "Fill fields"}
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
