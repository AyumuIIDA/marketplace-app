package app

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketplace/api-go/internal/app/txrunner"
	"marketplace/api-go/internal/app/workflows"
	"marketplace/api-go/internal/db"
	"marketplace/api-go/internal/interface/http"
	mcpinterface "marketplace/api-go/internal/interface/mcp"
	"marketplace/api-go/internal/interface/mcp/mcpgateway"
	agentsapp "marketplace/api-go/internal/modules/agents/application"
	agentshttp "marketplace/api-go/internal/modules/agents/http"
	agentsinfra "marketplace/api-go/internal/modules/agents/infrastructure"
	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
	aihttp "marketplace/api-go/internal/modules/aiassistance/http"
	aiinfra "marketplace/api-go/internal/modules/aiassistance/infrastructure"
	identityapp "marketplace/api-go/internal/modules/identity/application"
	identityhttp "marketplace/api-go/internal/modules/identity/http"
	identityinfra "marketplace/api-go/internal/modules/identity/infrastructure"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	listingshttp "marketplace/api-go/internal/modules/listings/http"
	listingsinfra "marketplace/api-go/internal/modules/listings/infrastructure"
	mcpauditapp "marketplace/api-go/internal/modules/mcpaudit/application"
	mcpauditinfra "marketplace/api-go/internal/modules/mcpaudit/infrastructure"
	messagesapp "marketplace/api-go/internal/modules/messages/application"
	messageshttp "marketplace/api-go/internal/modules/messages/http"
	messagesinfra "marketplace/api-go/internal/modules/messages/infrastructure"
	ordersapp "marketplace/api-go/internal/modules/orders/application"
	ordershttp "marketplace/api-go/internal/modules/orders/http"
	ordersinfra "marketplace/api-go/internal/modules/orders/infrastructure"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
	recommendationhttp "marketplace/api-go/internal/modules/recommendation/http"
	recommendationinfra "marketplace/api-go/internal/modules/recommendation/infrastructure"
	reviewsapp "marketplace/api-go/internal/modules/reviews/application"
	reviewshttp "marketplace/api-go/internal/modules/reviews/http"
	reviewsinfra "marketplace/api-go/internal/modules/reviews/infrastructure"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	signaturesinfra "marketplace/api-go/internal/modules/signatures/infrastructure"
	socialapp "marketplace/api-go/internal/modules/social/application"
	socialhttp "marketplace/api-go/internal/modules/social/http"
	socialinfra "marketplace/api-go/internal/modules/social/infrastructure"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
	gcsstorage "marketplace/api-go/internal/shared/storage/gcs"
)

// Server はComposition Root。config→依存生成→router配線→HTTP起動/終了を担う。
type Server struct {
	cfg  Config
	pool *pgxpool.Pool
	http *http.Server
}

// NewServer はconfigから依存を全て組み立てる。ここが唯一の配線箇所（§4.1）。
func NewServer(ctx context.Context, cfg Config) (*Server, error) {
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	// 認証検証器（BFF EdDSA公開鍵）。未設定ならdev header運用に委ねる。
	var verifier httpinterface.TokenVerifier
	if cfg.BFFJWTPublicKeyJSON != "" {
		v, err := httpinterface.NewBFFTokenVerifier(cfg.BFFJWTPublicKeyJSON)
		if err != nil {
			pool.Close()
			return nil, err
		}
		verifier = v
	} else {
		slog.Warn("BFF_INTERNAL_JWT_PUBLIC_KEY not set; bearer auth disabled",
			slog.Bool("allowDevUserHeader", cfg.AllowDevUserHeader))
	}

	sysClock := clock.NewSystemClock()
	idGen := ids.NewUUIDGenerator()

	// signatures の基盤（JWS署名・World ID検証）。未設定なら署名系のみ縮退する。
	var signer signaturesapp.HumanSignatureSigner
	if s, err := signaturesinfra.NewJwsHumanSignatureSigner(cfg.HumanSignatureIssuer, cfg.HumanSignatureJWSSecret); err == nil {
		signer = s
	} else {
		slog.Warn("HUMAN_SIGNATURE_JWS_SECRET not set; signature routes degraded", slog.String("error", err.Error()))
		signer = signaturesinfra.NewUnavailableSigner("jws secret not configured")
	}
	var worldIDVerifier signaturesapp.WorldIdVerifier
	if v, err := signaturesinfra.NewWorldIDVerifierClient(cfg.WorldIDRPID); err == nil {
		worldIDVerifier = v
	} else {
		slog.Warn("WORLD_ID_RP_ID not set; World ID routes degraded", slog.String("error", err.Error()))
		worldIDVerifier = signaturesinfra.NewUnavailableVerifier("world id rpId not configured")
	}
	humanSignatureService := signaturesapp.NewHumanSignatureService(
		worldIDVerifier,
		signaturesapp.NewHumanSignatureCreator(signer, idGen, sysClock),
	)

	// identity module の配線（repository は pool=DBTX を受け取る）。
	userRepo := identityinfra.NewPostgresUserRepository(pool)
	authIdentityRepo := identityinfra.NewPostgresAuthIdentityRepository(pool)
	identityDeps := identityhttp.Deps{
		GetCurrentUser:    identityapp.NewGetCurrentUserUseCase(userRepo),
		UpsertCurrentUser: identityapp.NewUpsertCurrentUserUseCase(userRepo, sysClock),
		LinkWorldID:       identityapp.NewLinkWorldIDUseCase(userRepo, authIdentityRepo, worldIDVerifier, idGen, sysClock),
	}

	// orders module の配線（pool-bound repo）。
	orderRepo := ordersinfra.NewPostgresOrderRepository(pool)
	orderFulfillment := ordersapp.NewOrderFulfillmentService(idGen, sysClock)
	orderDeps := ordershttp.Deps{
		Get:          ordersapp.NewGetOrderUseCase(orderRepo, orderFulfillment),
		List:         ordersapp.NewListOrdersUseCase(orderRepo),
		MarkShipped:  ordersapp.NewMarkOrderShippedUseCase(orderRepo, orderFulfillment, sysClock),
		MarkReceived: ordersapp.NewMarkOrderReceivedUseCase(orderRepo, orderFulfillment, sysClock),
	}

	// 跨moduleの購入workflow。tx-runnerが1 transaction内でtx-bound repoを束ねる。
	purchaseWorkflow := workflows.NewPurchaseItemWorkflow(
		txrunner.NewPurchaseTxRunner(pool),
		listingsapp.NewListingPurchaseService(),
		orderFulfillment,
		sysClock,
	)

	// messages module の配線。send/list は跨module(orders+messages) tx、hide は単一module。
	messageRepo := messagesinfra.NewPostgresMessageRepository(pool)
	messageTxRunner := txrunner.NewMessageTxRunner(pool)
	messageDeps := messageshttp.Deps{
		Send: workflows.NewSendOrderMessageWorkflow(messageTxRunner, orderFulfillment,
			messagesapp.NewSendMessageService(idGen, sysClock)),
		List: workflows.NewListOrderMessagesWorkflow(messageTxRunner, orderFulfillment,
			messagesapp.NewListMessagesService()),
		Hide: messagesapp.NewHideMessageUseCase(messageRepo, sysClock),
	}

	// ai-assistance の配線。既定は決定論fake、provider=gemini ならVertex AI（失敗時は決定論へ縮退）。
	aiAssistant := buildAiAssistant(ctx, cfg)
	aiDeps := aihttp.Deps{
		SuggestListingFields: aiapp.NewSuggestListingFieldsUseCase(aiAssistant),
	}

	// reviews module の配線。list=pool、create=orders+reviews tx、submit=orders+reviews+signatures tx。
	reviewRepo := reviewsinfra.NewPostgresReviewRepository(pool)
	reviewTxRunner := txrunner.NewReviewTxRunner(pool)
	reviewDeps := reviewshttp.Deps{
		List: reviewsapp.NewListReviewsUseCase(reviewRepo),
		Create: workflows.NewCreateReviewWorkflow(reviewTxRunner, orderFulfillment,
			reviewsapp.NewCreateReviewService(idGen, sysClock)),
		Submit: workflows.NewSubmitReviewWithHumanSignatureWorkflow(reviewTxRunner,
			reviewsapp.NewReviewSubmissionService(), humanSignatureService, orderFulfillment, sysClock),
	}

	// listings module の配線。画像ストアはストレージ設定があるときのみ実体化する。
	listingRepo := listingsinfra.NewPostgresListingRepository(pool)
	imageStore := buildImageStore(ctx, cfg)
	// publish/update は human signature workflow（listings+signatures tx）。
	humanSignatureTxRunner := txrunner.NewHumanSignatureTxRunner(pool)
	listingPublication := listingsapp.NewListingPublicationService()
	listingDeps := listingshttp.Deps{
		Create:          listingsapp.NewCreateListingUseCase(listingRepo, idGen, sysClock),
		UploadImage:     listingsapp.NewUploadListingImageUseCase(imageStore),
		Get:             listingsapp.NewGetListingUseCase(listingRepo),
		Search:          listingsapp.NewSearchListingsUseCase(listingRepo),
		UpdateDraft:     listingsapp.NewUpdateDraftListingUseCase(listingRepo, sysClock),
		Hide:            listingsapp.NewHideListingUseCase(listingRepo, sysClock),
		Purchase:        purchaseWorkflow,
		Publish:         workflows.NewPublishListingWithHumanSignatureWorkflow(humanSignatureTxRunner, listingPublication, humanSignatureService),
		PublishUnsigned: listingsapp.NewPublishListingUseCase(listingRepo, sysClock),
		Update:          workflows.NewUpdateListingWithHumanSignatureWorkflow(humanSignatureTxRunner, listingPublication, humanSignatureService),
	}

	// social module の配線（いいね/出品者サマリ）。いいね商品一覧は social(ID) と listings(本体) の合成。
	socialRepo := socialinfra.NewPostgresSocialRepository(pool)
	// 出品の like/comment 数を listings の読取に注入（Instagram風カード用）。peer分離のため adapter 経由。
	listingCounts := newListingCountsAdapter(socialRepo)
	listingDeps.Get.WithCounts(listingCounts)
	listingDeps.Search.WithCounts(listingCounts)
	sellerSummary := socialapp.NewGetSellerSummaryUseCase(socialRepo)
	listListingsByIDs := listingsapp.NewListListingsByIDsUseCase(listingRepo)
	socialDeps := socialhttp.Deps{
		ListingLike:   socialapp.NewListingLikeUseCase(socialRepo),
		SellerLike:    socialapp.NewSellerLikeUseCase(socialRepo),
		SellerSummary: sellerSummary,
		LikedListings: workflows.NewLikedListingsWorkflow(
			socialapp.NewListLikedListingIDsUseCase(socialRepo).Execute,
			listListingsByIDs.Execute,
		),
		LikedSellers:  socialapp.NewListLikedSellersUseCase(socialRepo, sellerSummary),
		CreateComment: socialapp.NewCreateListingCommentUseCase(socialRepo, idGen, sysClock),
		ListComments:  socialapp.NewListListingCommentsUseCase(socialRepo),
	}

	// recommendation module の配線。意味検索/類似は listings(本体) と vector(recommendation-py) の合成。
	// RECOMMENDATION_SERVICE_URL 未設定なら縮退（空結果→フロントはkeyword検索へフォールバック）。
	vectorIndex := buildVectorIndex(ctx, cfg)
	recommendationDeps := recommendationhttp.Deps{
		Search:  workflows.NewSemanticSearchWorkflow(vectorIndex, listingDeps.Get.Execute),
		Similar: workflows.NewSimilarListingsWorkflow(vectorIndex, listingDeps.Get.Execute),
	}

	// agents module の配線（pool-bound repo）。/agents/runs(discover agent)は下のMCP配線後に充填する。
	agentRepo := agentsinfra.NewPostgresAgentRepository(pool)
	agentDeps := agentshttp.Deps{
		Create:  agentsapp.NewCreateAgentUseCase(agentRepo, idGen, sysClock),
		List:    agentsapp.NewListAgentsUseCase(agentRepo),
		Disable: agentsapp.NewDisableAgentUseCase(agentRepo, sysClock),
	}

	// MCP の配線。全tool呼び出しを mcp_tool_calls へ監査記録する。/mcp は認証済みグループへ。
	mcpRecord := mcpauditapp.NewRecordMcpToolCallUseCase(
		mcpauditinfra.NewPostgresMcpToolCallRepository(pool), idGen, sysClock)
	mcpTools := mcpinterface.BuildTools(mcpinterface.ToolDeps{
		GetCurrentUser:       identityDeps.GetCurrentUser,
		SearchListings:       listingDeps.Search,
		GetListing:           listingDeps.Get,
		CreateListing:        listingDeps.Create,
		PublishListing:       listingDeps.Publish,
		UpdateListing:        listingDeps.Update,
		Purchase:             purchaseWorkflow,
		ListOrders:           orderDeps.List,
		MarkShipped:          orderDeps.MarkShipped,
		MarkReceived:         orderDeps.MarkReceived,
		SendMessage:          messageDeps.Send,
		ListMessages:         messageDeps.List,
		CreateReview:         reviewDeps.Create,
		SubmitReview:         reviewDeps.Submit,
		SuggestListingFields: aiDeps.SuggestListingFields,
		Assistant:            aiAssistant,
		CompareListings:      workflows.NewCompareListingsWorkflow(listingDeps.Get, aiAssistant),
	})
	toolRunner := mcpinterface.NewToolRunner(mcpRecord)
	mcpHandler := mcpinterface.NewHTTPHandler(mcpTools, toolRunner,
		func(r *http.Request) (string, bool) {
			cu, err := httpinterface.CurrentUserFrom(r.Context())
			if err != nil {
				return "", false
			}
			return cu.UserID, true
		})

	// discover agent の配線。MCP gateway(監査付き) + provider別 planner/responder を合成する。
	gatewayFactory := func(userID string, agentID *string) mcpgateway.McpToolGateway {
		return mcpinterface.NewInProcessMcpToolGateway(mcpTools, toolRunner, mcpinterface.ToolContext{UserID: userID, AgentID: agentID})
	}
	agentDeps.RunDiscover = workflows.NewRunDiscoverAgentWorkflow(
		gatewayFactory,
		buildDiscoverPlanner(ctx, cfg),
		buildDiscoverResponder(ctx, cfg),
	)

	// pgxpool.Pool は Ping(ctx) error を持ち HealthChecker を満たす。
	router := httpinterface.NewRouter(httpinterface.RouterDeps{
		Health:             pool,
		TokenVerifier:      verifier,
		AllowDevUserHeader: cfg.AllowDevUserHeader,
		RegisterPublic: func(r chi.Router) {
			reviewshttp.RegisterPublicRoutes(r, reviewDeps)
			// 商品一覧・詳細は認証任意（未ログインでも閲覧可、トークンがあれば自分の下書きも見える）。
			r.Group(func(pr chi.Router) {
				pr.Use(httpinterface.OptionalAuthMiddleware(verifier, cfg.AllowDevUserHeader))
				listingshttp.RegisterPublicRoutes(pr, listingDeps)
			})
		},
		RegisterAuthed: func(r chi.Router) {
			identityhttp.RegisterRoutes(r, identityDeps)
			listingshttp.RegisterRoutes(r, listingDeps)
			ordershttp.RegisterRoutes(r, orderDeps)
			messageshttp.RegisterRoutes(r, messageDeps)
			reviewshttp.RegisterRoutes(r, reviewDeps)
			socialhttp.RegisterRoutes(r, socialDeps)
			aihttp.RegisterRoutes(r, aiDeps)
			recommendationhttp.RegisterRoutes(r, recommendationDeps)
			agentshttp.RegisterRoutes(r, agentDeps)
			r.Handle("/mcp", mcpHandler)
		},
	})

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return &Server{cfg: cfg, pool: pool, http: httpServer}, nil
}

// buildImageStore はストレージ設定があればGCS実体を、なければエラー専用storeを返す。
// 画像不要の機能は storage 未設定でも起動・動作できるようにする。
func buildImageStore(ctx context.Context, cfg Config) listingsapp.ListingImageStore {
	if cfg.StorageEmulatorHost == "" && cfg.GoogleCloudProject == "" {
		return listingsinfra.NewUnavailableImageStore("storage not configured")
	}
	publicBase := cfg.PublicImageBaseURL
	if publicBase == "" {
		if cfg.StorageEmulatorHost != "" {
			publicBase = cfg.StorageEmulatorHost + "/" + cfg.StorageBucket
		} else {
			publicBase = "https://storage.googleapis.com/" + cfg.StorageBucket
		}
	}
	objStore, err := gcsstorage.New(ctx, cfg.StorageBucket, publicBase)
	if err != nil {
		slog.Warn("object storage init failed; image upload disabled", slog.String("error", err.Error()))
		return listingsinfra.NewUnavailableImageStore("init failed")
	}
	return listingsinfra.NewImagingListingImageStore(objStore)
}

// buildAiAssistant はprovider設定に応じてAI assistantを構築する。
// 既定は決定論fake（デモ安定）。gemini指定時はVertex AI、初期化失敗時は決定論へ縮退する。
func buildAiAssistant(ctx context.Context, cfg Config) aiapp.AiAssistant {
	switch cfg.AIAssistantProvider {
	case "gemini":
		g, err := aiinfra.NewGeminiAiAssistant(ctx, cfg.GoogleCloudProject, cfg.GoogleCloudLocation, cfg.GeminiModel, cfg.ImageFetchBaseURL)
		if err != nil {
			slog.Warn("gemini init failed; falling back to deterministic AI", slog.String("error", err.Error()))
			return aiinfra.NewDeterministicAiAssistant()
		}
		return g
	default:
		return aiinfra.NewDeterministicAiAssistant()
	}
}

// buildDiscoverPlanner / buildDiscoverResponder は provider設定に応じて discover agent の
// planner/responder を構築する。既定は決定論（規則ベース）。gemini/openai は初期化失敗時に決定論へ縮退する。
func buildDiscoverPlanner(ctx context.Context, cfg Config) agentsapp.DiscoverAgentPlanner {
	switch cfg.AIAssistantProvider {
	case "gemini":
		p, err := agentsinfra.NewGeminiDiscoverAgentPlanner(ctx, cfg.GoogleCloudProject, cfg.GoogleCloudLocation, cfg.GeminiModel)
		if err != nil {
			slog.Warn("gemini discover planner init failed; falling back to deterministic", slog.String("error", err.Error()))
			return agentsinfra.NewDeterministicDiscoverAgentPlanner()
		}
		return p
	case "openai":
		p, err := agentsinfra.NewOpenAiDiscoverAgentPlanner(cfg.OpenAIAPIKey, cfg.OpenAIModel)
		if err != nil {
			slog.Warn("openai discover planner init failed; falling back to deterministic", slog.String("error", err.Error()))
			return agentsinfra.NewDeterministicDiscoverAgentPlanner()
		}
		return p
	default:
		return agentsinfra.NewDeterministicDiscoverAgentPlanner()
	}
}

func buildDiscoverResponder(ctx context.Context, cfg Config) agentsapp.DiscoverAgentResponder {
	switch cfg.AIAssistantProvider {
	case "gemini":
		r, err := agentsinfra.NewGeminiDiscoverAgentResponder(ctx, cfg.GoogleCloudProject, cfg.GoogleCloudLocation, cfg.GeminiModel)
		if err != nil {
			slog.Warn("gemini discover responder init failed; falling back to deterministic", slog.String("error", err.Error()))
			return agentsinfra.NewDeterministicDiscoverAgentResponder()
		}
		return r
	case "openai":
		r, err := agentsinfra.NewOpenAiDiscoverAgentResponder(cfg.OpenAIAPIKey, cfg.OpenAIModel)
		if err != nil {
			slog.Warn("openai discover responder init failed; falling back to deterministic", slog.String("error", err.Error()))
			return agentsinfra.NewDeterministicDiscoverAgentResponder()
		}
		return r
	default:
		return agentsinfra.NewDeterministicDiscoverAgentResponder()
	}
}

// buildVectorIndex は recommendation サービス設定があれば gRPC client を、なければ縮退実装を返す。
// 意味検索は付加機能のため、未設定/接続失敗でもコア機能の起動を妨げない。
func buildVectorIndex(ctx context.Context, cfg Config) recommendationapp.VectorIndex {
	if cfg.RecommendationServiceURL == "" {
		slog.Warn("RECOMMENDATION_SERVICE_URL not set; semantic search degraded")
		return recommendationinfra.NewUnavailableVectorIndex()
	}
	idx, err := recommendationinfra.NewGrpcVectorIndex(ctx, cfg.RecommendationServiceURL)
	if err != nil {
		slog.Warn("recommendation client init failed; semantic search degraded", slog.String("error", err.Error()))
		return recommendationinfra.NewUnavailableVectorIndex()
	}
	return idx
}

// Run はHTTPサーバを起動し、ctxのキャンセルでgraceful shutdownする。
func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		slog.Info("http server listening", slog.String("addr", s.http.Addr))
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		slog.Info("shutdown signal received")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		err := s.http.Shutdown(shutdownCtx)
		s.pool.Close()
		return err
	case err := <-errCh:
		s.pool.Close()
		return err
	}
}
