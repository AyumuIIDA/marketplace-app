export type IdKitProofResponse = Record<string, unknown> & {
  identifier?: string;
  signal_hash?: string;
  proof?: string;
  merkle_root?: string;
  nullifier?: string;
};

export type IdKitResult = Record<string, unknown> & {
  protocol_version?: string;
  nonce?: string;
  action?: string;
  environment?: string;
  responses?: IdKitProofResponse[];
};

