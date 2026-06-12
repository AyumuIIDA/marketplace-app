// 単一モジュールでHuman Signatureを発行するUseCase。
// 横断WorkflowはこのUseCaseではなく、HumanSignatureServiceの2操作を直接合成する。
// 検証(transaction外)→ 永続化(transaction内)という順序は両者で共通。
export class CreateHumanSignatureUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        // Phase 1: World ID検証はtransactionの外。外部HTTPがDB接続を占有しない。
        const presence = await this.deps.humanSignatureService.verifyHumanPresence({
            idKitResult: input.idKitResult,
            expectedAction: input.actionType,
            expectedEnvironment: input.expectedEnvironment,
        });
        // Phase 2: 署名作成と永続化のみtransaction境界内。
        return this.deps.humanSignatureTransaction.run((context) => this.deps.humanSignatureService.recordSignature({
            userId: input.userId,
            actionType: input.actionType,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            payloadHash: input.payloadHash,
            expectedSignalHash: input.expectedSignalHash,
            presence,
        }, context));
    }
}
