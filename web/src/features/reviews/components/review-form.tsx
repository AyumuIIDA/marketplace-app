import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { FormField, inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { createReviewAction } from "../actions/review.actions";
import { StarInput } from "./star-input";

type ReviewFormProps = {
  orderId?: string;
};

export async function ReviewForm({ orderId }: ReviewFormProps) {
  const t = await getTranslations("reviewForm");

  return (
    <GlassPanel className="p-5">
      <form action={createReviewAction} className="grid gap-5">
        {/* 取引から遷移した通常経路では orderId は内部値として隠す。直接アクセス時のみ入力欄を出す。 */}
        {orderId === undefined ? (
          <FormField label={t("orderId")}>
            <input className={inputClassName} name="orderId" placeholder="order_…" required />
          </FormField>
        ) : (
          <input name="orderId" type="hidden" value={orderId} />
        )}

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
            {t("rating")}
          </span>
          <StarInput name="rating" />
        </div>

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
