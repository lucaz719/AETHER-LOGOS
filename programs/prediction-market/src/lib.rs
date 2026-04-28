use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Aopbcs5WyUGqhezfAofgaFEETbFi3eeh97gqahG3darr");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Yes,
    No,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Parimutuel prediction market tied to a shipment digital twin.
/// PDA seeds: ["market", shipment_twin pubkey]
#[account]
pub struct MarketAccount {
    /// The compressed-NFT / shipment reference this market hedges against.
    pub shipment_twin: Pubkey,
    /// The wallet that created (and can resolve) this market.
    pub creator: Pubkey,
    /// Human-readable question (max 128 chars).
    pub question: String,
    /// Unix timestamp after which the market may be resolved.
    pub resolution_time: i64,
    /// Total USDC staked on the Yes side.
    pub total_yes: u64,
    /// Total USDC staked on the No side.
    pub total_no: u64,
    /// None while open; Some(true) = Yes won, Some(false) = No won.
    pub outcome: Option<bool>,
    pub status: MarketStatus,
    /// Protocol fee in basis points (e.g. 200 = 2%).
    pub protocol_fee_bps: u16,
    pub bump: u8,
}

/// Space: 8 (discriminator) + 32 + 32 + (4+128) + 8 + 8 + 8 + (1+1) + 1 + 2 + 1 = 234
const MARKET_ACCOUNT_SPACE: usize = 234;

/// A user's hedge position within a specific market.
/// PDA seeds: ["position", market pubkey, user pubkey]
#[account]
pub struct HedgePosition {
    pub market: Pubkey,
    pub user: Pubkey,
    pub side: Side,
    /// USDC amount staked.
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

/// Space: 8 (discriminator) + 32 + 32 + 1 + 8 + 1 + 1 = 83
const HEDGE_POSITION_SPACE: usize = 83;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod prediction_market {
    use super::*;

    /// Create a new hedge market for a specific shipment digital twin.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        resolution_time: i64,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        require!(question.len() <= 128, MarketError::QuestionTooLong);
        require!(
            resolution_time > Clock::get()?.unix_timestamp,
            MarketError::InvalidResolutionTime
        );
        require!(protocol_fee_bps <= 1000, MarketError::FeeTooHigh);

        let market = &mut ctx.accounts.market_account;
        market.shipment_twin = ctx.accounts.shipment_twin.key();
        market.creator = ctx.accounts.creator.key();
        market.question = question.clone();
        market.resolution_time = resolution_time;
        market.total_yes = 0;
        market.total_no = 0;
        market.outcome = None;
        market.status = MarketStatus::Open;
        market.protocol_fee_bps = protocol_fee_bps;
        market.bump = ctx.bumps.market_account;

        emit!(MarketCreated {
            market: ctx.accounts.market_account.key(),
            question,
            resolution_time,
        });

        Ok(())
    }

    /// Stake USDC on the Yes or No side of a market.
    /// Creates the position PDA on first call (init-if-needed).
    pub fn place_hedge(ctx: Context<PlaceHedge>, side: Side, amount: u64) -> Result<()> {
        require!(amount > 0, MarketError::InvalidAmount);

        let market = &mut ctx.accounts.market_account;
        require!(
            market.status == MarketStatus::Open,
            MarketError::MarketNotOpen
        );
        let (expected_market, expected_market_bump) = Pubkey::find_program_address(
            &[b"market", market.shipment_twin.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(expected_market, market.key(), MarketError::MarketNotOpen);
        require!(
            expected_market_bump == market.bump,
            MarketError::MarketNotOpen
        );

        // Transfer USDC from user to market vault.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.market_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update pool totals.
        match side {
            Side::Yes => {
                market.total_yes = market
                    .total_yes
                    .checked_add(amount)
                    .ok_or(MarketError::InvalidAmount)?;
            }
            Side::No => {
                market.total_no = market
                    .total_no
                    .checked_add(amount)
                    .ok_or(MarketError::InvalidAmount)?;
            }
        }

        // Populate / accumulate position.
        let position = &mut ctx.accounts.hedge_position;
        if position.amount == 0 {
            // First time – initialise fields.
            position.market = ctx.accounts.market_account.key();
            position.user = ctx.accounts.user.key();
            position.side = side;
            position.claimed = false;
            position.bump = ctx.bumps.hedge_position;
        } else {
            // Subsequent stake – must be on the same side.
            require!(position.side == side, MarketError::MarketNotOpen);
        }
        position.amount = position
            .amount
            .checked_add(amount)
            .ok_or(MarketError::InvalidAmount)?;

        emit!(HedgePlaced {
            market: ctx.accounts.market_account.key(),
            user: ctx.accounts.user.key(),
            side,
            amount,
        });

        Ok(())
    }

    /// Resolve the market by declaring an outcome.
    /// Only the creator may resolve (hackathon scope).
    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        let market = &mut ctx.accounts.market_account;

        require!(
            market.status == MarketStatus::Open,
            MarketError::MarketNotOpen
        );
        require!(
            ctx.accounts.creator.key() == market.creator,
            MarketError::UnauthorizedResolver
        );
        require!(
            Clock::get()?.unix_timestamp >= market.resolution_time,
            MarketError::ResolutionTooEarly
        );
        let (expected_market, expected_market_bump) = Pubkey::find_program_address(
            &[b"market", market.shipment_twin.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(expected_market, market.key(), MarketError::MarketNotOpen);
        require!(
            expected_market_bump == market.bump,
            MarketError::MarketNotOpen
        );

        market.outcome = Some(outcome);
        market.status = MarketStatus::Resolved;

        emit!(MarketResolved {
            market: ctx.accounts.market_account.key(),
            outcome,
        });

        Ok(())
    }

    /// Claim proportional winnings from a resolved market.
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market_account;
        let position = &mut ctx.accounts.hedge_position;

        require!(
            market.status == MarketStatus::Resolved,
            MarketError::MarketNotResolved
        );
        let (expected_market, expected_market_bump) = Pubkey::find_program_address(
            &[b"market", market.shipment_twin.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(
            expected_market,
            market.key(),
            MarketError::MarketNotResolved
        );
        require!(
            expected_market_bump == market.bump,
            MarketError::MarketNotResolved
        );
        require!(!position.claimed, MarketError::AlreadyClaimed);

        let outcome = market.outcome.unwrap(); // safe: status is Resolved
        let user_won = match position.side {
            Side::Yes => outcome,
            Side::No => !outcome,
        };
        require!(user_won, MarketError::PositionNotWinning);

        let winning_side_total = if outcome {
            market.total_yes
        } else {
            market.total_no
        };

        require!(winning_side_total > 0, MarketError::ZeroPayout);

        let total_pool = market
            .total_yes
            .checked_add(market.total_no)
            .ok_or(MarketError::ZeroPayout)?;

        let user_share = ((position.amount as u128)
            .checked_mul(total_pool as u128)
            .ok_or(MarketError::ZeroPayout)?
            .checked_div(winning_side_total as u128)
            .ok_or(MarketError::ZeroPayout)?) as u64;

        require!(user_share > 0, MarketError::ZeroPayout);

        // PDA signer seeds for the market authority.
        let market_key = ctx.accounts.market_account.key();
        let authority_seeds: &[&[u8]] = &[
            b"market_authority",
            market_key.as_ref(),
            &[ctx.bumps.market_authority],
        ];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.market_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            user_share,
        )?;

        position.claimed = true;

        emit!(WinningsClaimed {
            market: ctx.accounts.market_account.key(),
            user: ctx.accounts.user.key(),
            amount: user_share,
        });

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(question: String, resolution_time: i64, protocol_fee_bps: u16)]
pub struct CreateMarket<'info> {
    /// Creator who pays for account rent and can later resolve the market.
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The shipment digital-twin reference (compressed NFT asset id).
    /// CHECK: Stored as a reference key only; no reads/writes.
    pub shipment_twin: UncheckedAccount<'info>,

    /// Market PDA – initialised here.
    #[account(
        init,
        payer = creator,
        space = MARKET_ACCOUNT_SPACE,
        seeds = [b"market", shipment_twin.key().as_ref()],
        bump,
    )]
    pub market_account: Account<'info, MarketAccount>,

    /// Market vault – PDA token account holding staked USDC.
    #[account(
        init,
        payer = creator,
        token::mint = usdc_mint,
        token::authority = market_authority,
        seeds = [b"market_vault", market_account.key().as_ref()],
        bump,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// Market authority PDA – signs for vault token transfers.
    /// CHECK: PDA used only as a signing authority; no data.
    #[account(
        seeds = [b"market_authority", market_account.key().as_ref()],
        bump,
    )]
    pub market_authority: UncheckedAccount<'info>,

    /// USDC mint.
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(side: Side, amount: u64)]
pub struct PlaceHedge<'info> {
    /// User placing the hedge.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The market being bet on.
    #[account(
        mut,
        seeds = [b"market", market_account.shipment_twin.as_ref()],
        bump = market_account.bump,
    )]
    pub market_account: Account<'info, MarketAccount>,

    /// User's position PDA – created on first hedge via init-if-needed.
    #[account(
        init_if_needed,
        payer = user,
        space = HEDGE_POSITION_SPACE,
        seeds = [b"position", market_account.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub hedge_position: Account<'info, HedgePosition>,

    /// Market vault holding staked USDC.
    #[account(
        mut,
        seeds = [b"market_vault", market_account.key().as_ref()],
        bump,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// User's USDC token account (source of stake).
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == market_vault.mint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    /// Only the original creator may resolve.
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market_account.shipment_twin.as_ref()],
        bump = market_account.bump,
    )]
    pub market_account: Account<'info, MarketAccount>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    /// The user claiming winnings.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The resolved market.
    #[account(
        seeds = [b"market", market_account.shipment_twin.as_ref()],
        bump = market_account.bump,
    )]
    pub market_account: Account<'info, MarketAccount>,

    /// User's position.
    #[account(
        mut,
        seeds = [b"position", market_account.key().as_ref(), user.key().as_ref()],
        bump = hedge_position.bump,
        constraint = hedge_position.user == user.key(),
        constraint = hedge_position.market == market_account.key(),
    )]
    pub hedge_position: Account<'info, HedgePosition>,

    /// Market vault holding staked USDC.
    #[account(
        mut,
        seeds = [b"market_vault", market_account.key().as_ref()],
        bump,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// Market authority PDA – signs for vault token transfers.
    /// CHECK: PDA used only as a signing authority; no data.
    #[account(
        seeds = [b"market_authority", market_account.key().as_ref()],
        bump,
    )]
    pub market_authority: UncheckedAccount<'info>,

    /// User's USDC token account (destination for winnings).
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == market_vault.mint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub question: String,
    pub resolution_time: i64,
}

#[event]
pub struct HedgePlaced {
    pub market: Pubkey,
    pub user: Pubkey,
    pub side: Side,
    pub amount: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: bool,
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[error_code]
pub enum MarketError {
    #[msg("Stake amount must be greater than zero")]
    InvalidAmount,

    #[msg("Market is not open")]
    MarketNotOpen,

    #[msg("Market is not yet resolved")]
    MarketNotResolved,

    #[msg("Resolution time must be in the future")]
    InvalidResolutionTime,

    #[msg("Question exceeds the 128-character limit")]
    QuestionTooLong,

    #[msg("Protocol fee exceeds the 10 % maximum (1000 bps)")]
    FeeTooHigh,

    #[msg("Winnings have already been claimed")]
    AlreadyClaimed,

    #[msg("Market cannot be resolved before resolution time")]
    ResolutionTooEarly,

    #[msg("Position is not on the winning side")]
    PositionNotWinning,

    #[msg("Only the market creator can resolve")]
    UnauthorizedResolver,

    #[msg("Computed payout is zero")]
    ZeroPayout,
}
