{
  "review": {
    "security_score": "F",
    "quality_score": "D",
    "ready_for_mainnet": false,
    "findings": [
      {
        "severity": "critical",
        "category": "admin-auth",
        "description": "Marketplace init_config uses init_if_needed and unconditionally overwrites config.admin, so any signer can take over admin by calling it again.",
        "fix": "Change marketplace InitConfig to init instead of init_if_needed, or require config.admin == admin.key() when the PDA already exists before mutating admin."
      },
      {
        "severity": "critical",
        "category": "fund-release",
        "description": "trade_escrow::release_funds does not authorize the caller and does not bind seller_token_account to trade.seller. Any signer can route a verified trade payout to their own ATA. The admin UI currently does exactly that in demo mode.",
        "fix": "Require caller to be the buyer or protocol admin, constrain seller_token_account.owner == trade.seller, and constrain platform_fee_account to the protocol treasury PDA/ATA. Remove the admin UI demo recipient override and success-shaped fallback."
      },
      {
        "severity": "high",
        "category": "dispute-resolution",
        "description": "trade_escrow::admin_resolve checks admin == trade.buyer instead of the configured protocol admin, so the real admin panel cannot resolve disputes unless the admin wallet is also the buyer.",
        "fix": "Pass TradeEscrowConfig into admin_resolve and require config.admin == admin.key()."
      },
      {
        "severity": "medium",
        "category": "state-consistency",
        "description": "The admin panel says admin may resolve prediction markets, but the on-chain prediction-market program only allows the market creator to resolve.",
        "fix": "Either update the UI copy to reflect creator-only resolution or add a genuine admin-authorized resolution path on-chain."
      },
      {
        "severity": "medium",
        "category": "fee-accounting",
        "description": "release_funds sends fees directly to an arbitrary platform_fee_account, but withdraw_platform_fees expects fees to accumulate in a fee-vault PDA. The fee withdrawal path is disconnected from collection.",
        "fix": "Route fees into a dedicated fee-vault PDA and withdraw from that PDA, or remove the unused withdraw path and standardize on a single treasury flow."
      }
    ]
  }
}
