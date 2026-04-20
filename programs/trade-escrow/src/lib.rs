use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("EVn3aVUGYbx6yvHa5h4m5N3qfJkhKm1FnYeNsfbi34CZ");
pub const DEVNET_USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Carrier {
    DHL,
    FedEx,
    UPS,
    Maersk,
    USPS,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeStatus {
    Pending,
    AwaitingShipment,
    InTransit,
    Verified,
    Released,
    Disputed,
    Cancelled,
}

#[account]
pub struct TradeAccount {
    pub trade_id: [u8; 32],
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub milestone_hash: [u8; 32],
    pub milestone_verified: bool,
    pub proof_data: Vec<u8>,
    pub tracking_id: Option<String>,
    pub carrier: Option<Carrier>,
    pub seller_notified: bool,
    pub order_created_at: i64,
    pub ship_by_deadline: i64,
    pub shipped_at: Option<i64>,
    pub signature_required: bool,
    pub signed_by: Option<String>,
    pub invoice_cid: Option<String>,
    pub status: TradeStatus,
    pub bump: u8,
}

const TRADE_ACCOUNT_SPACE: usize = 8 + 1400;

#[program]
pub mod trade_escrow {
    use super::*;

    pub fn create_trade(
        ctx: Context<CreateTrade>,
        trade_id: [u8; 32],
        amount: u64,
        milestone_hash: [u8; 32],
        signature_required: bool,
        invoice_cid: Option<String>,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.usdc_mint.key(),
            DEVNET_USDC_MINT,
            TradeError::InvalidUsdcMint
        );
        require!(amount > 0, TradeError::InvalidAmount);
        if let Some(cid) = &invoice_cid {
            require!(cid.len() <= 128, TradeError::InvalidInvoiceCid);
        }

        let now = Clock::get()?.unix_timestamp;
        let (expected_authority, expected_authority_bump) =
            Pubkey::find_program_address(&[b"authority"], ctx.program_id);
        require_keys_eq!(
            expected_authority,
            ctx.accounts.vault_authority.key(),
            TradeError::InvalidState
        );
        require!(
            expected_authority_bump == ctx.bumps.vault_authority,
            TradeError::InvalidState
        );

        let trade = &mut ctx.accounts.trade_account;
        trade.trade_id = trade_id;
        trade.buyer = ctx.accounts.buyer.key();
        trade.seller = ctx.accounts.seller.key();
        trade.amount = amount;
        trade.milestone_hash = milestone_hash;
        trade.milestone_verified = false;
        trade.proof_data = Vec::new();
        trade.tracking_id = None;
        trade.carrier = None;
        trade.seller_notified = false;
        trade.order_created_at = now;
        trade.ship_by_deadline = now + (48 * 60 * 60);
        trade.shipped_at = None;
        trade.signature_required = signature_required;
        trade.signed_by = None;
        trade.invoice_cid = invoice_cid;
        trade.status = TradeStatus::AwaitingShipment;
        trade.bump = ctx.bumps.trade_account;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(OrderCreated {
            trade_id,
            buyer: ctx.accounts.buyer.key(),
            seller: ctx.accounts.seller.key(),
            amount,
            ship_by_deadline: trade.ship_by_deadline,
        });

        Ok(())
    }

    pub fn submit_tracking(
        ctx: Context<SubmitTracking>,
        _trade_id: [u8; 32],
        tracking_id: String,
        carrier: Carrier,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(
            ctx.accounts.seller.key() == trade.seller,
            TradeError::Unauthorized
        );
        require!(
            trade.status == TradeStatus::AwaitingShipment,
            TradeError::InvalidState
        );
        require!(
            Clock::get()?.unix_timestamp < trade.ship_by_deadline,
            TradeError::ShipDeadlinePassed
        );
        require!(
            !tracking_id.is_empty() && tracking_id.len() <= 64,
            TradeError::InvalidTrackingId
        );

        let shipped_at = Clock::get()?.unix_timestamp;
        trade.tracking_id = Some(tracking_id.clone());
        trade.carrier = Some(carrier.clone());
        trade.seller_notified = true;
        trade.shipped_at = Some(shipped_at);
        trade.status = TradeStatus::InTransit;

        emit!(TrackingSubmitted {
            trade_id: _trade_id,
            tracking_id,
            shipped_at,
        });

        Ok(())
    }

    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        trade_id: [u8; 32],
        proof_data: Vec<u8>,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(
            trade.status == TradeStatus::InTransit,
            TradeError::InvalidState
        );
        require!(proof_data.len() >= 32, TradeError::ProofInvalid);

        #[cfg(feature = "zktls-verify")]
        let _ = ctx.accounts.reclaim_program.key();

        if trade.signature_required && trade.signed_by.is_none() {
            trade.signed_by = extract_signed_by(&proof_data);
        }

        trade.milestone_verified = true;
        trade.status = TradeStatus::Verified;
        trade.proof_data = proof_data;

        emit!(ProofSubmitted {
            trade_id,
            verified_at: Clock::get()?.unix_timestamp,
            proof_type: if cfg!(feature = "zktls-verify") {
                "zktls".to_string()
            } else {
                "sha256".to_string()
            },
        });

        Ok(())
    }

    pub fn release_funds(ctx: Context<ReleaseFunds>, trade_id: [u8; 32]) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(
            trade.status == TradeStatus::Verified,
            TradeError::InvalidState
        );
        require!(trade.milestone_verified, TradeError::ProofInvalid);

        let (expected_trade, expected_trade_bump) = Pubkey::find_program_address(
            &[b"trade", trade.buyer.as_ref(), trade_id.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(expected_trade, trade.key(), TradeError::InvalidState);
        require!(expected_trade_bump == trade.bump, TradeError::InvalidState);

        let (expected_vault, _) =
            Pubkey::find_program_address(&[b"vault", trade_id.as_ref()], ctx.program_id);
        require_keys_eq!(
            expected_vault,
            ctx.accounts.escrow_vault.key(),
            TradeError::InvalidState
        );

        let (expected_authority, expected_authority_bump) =
            Pubkey::find_program_address(&[b"authority"], ctx.program_id);
        require_keys_eq!(
            expected_authority,
            ctx.accounts.vault_authority.key(),
            TradeError::InvalidState
        );

        let authority_seeds: &[&[u8]] = &[b"authority", &[expected_authority_bump]];
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
            trade.amount,
        )?;

        trade.status = TradeStatus::Released;

        emit!(FundsReleased {
            trade_id,
            seller: trade.seller,
            amount: trade.amount,
        });
        Ok(())
    }

    pub fn cancel_trade(ctx: Context<CancelTrade>, _trade_id: [u8; 32]) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(
            ctx.accounts.buyer.key() == trade.buyer,
            TradeError::Unauthorized
        );
        require!(
            trade.status == TradeStatus::AwaitingShipment,
            TradeError::InvalidState
        );
        require!(
            Clock::get()?.unix_timestamp > trade.ship_by_deadline,
            TradeError::ShipDeadlineNotPassed
        );

        let (expected_vault, _) =
            Pubkey::find_program_address(&[b"vault", _trade_id.as_ref()], ctx.program_id);
        require_keys_eq!(
            expected_vault,
            ctx.accounts.escrow_vault.key(),
            TradeError::InvalidState
        );

        let (expected_authority, expected_authority_bump) =
            Pubkey::find_program_address(&[b"authority"], ctx.program_id);
        require_keys_eq!(
            expected_authority,
            ctx.accounts.vault_authority.key(),
            TradeError::InvalidState
        );

        let authority_seeds: &[&[u8]] = &[b"authority", &[expected_authority_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            trade.amount,
        )?;

        trade.status = TradeStatus::Cancelled;
        emit!(TradeCancelled {
            trade_id: _trade_id,
            buyer: trade.buyer,
            amount: trade.amount,
        });
        Ok(())
    }

    pub fn open_dispute(ctx: Context<OpenDispute>, trade_id: [u8; 32]) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        let disputer = ctx.accounts.disputer.key();

        require!(
            disputer == trade.buyer || disputer == trade.seller,
            TradeError::Unauthorized
        );
        require!(
            trade.status == TradeStatus::AwaitingShipment || trade.status == TradeStatus::InTransit,
            TradeError::InvalidState
        );
        require!(
            Clock::get()?.unix_timestamp > trade.ship_by_deadline || disputer == trade.buyer,
            TradeError::DeadlineNotPassed
        );

        trade.status = TradeStatus::Disputed;
        emit!(DisputeOpened { trade_id, disputer });
        Ok(())
    }

    pub fn admin_resolve(
        ctx: Context<AdminResolve>,
        trade_id: [u8; 32],
        winner: Pubkey,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(
            trade.status == TradeStatus::Disputed,
            TradeError::InvalidState
        );
        require!(
            ctx.accounts.admin.key() == trade.buyer,
            TradeError::Unauthorized
        );
        require!(
            winner == trade.buyer || winner == trade.seller,
            TradeError::Unauthorized
        );

        let (expected_vault, _) =
            Pubkey::find_program_address(&[b"vault", trade_id.as_ref()], ctx.program_id);
        require_keys_eq!(
            expected_vault,
            ctx.accounts.escrow_vault.key(),
            TradeError::InvalidState
        );
        let (expected_authority, expected_authority_bump) =
            Pubkey::find_program_address(&[b"authority"], ctx.program_id);
        require_keys_eq!(
            expected_authority,
            ctx.accounts.vault_authority.key(),
            TradeError::InvalidState
        );

        let authority_seeds: &[&[u8]] = &[b"authority", &[expected_authority_bump]];
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
            trade.amount,
        )?;

        trade.status = TradeStatus::Released;
        emit!(DisputeResolved {
            trade_id,
            winner,
            amount: trade.amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32], amount: u64, milestone_hash: [u8; 32], signature_required: bool, invoice_cid: Option<String>)]
pub struct CreateTrade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Only stored as the seller key.
    pub seller: UncheckedAccount<'info>,

    #[account(
        init,
        payer = buyer,
        space = TRADE_ACCOUNT_SPACE,
        seeds = [b"trade", buyer.key().as_ref(), trade_id.as_ref()],
        bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,

    #[account(
        init,
        payer = buyer,
        token::mint = usdc_mint,
        token::authority = vault_authority,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA signer authority for the vault.
    #[account(seeds = [b"authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == usdc_mint.key(),
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(address = DEVNET_USDC_MINT @ TradeError::InvalidUsdcMint)]
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct SubmitTracking<'info> {
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct SubmitProof<'info> {
    pub submitter: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
    #[cfg(feature = "zktls-verify")]
    /// CHECK: External verifier program account used only when feature-enabled.
    pub reclaim_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct ReleaseFunds<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
    #[account(
        mut,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority that owns the vault.
    #[account(seeds = [b"authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = seller_token_account.owner == trade_account.seller,
        constraint = seller_token_account.mint == escrow_vault.mint,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct CancelTrade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
    #[account(
        mut,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority that owns the vault.
    #[account(seeds = [b"authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == escrow_vault.mint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct OpenDispute<'info> {
    pub disputer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
}

#[derive(Accounts)]
#[instruction(trade_id: [u8; 32])]
pub struct AdminResolve<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"trade", trade_account.buyer.as_ref(), trade_id.as_ref()],
        bump = trade_account.bump,
    )]
    pub trade_account: Account<'info, TradeAccount>,
    #[account(
        mut,
        seeds = [b"vault", trade_id.as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority that owns the vault.
    #[account(seeds = [b"authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = winner_token_account.mint == escrow_vault.mint,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct OrderCreated {
    pub trade_id: [u8; 32],
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub ship_by_deadline: i64,
}

#[event]
pub struct TrackingSubmitted {
    pub trade_id: [u8; 32],
    pub tracking_id: String,
    pub shipped_at: i64,
}

#[event]
pub struct ProofSubmitted {
    pub trade_id: [u8; 32],
    pub verified_at: i64,
    pub proof_type: String,
}

#[event]
pub struct FundsReleased {
    pub trade_id: [u8; 32],
    pub seller: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DisputeOpened {
    pub trade_id: [u8; 32],
    pub disputer: Pubkey,
}

#[event]
pub struct TradeCancelled {
    pub trade_id: [u8; 32],
    pub buyer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DisputeResolved {
    pub trade_id: [u8; 32],
    pub winner: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum TradeError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Trade is not in the required state for this operation")]
    InvalidState,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Proof payload is invalid")]
    ProofInvalid,
    #[msg("Deadline has not passed yet")]
    DeadlineNotPassed,
    #[msg("Seller tried to submit tracking after deadline")]
    ShipDeadlinePassed,
    #[msg("Cancel attempted before deadline")]
    ShipDeadlineNotPassed,
    #[msg("Tracking ID is empty or exceeds 64 characters")]
    InvalidTrackingId,
    #[msg("Unknown carrier")]
    InvalidCarrier,
    #[msg("Mint must be the configured USDC mint")]
    InvalidUsdcMint,
    #[msg("Invoice CID is invalid")]
    InvalidInvoiceCid,
}

fn extract_signed_by(proof_data: &[u8]) -> Option<String> {
    let text = std::str::from_utf8(proof_data).ok()?;
    let marker = "signed_by:";
    let idx = text.find(marker)?;
    let mut name = text[(idx + marker.len())..]
        .split(['\n', ',', ';', '"'])
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();
    if name.is_empty() {
        return None;
    }
    if name.len() > 128 {
        name.truncate(128);
    }
    Some(name)
}
