use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Carrier {
    DHL,
    FedEx,
    Maersk,
    UPS,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TradeStatus {
    Locked,
    Verified,
    Released,
    Disputed,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Core state for a single trade escrow.
/// PDA seeds: ["trade", buyer.key(), trade_id]
#[account]
pub struct TradeAccount {
    pub trade_id: [u8; 16],
    pub buyer: Pubkey,
    pub seller: Pubkey,
    /// USDC amount with 6 decimals (e.g. 1_000_000 = 1 USDC).
    pub amount_usdc: u64,
    /// SHA-256 hash of the expected carrier milestone status.
    pub milestone_hash: [u8; 32],
    /// Carrier tracking identifier (max 64 chars).
    pub tracking_id: String,
    pub carrier: Carrier,
    pub milestone_verified: bool,
    pub status: TradeStatus,
    pub created_at: i64,
    pub bump: u8,
}

/// Space: 8 (discriminator) + 16 + 32 + 32 + 8 + 32 + (4+64) + 1 + 1 + 1 + 8 + 1 = 208
const TRADE_ACCOUNT_SPACE: usize = 208;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod trade_escrow {
    use super::*;

    /// Create a new trade escrow and deposit USDC from the buyer.
    pub fn create_trade(
        ctx: Context<CreateTrade>,
        trade_id: [u8; 16],
        amount_usdc: u64,
        milestone_hash: [u8; 32],
        tracking_id: String,
        carrier: Carrier,
    ) -> Result<()> {
        require!(tracking_id.len() <= 64, TradeError::TrackingIdTooLong);

        // Populate trade account state.
        let trade = &mut ctx.accounts.trade_account;
        trade.trade_id = trade_id;
        trade.buyer = ctx.accounts.buyer.key();
        trade.seller = ctx.accounts.seller.key();
        trade.amount_usdc = amount_usdc;
        trade.milestone_hash = milestone_hash;
        trade.tracking_id = tracking_id;
        trade.carrier = carrier;
        trade.milestone_verified = false;
        trade.status = TradeStatus::Locked;
        trade.created_at = Clock::get()?.unix_timestamp;
        trade.bump = ctx.bumps.trade_account;

        // Transfer USDC from buyer to escrow vault.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount_usdc,
        )?;

        emit!(TradeCreated {
            trade_id,
            buyer: ctx.accounts.buyer.key(),
            seller: ctx.accounts.seller.key(),
            amount_usdc,
        });

        Ok(())
    }

    /// Submit a zkTLS proof to verify the carrier milestone.
    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        _trade_id: [u8; 16],
        zktls_proof_bytes: Vec<u8>,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;

        require!(
            trade.status == TradeStatus::Locked,
            TradeError::InvalidTradeStatus
        );

        // Under the `mock-proof` feature we accept any non-empty blob.
        // In production this would CPI into the Reclaim zkTLS verifier.
        #[cfg(feature = "mock-proof")]
        {
            require!(!zktls_proof_bytes.is_empty(), TradeError::InvalidProof);
        }

        #[cfg(not(feature = "mock-proof"))]
        {
            // Hackathon scope: validate proof is non-empty.
            // TODO: replace with real CPI to Reclaim verifier program.
            require!(!zktls_proof_bytes.is_empty(), TradeError::InvalidProof);
        }

        trade.milestone_verified = true;
        trade.status = TradeStatus::Verified;

        emit!(TradeProofSubmitted {
            trade_id: trade.trade_id,
            verifier: ctx.accounts.submitter.key(),
        });

        Ok(())
    }

    /// Release escrowed USDC to the seller once the milestone is verified.
    /// Permissionlessly callable – anyone can crank this after verification.
    pub fn release_funds(ctx: Context<ReleaseFunds>, _trade_id: [u8; 16]) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;

        require!(
            trade.status == TradeStatus::Verified,
            TradeError::InvalidTradeStatus
        );
        require!(trade.milestone_verified, TradeError::DeliveryNotProven);

        let amount = trade.amount_usdc;

        // PDA signer seeds for the vault authority.
        let authority_seeds: &[&[u8]] = &[b"authority", &[ctx.bumps.vault_authority]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            amount,
        )?;

        trade.status = TradeStatus::Released;

        emit!(TradeSettled {
            trade_id: trade.trade_id,
            seller: trade.seller,
            amount_usdc: amount,
        });

        Ok(())
    }

    /// Open a dispute on a trade. Either the buyer or seller may call this
    /// while the trade is still Locked or Verified.
    pub fn open_dispute(ctx: Context<OpenDispute>, _trade_id: [u8; 16]) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;

        require!(
            trade.status == TradeStatus::Locked || trade.status == TradeStatus::Verified,
            TradeError::InvalidTradeStatus
        );

        let disputer = ctx.accounts.disputer.key();
        require!(
            disputer == trade.buyer || disputer == trade.seller,
            TradeError::UnauthorizedAccess
        );

        trade.status = TradeStatus::Disputed;

        emit!(TradeDisputed {
            trade_id: trade.trade_id,
            disputer,
        });

        Ok(())
    }

    /// Admin-resolve a disputed trade by sending funds to the winner.
    /// Hackathon simplification: signer must be the buyer (acts as admin).
    pub fn admin_resolve(
        ctx: Context<AdminResolve>,
        _trade_id: [u8; 16],
        winner: Pubkey,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;

        require!(
            trade.status == TradeStatus::Disputed,
            TradeError::InvalidTradeStatus
        );

        // Simplified admin check – buyer acts as the multisig admin.
        require!(
            ctx.accounts.admin.key() == trade.buyer,
            TradeError::UnauthorizedAccess
        );

        // Winner must be one of the trade participants.
        require!(
            winner == trade.buyer || winner == trade.seller,
            TradeError::InvalidWinner
        );

        let amount = trade.amount_usdc;

        let authority_seeds: &[&[u8]] = &[b"authority", &[ctx.bumps.vault_authority]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.winner_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            amount,
        )?;

        trade.status = TradeStatus::Released;

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(trade_id: [u8; 16], amount_usdc: u64, milestone_hash: [u8; 32], tracking_id: String)]
pub struct CreateTrade<'info> {
    /// Buyer who initiates the trade and deposits USDC.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// Seller's wallet (unchecked – just stored on the trade).
    /// CHECK: Only stored as the counterparty pubkey; no reads/writes.
    pub seller: UncheckedAccount<'info>,

    /// Trade PDA – initialised here.
    #[account(
        init,
        payer = buyer,
        space = TRADE_ACCOUNT_SPACE,
        seeds = [b"trade", buyer.key().as_ref(), trade_id.as_ref()],
        bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,

    /// Escrow vault – a PDA-owned token account that holds the USDC.
    #[account(
        init,
        payer = buyer,
        token::mint = usdc_mint,
        token::authority = vault_authority,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// Vault authority PDA – signs for vault token transfers.
    /// CHECK: PDA used only as a signing authority; no data.
    #[account(
        seeds = [b"authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// Buyer's USDC token account (source of deposit).
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == usdc_mint.key(),
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// USDC mint.
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 16])]
pub struct SubmitProof<'info> {
    /// Anyone can submit a proof on behalf of the trade.
    pub submitter: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 16])]
pub struct ReleaseFunds<'info> {
    /// Permissionless crank signer.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,

    /// Escrow vault holding the USDC.
    #[account(
        mut,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA authority that owns the vault.
    #[account(
        seeds = [b"authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// Seller's USDC token account (destination).
    #[account(
        mut,
        constraint = seller_token_account.owner == trade_account.seller,
        constraint = seller_token_account.mint == escrow_vault.mint,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 16])]
pub struct OpenDispute<'info> {
    /// Either buyer or seller.
    pub disputer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 16])]
pub struct AdminResolve<'info> {
    /// Admin signer (buyer in hackathon scope).
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,

    /// Escrow vault holding the USDC.
    #[account(
        mut,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA authority that owns the vault.
    #[account(
        seeds = [b"authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// Winner's USDC token account.
    #[account(
        mut,
        constraint = winner_token_account.mint == escrow_vault.mint,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct TradeCreated {
    pub trade_id: [u8; 16],
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount_usdc: u64,
}

#[event]
pub struct TradeProofSubmitted {
    pub trade_id: [u8; 16],
    pub verifier: Pubkey,
}

#[event]
pub struct TradeSettled {
    pub trade_id: [u8; 16],
    pub seller: Pubkey,
    pub amount_usdc: u64,
}

#[event]
pub struct TradeDisputed {
    pub trade_id: [u8; 16],
    pub disputer: Pubkey,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[error_code]
pub enum TradeError {
    #[msg("Trade is not in the required status for this operation")]
    InvalidTradeStatus,

    #[msg("Signer is not authorized for this action")]
    UnauthorizedAccess,

    #[msg("Submitted proof is invalid or empty")]
    InvalidProof,

    #[msg("Delivery milestone has not been proven yet")]
    DeliveryNotProven,

    #[msg("Winner must be either the buyer or the seller")]
    InvalidWinner,

    #[msg("Tracking ID exceeds the 64-character limit")]
    TrackingIdTooLong,
}
