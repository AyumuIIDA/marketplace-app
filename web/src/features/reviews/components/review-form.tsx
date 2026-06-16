import { ActionButton } from "../../../components/ui/action-button";
import { FormField, inputClassName, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { createReviewAction } from "../actions/review.actions";

type ReviewFormProps = {
  orderId?: string;
};

export function ReviewForm({ orderId }: ReviewFormProps) {
  return (
    <GlassPanel className="p-5">
      <form action={createReviewAction} className="grid gap-4">
        <FormField label="Order ID">
          <input className={inputClassName} defaultValue={orderId} name="orderId" placeholder="order_id" required />
        </FormField>
        <FormField label="Rating">
          <input className={inputClassName} defaultValue="5" max="5" min="1" name="rating" required type="number" />
        </FormField>
        <FormField label="Comment">
          <textarea className={textareaClassName} name="comment" placeholder="Share a concise transaction review." required />
        </FormField>
        <div className="flex justify-end">
          <ActionButton type="submit" variant="primary">
            Create review draft
          </ActionButton>
        </div>
      </form>
    </GlassPanel>
  );
}
