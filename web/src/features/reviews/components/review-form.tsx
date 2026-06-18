import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { FormField, inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { createReviewAction } from "../actions/review.actions";

type ReviewFormProps = {
  orderId?: string;
};

export async function ReviewForm({ orderId }: ReviewFormProps) {
  const t = await getTranslations("reviewForm");

  return (
    <GlassPanel className="p-5">
      <form action={createReviewAction} className="grid gap-4">
        <FormField label={t("orderId")}>
          <input className={inputClassName} defaultValue={orderId} name="orderId" placeholder="order_id" required />
        </FormField>
        <FormField label={t("rating")}>
          <input className={inputClassName} defaultValue="5" max="5" min="1" name="rating" required type="number" />
        </FormField>
        <FormField label={t("comment")}>
          <textarea className={textareaClassName} name="comment" placeholder={t("commentPlaceholder")} required />
        </FormField>
        <div className="flex justify-end">
          <ActionButton type="submit" variant="primary">
            {t("submit")}
          </ActionButton>
        </div>
      </form>
    </GlassPanel>
  );
}
