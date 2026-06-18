// Package listingshttp は出品のHTTP adapter（/listings 系）。
package listingshttp

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	"marketplace/api-go/internal/interface/http"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	"marketplace/api-go/internal/shared/apperr"
)

// maxImageBytes はアップロード受け入れ上限（15MB）。縮小前の受信上限。
const maxImageBytes = 15 * 1024 * 1024

// Deps は出品HTTPの依存（UseCase群）。publish/update(署名付き)・purchase は後続incrementで追加。
type Deps struct {
	Create          *listingsapp.CreateListingUseCase
	UploadImage     *listingsapp.UploadListingImageUseCase
	Get             *listingsapp.GetListingUseCase
	Search          *listingsapp.SearchListingsUseCase
	UpdateDraft     *listingsapp.UpdateDraftListingUseCase
	Hide            *listingsapp.HideListingUseCase
	Purchase        *workflows.PurchaseItemWorkflow
	Publish         *workflows.PublishListingWithHumanSignatureWorkflow
	PublishUnsigned *listingsapp.PublishListingUseCase
	Update          *workflows.UpdateListingWithHumanSignatureWorkflow
}

// RegisterRoutes は認証必須の /listings 系を登録する。公開GET（一覧/詳細）は RegisterPublicRoutes が担う。
// 公開GETと同一prefixのため r.Route(Mount)は使わずinline登録し、chiのMount衝突を避ける。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Post("/listings", deps.handleCreate)
	r.Post("/listings/images", deps.handleUploadImage)
	r.Patch("/listings/{listingId}/draft", deps.handleUpdateDraft)
	r.Patch("/listings/{listingId}", deps.handleUpdate)
	r.Post("/listings/{listingId}/hide", deps.handleHide)
	r.Post("/listings/{listingId}/publish", deps.handlePublish)
	r.Post("/listings/{listingId}/purchase", deps.handlePurchase)
}

// RegisterPublicRoutes は認証任意の公開閲覧GET（商品一覧・商品詳細）を登録する。
// 呼び出し側は OptionalAuth グループ内で呼ぶこと（匿名は PUBLISHED のみ閲覧可）。
func RegisterPublicRoutes(r chi.Router, deps Deps) {
	r.Get("/listings", deps.handleSearch)
	r.Get("/listings/{listingId}", deps.handleGet)
}

type publishRequest struct {
	// idKitResult は任意。あれば人間署名付きで公開（高評価の印）、なければlogin のみで公開。
	IdKitResult         *signaturesapp.IdKitResult `json:"idKitResult"`
	ExpectedEnvironment *string                    `json:"expectedEnvironment"`
}

func (deps Deps) handlePublish(w http.ResponseWriter, r *http.Request) {
	sellerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body publishRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	// idKitResult が無ければ login のみで公開（署名なし経路）。
	if body.IdKitResult == nil {
		out, err := deps.PublishUnsigned.Execute(r.Context(), listingsapp.PublishListingInput{
			ListingID: listingID,
			SellerID:  sellerID,
		})
		if err != nil {
			httpinterface.WriteError(w, r, err)
			return
		}
		httpinterface.WriteJSON(w, http.StatusOK, out)
		return
	}

	out, err := deps.Publish.Execute(r.Context(), workflows.PublishListingInput{
		ListingID:           listingID,
		SellerID:            sellerID,
		IdKit:               *body.IdKitResult,
		ExpectedEnvironment: body.ExpectedEnvironment,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type updateListingRequest struct {
	Fields              draftFields               `json:"fields" validate:"required"`
	IdKitResult         signaturesapp.IdKitResult `json:"idKitResult"`
	ExpectedEnvironment *string                   `json:"expectedEnvironment"`
}

func (deps Deps) handleUpdate(w http.ResponseWriter, r *http.Request) {
	sellerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body updateListingRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Update.Execute(r.Context(), workflows.UpdateListingInput{
		ListingID: listingID,
		SellerID:  sellerID,
		Fields: fieldsFromRequest(body.Fields.Title, body.Fields.Description, body.Fields.Price,
			body.Fields.Currency, body.Fields.Category, body.Fields.Condition),
		IdKit:               body.IdKitResult,
		ExpectedEnvironment: body.ExpectedEnvironment,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type purchaseRequest struct {
	Confirmed bool `json:"confirmed"`
}

func (deps Deps) handlePurchase(w http.ResponseWriter, r *http.Request) {
	buyerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	// confirmed は任意（既定false）。bodyが空でも許容する。
	var body purchaseRequest
	if r.ContentLength != 0 {
		_ = httpinterface.DecodeJSONLenient(r, &body)
	}
	out, err := deps.Purchase.Execute(r.Context(), workflows.PurchaseItemInput{
		ListingID: listingID,
		BuyerID:   buyerID,
		Confirmed: body.Confirmed,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	status := http.StatusOK
	if out.Status == "PAID" {
		status = http.StatusCreated
	}
	httpinterface.WriteJSON(w, status, out)
}

type imageRefReq struct {
	URL       string `json:"url" validate:"required,url"`
	Hash      string `json:"hash" validate:"required"`
	SortOrder int32  `json:"sortOrder" validate:"min=0"`
}

type createListingRequest struct {
	AgentID     *string       `json:"agentId"`
	Title       string        `json:"title" validate:"required"`
	Description string        `json:"description" validate:"required"`
	Price       int32         `json:"price" validate:"required,gt=0"`
	Currency    *string       `json:"currency" validate:"omitempty,eq=JPY"`
	Category    string        `json:"category" validate:"required"`
	Condition   string        `json:"condition" validate:"required"`
	Images      []imageRefReq `json:"images" validate:"omitempty,max=10,dive"`
}

func (deps Deps) handleCreate(w http.ResponseWriter, r *http.Request) {
	sellerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createListingRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	agentID, err := parseOptionalUUID(body.AgentID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	images := make([]listingsdomain.ImageToSave, 0, len(body.Images))
	for _, im := range body.Images {
		images = append(images, listingsdomain.ImageToSave{URL: im.URL, Hash: im.Hash, SortOrder: im.SortOrder})
	}

	out, err := deps.Create.Execute(r.Context(), listingsapp.CreateListingInput{
		SellerID: sellerID,
		AgentID:  agentID,
		Fields:   fieldsFromRequest(body.Title, body.Description, body.Price, body.Currency, body.Category, body.Condition),
		Images:   images,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleUploadImage(w http.ResponseWriter, r *http.Request) {
	if _, err := httpinterface.CurrentUserID(r); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxImageBytes+1024)
	if err := r.ParseMultipartForm(maxImageBytes + 1024); err != nil {
		httpinterface.WriteError(w, r, apperr.Validation("Image file is required."))
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		httpinterface.WriteError(w, r, apperr.Validation("Image file is required.",
			apperr.FieldError{Field: "file", Reason: "required"}))
		return
	}
	defer file.Close()

	if header.Size > maxImageBytes {
		httpinterface.WriteError(w, r, apperr.Validation("Image file is too large.",
			apperr.FieldError{Field: "file", Reason: "too_large"}))
		return
	}

	// 読み取りはMaxBytesReaderで上限済み。読み取りエラーは握り潰さず明示的に返す
	// （切り詰めデータをそのまま下流へ渡さない）。
	data, err := io.ReadAll(file)
	if err != nil {
		httpinterface.WriteError(w, r, apperr.Validation("Image file could not be read.",
			apperr.FieldError{Field: "file", Reason: "read_error"}))
		return
	}

	out, err := deps.UploadImage.Execute(r.Context(), data)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleSearch(w http.ResponseWriter, r *http.Request) {
	// 認証任意。匿名はPUBLISHEDのみ閲覧、mineは無効。
	currentUserID, err := httpinterface.OptionalCurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	q := r.URL.Query()

	keyword := httpinterface.OptionalStr(q.Get("keyword"))
	category := httpinterface.OptionalStr(q.Get("category"))
	condition := httpinterface.OptionalStr(q.Get("condition"))

	minPrice, err := optionalPositiveInt(q.Get("minPrice"), "minPrice")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	maxPrice, err := optionalPositiveInt(q.Get("maxPrice"), "maxPrice")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, err := httpinterface.OptionalLimit(q.Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	offset, err := optionalNonNegativeInt(q.Get("offset"), "offset")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	mine, err := optionalMine(q.Get("mine"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	// 公開の出品者別フィルタ（プロフィールページ）。指定時は PUBLISHED のみ返す。
	var sellerFilter *uuid.UUID
	if s := strings.TrimSpace(q.Get("sellerId")); s != "" {
		id, perr := uuid.Parse(s)
		if perr != nil {
			httpinterface.WriteError(w, r, apperr.Validation("sellerId must be a valid UUID.",
				apperr.FieldError{Field: "sellerId", Reason: "invalid"}))
			return
		}
		sellerFilter = &id
	}
	// 匿名は mine 無効（自分の下書きは見せない）。
	mineForSeller := mine && currentUserID != nil

	in := listingsapp.SearchListingsInput{
		Keyword:                keyword,
		Category:               category,
		Condition:              condition,
		MinPrice:               minPrice,
		MaxPrice:               maxPrice,
		Limit:                  limit,
		Offset:                 offset,
		IncludeDraftsForSeller: mineForSeller,
	}
	switch {
	case mineForSeller:
		in.SellerID = currentUserID
	case sellerFilter != nil:
		in.SellerID = sellerFilter
	}

	out, err := deps.Search.Execute(r.Context(), in)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleGet(w http.ResponseWriter, r *http.Request) {
	// 認証任意。匿名はPUBLISHEDのみ閲覧可（下書き/HIDDENは出品者のみ）。
	requesterID, err := httpinterface.OptionalCurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Get.Execute(r.Context(), listingID, requesterID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type updateDraftRequest struct {
	Fields draftFields `json:"fields" validate:"required"`
}

type draftFields struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description" validate:"required"`
	Price       int32   `json:"price" validate:"required,gt=0"`
	Currency    *string `json:"currency" validate:"omitempty,eq=JPY"`
	Category    string  `json:"category" validate:"required"`
	Condition   string  `json:"condition" validate:"required"`
}

func (deps Deps) handleUpdateDraft(w http.ResponseWriter, r *http.Request) {
	sellerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body updateDraftRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.UpdateDraft.Execute(r.Context(), listingsapp.UpdateDraftListingInput{
		ListingID: listingID,
		SellerID:  sellerID,
		Fields: fieldsFromRequest(body.Fields.Title, body.Fields.Description, body.Fields.Price,
			body.Fields.Currency, body.Fields.Category, body.Fields.Condition),
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleHide(w http.ResponseWriter, r *http.Request) {
	sellerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Hide.Execute(r.Context(), listingsapp.HideListingInput{ListingID: listingID, SellerID: sellerID})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- helpers ---

func fieldsFromRequest(title, description string, price int32, currency *string, category, condition string) listingsdomain.ListingFields {
	cur := listingsdomain.CurrencyJPY
	if currency != nil && *currency != "" {
		cur = *currency
	}
	return listingsdomain.ListingFields{
		Title:       strings.TrimSpace(title),
		Description: strings.TrimSpace(description),
		Price:       price,
		Currency:    cur,
		Category:    strings.TrimSpace(category),
		Condition:   strings.TrimSpace(condition),
	}
}

func parseOptionalUUID(s *string) (*uuid.UUID, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	id, err := uuid.Parse(strings.TrimSpace(*s))
	if err != nil {
		return nil, apperr.Validation("agentId must be a valid id.",
			apperr.FieldError{Field: "agentId", Reason: "invalid"})
	}
	return &id, nil
}

func optionalPositiveInt(s, field string) (*int32, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	v, err := strconv.Atoi(s)
	if err != nil || v <= 0 {
		return nil, apperr.Validation(field+" must be a positive integer.",
			apperr.FieldError{Field: field, Reason: "positive_int"})
	}
	n := int32(v)
	return &n, nil
}

// optionalNonNegativeInt は0以上の整数クエリ（例: offset）を解釈する。未指定→nil。
func optionalNonNegativeInt(s, field string) (*int32, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return nil, apperr.Validation(field+" must be a non-negative integer.",
			apperr.FieldError{Field: field, Reason: "non_negative_int"})
	}
	n := int32(v)
	return &n, nil
}

// optionalMine は mine クエリを厳格に解釈する（TS: z.enum(["true","false"])）。
// 未指定→false。"true"/"false" 以外→400 VALIDATION_FAILED。
func optionalMine(s string) (bool, error) {
	switch s {
	case "":
		return false, nil
	case "true":
		return true, nil
	case "false":
		return false, nil
	default:
		return false, apperr.Validation("mine must be 'true' or 'false'.",
			apperr.FieldError{Field: "mine", Reason: "enum"})
	}
}
