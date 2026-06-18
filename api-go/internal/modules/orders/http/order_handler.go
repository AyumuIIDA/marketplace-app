// Package ordershttp は注文のHTTP adapter（/orders 系）。
package ordershttp

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/outarc/marketplace/api-go/internal/interface/http"
	ordersapp "github.com/outarc/marketplace/api-go/internal/modules/orders/application"
	ordersdomain "github.com/outarc/marketplace/api-go/internal/modules/orders/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// Deps は注文HTTPの依存（UseCase群）。
type Deps struct {
	Get          *ordersapp.GetOrderUseCase
	List         *ordersapp.ListOrdersUseCase
	MarkShipped  *ordersapp.MarkOrderShippedUseCase
	MarkReceived *ordersapp.MarkOrderReceivedUseCase
}

// RegisterRoutes は /orders 系を認証済みグループへ登録する。
// /orders/{orderId}/messages を messages module も登録するため、Mount(Route)ではなく
// 直接登録にして同一prefixを共有する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Get("/orders", deps.handleList)
	r.Get("/orders/{orderId}", deps.handleGet)
	r.Post("/orders/{orderId}/ship", deps.handleShip)
	r.Post("/orders/{orderId}/receive", deps.handleReceive)
}

func (deps Deps) handleList(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	status, err := optionalOrderStatus(r.URL.Query().Get("status"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, err := httpinterface.OptionalLimit(r.URL.Query().Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.List.Execute(r.Context(), ordersapp.ListOrdersInput{
		ParticipantID: userID,
		Status:        status,
		Limit:         limit,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleGet(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := httpinterface.PathUUID(r, "orderId", "Order")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Get.Execute(r.Context(), orderID, userID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleShip(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := httpinterface.PathUUID(r, "orderId", "Order")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.MarkShipped.Execute(r.Context(), orderID, userID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleReceive(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := httpinterface.PathUUID(r, "orderId", "Order")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.MarkReceived.Execute(r.Context(), orderID, userID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- helpers ---

func optionalOrderStatus(s string) (*ordersdomain.OrderStatus, error) {
	if s == "" {
		return nil, nil
	}
	switch ordersdomain.OrderStatus(s) {
	case ordersdomain.OrderStatusPaid, ordersdomain.OrderStatusShipped, ordersdomain.OrderStatusReceived,
		ordersdomain.OrderStatusCompleted, ordersdomain.OrderStatusCanceled:
		st := ordersdomain.OrderStatus(s)
		return &st, nil
	default:
		return nil, apperr.Validation("status is invalid.",
			apperr.FieldError{Field: "status", Reason: "enum"})
	}
}
