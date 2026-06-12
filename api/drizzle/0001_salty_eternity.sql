ALTER TABLE "listings" ADD CONSTRAINT "listings_price_positive_chk" CHECK ("listings"."price" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_price_positive_chk" CHECK ("orders"."price" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_seller_distinct_chk" CHECK ("orders"."buyer_id" <> "orders"."seller_id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range_chk" CHECK ("reviews"."rating" >= 1 AND "reviews"."rating" <= 5);--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_recipient_distinct_chk" CHECK ("messages"."sender_id" <> "messages"."recipient_id");