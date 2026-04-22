use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN");

pub const DEVNET_USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
pub const MAX_CATEGORIES: usize = 8;
pub const MAX_CATEGORY_LEN: usize = 32;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VendorType {
    Retailer,
    Wholesaler,
    Distributor,
    Manufacturer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProductCategory {
    Electronics,
    Apparel,
    HomeGoods,
    Machinery,
    FoodBeverage,
    Chemicals,
    Automotive,
    Healthcare,
    Construction,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OrderStatus {
    Created,
    EscrowLocked,
    Cancelled,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Protocol configuration storing the admin pubkey.
/// PDA seeds: ["config"]
#[account]
pub struct MarketplaceConfig {
    pub admin: Pubkey,
    pub bump: u8,
}

const MARKETPLACE_CONFIG_SPACE: usize = 8 + 32 + 1;

/// Vendor shop profile.
/// PDA seeds: ["vendor", authority]
#[account]
pub struct VendorProfile {
    pub authority: Pubkey,
    pub shop_name: String,          // max 64
    pub shop_description: String,   // max 256
    pub logo_cid: Option<String>,   // max 64
    pub banner_cid: Option<String>, // max 64
    pub vendor_type: VendorType,
    pub categories: Vec<String>,    // max 8, each max 32 chars
    pub contact_email_hash: [u8; 32],
    pub total_sales: u64,
    pub rating_sum: u64,
    pub rating_count: u32,
    pub is_verified: bool,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

const VENDOR_PROFILE_SPACE: usize = 8            // discriminator
    + 32                                          // authority
    + (4 + 64)                                    // shop_name
    + (4 + 256)                                   // shop_description
    + (1 + 4 + 64)                                // logo_cid  Option<String(64)>
    + (1 + 4 + 64)                                // banner_cid Option<String(64)>
    + 1                                           // vendor_type
    + (4 + MAX_CATEGORIES * (4 + MAX_CATEGORY_LEN)) // categories Vec<String>
    + 32                                          // contact_email_hash
    + 8                                           // total_sales
    + 8                                           // rating_sum
    + 4                                           // rating_count
    + 1                                           // is_verified
    + 1                                           // is_active
    + 8                                           // created_at
    + 1                                           // bump
    + 64;                                         // padding

/// Product listing posted by a vendor.
/// PDA seeds: ["listing", vendor_authority, listing_id]
#[account]
pub struct ProductListing {
    pub listing_id: [u8; 16],
    pub vendor: Pubkey,
    pub title: String,              // max 128
    pub description: String,        // max 512
    pub images_cid: Option<String>, // max 64
    pub category: ProductCategory,
    pub price_usdc: u64,
    pub min_order_qty: u32,
    pub max_order_qty: Option<u32>,
    pub stock: Option<u32>,
    pub shipping_deadline_hours: u32,
    pub requires_signature: bool,
    pub is_active: bool,
    pub bump: u8,
}

const PRODUCT_LISTING_SPACE: usize = 8            // discriminator
    + 16                                           // listing_id
    + 32                                           // vendor
    + (4 + 128)                                    // title
    + (4 + 512)                                    // description
    + (1 + 4 + 64)                                 // images_cid Option<String(64)>
    + 1                                            // category
    + 8                                            // price_usdc
    + 4                                            // min_order_qty
    + (1 + 4)                                      // max_order_qty Option<u32>
    + (1 + 4)                                      // stock Option<u32>
    + 4                                            // shipping_deadline_hours
    + 1                                            // requires_signature
    + 1                                            // is_active
    + 1                                            // bump
    + 32;                                          // padding

/// A marketplace order linking buyer, listing, and escrow trade.
/// PDA seeds: ["mktorder", buyer, order_id]
#[account]
pub struct MarketplaceOrder {
    pub order_id: [u8; 16],
    pub buyer: Pubkey,
    pub vendor: Pubkey,
    pub listing: Pubkey,
    pub quantity: u32,
    pub unit_price: u64,
    pub total_amount: u64,
    pub trade_account: Pubkey,
    pub escrow_trade_id: [u8; 32],
    pub status: OrderStatus,
    pub created_at: i64,
    pub bump: u8,
}

const MARKETPLACE_ORDER_SPACE: usize = 8           // discriminator
    + 16                                            // order_id
    + 32                                            // buyer
    + 32                                            // vendor
    + 32                                            // listing
    + 4                                             // quantity
    + 8                                             // unit_price
    + 8                                             // total_amount
    + 32                                            // trade_account
    + 32                                            // escrow_trade_id
    + 1                                             // status
    + 8                                             // created_at
    + 1;                                            // bump

/// Buyer review for a vendor, tied to a completed escrow trade.
/// PDA seeds: ["review", trade_account, reviewer]
#[account]
pub struct VendorReview {
    pub reviewer: Pubkey,
    pub vendor: Pubkey,
    pub trade_account: Pubkey,
    pub rating: u8,
    pub comment_cid: Option<String>, // max 64
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

const VENDOR_REVIEW_SPACE: usize = 8               // discriminator
    + 32                                            // reviewer
    + 32                                            // vendor
    + 32                                            // trade_account
    + 1                                             // rating
    + (1 + 4 + 64)                                  // comment_cid Option<String(64)>
    + 1                                             // is_active
    + 8                                             // created_at
    + 1;                                            // bump

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod marketplace {
    use super::*;

    /// Initialize protocol config with the deployer as admin.
    /// Seeds: ["config"]
    pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Register a new vendor shop.
    /// Seeds: ["vendor", authority]
    pub fn register_vendor(
        ctx: Context<RegisterVendor>,
        shop_name: String,
        shop_description: String,
        vendor_type: VendorType,
        categories: Vec<String>,
        contact_email_hash: [u8; 32],
    ) -> Result<()> {
        require!(shop_name.len() <= 64, MarketplaceError::FieldTooLong);
        require!(shop_description.len() <= 256, MarketplaceError::FieldTooLong);
        require!(categories.len() <= MAX_CATEGORIES, MarketplaceError::TooManyCategories);
        for cat in &categories {
            require!(cat.len() <= MAX_CATEGORY_LEN, MarketplaceError::FieldTooLong);
        }

        let now = Clock::get()?.unix_timestamp;
        let profile = &mut ctx.accounts.vendor_profile;
        profile.authority = ctx.accounts.authority.key();
        profile.shop_name = shop_name;
        profile.shop_description = shop_description;
        profile.logo_cid = None;
        profile.banner_cid = None;
        profile.vendor_type = vendor_type;
        profile.categories = categories;
        profile.contact_email_hash = contact_email_hash;
        profile.total_sales = 0;
        profile.rating_sum = 0;
        profile.rating_count = 0;
        profile.is_verified = false;
        profile.is_active = true;
        profile.created_at = now;
        profile.bump = ctx.bumps.vendor_profile;

        emit!(VendorRegistered {
            authority: ctx.accounts.authority.key(),
            shop_name: profile.shop_name.clone(),
            vendor_type: profile.vendor_type.clone(),
        });
        Ok(())
    }

    /// Update vendor shop details (vendor-controlled fields only).
    pub fn update_vendor(
        ctx: Context<UpdateVendor>,
        shop_name: String,
        shop_description: String,
        logo_cid: Option<String>,
        banner_cid: Option<String>,
        vendor_type: VendorType,
        categories: Vec<String>,
    ) -> Result<()> {
        require!(shop_name.len() <= 64, MarketplaceError::FieldTooLong);
        require!(shop_description.len() <= 256, MarketplaceError::FieldTooLong);
        if let Some(ref cid) = logo_cid {
            require!(cid.len() <= 64, MarketplaceError::FieldTooLong);
        }
        if let Some(ref cid) = banner_cid {
            require!(cid.len() <= 64, MarketplaceError::FieldTooLong);
        }
        require!(categories.len() <= MAX_CATEGORIES, MarketplaceError::TooManyCategories);
        for cat in &categories {
            require!(cat.len() <= MAX_CATEGORY_LEN, MarketplaceError::FieldTooLong);
        }

        let profile = &mut ctx.accounts.vendor_profile;
        profile.shop_name = shop_name;
        profile.shop_description = shop_description;
        profile.logo_cid = logo_cid;
        profile.banner_cid = banner_cid;
        profile.vendor_type = vendor_type;
        profile.categories = categories;
        Ok(())
    }

    /// Admin-only: mark a vendor as verified.
    pub fn verify_vendor(ctx: Context<VerifyVendor>) -> Result<()> {
        ctx.accounts.vendor_profile.is_verified = true;
        Ok(())
    }

    /// Create a new product listing.
    /// Seeds: ["listing", vendor_authority, listing_id]
    pub fn create_listing(
        ctx: Context<CreateListing>,
        listing_id: [u8; 16],
        title: String,
        description: String,
        images_cid: Option<String>,
        category: ProductCategory,
        price_usdc: u64,
        min_order_qty: u32,
        max_order_qty: Option<u32>,
        stock: Option<u32>,
        shipping_deadline_hours: u32,
        requires_signature: bool,
    ) -> Result<()> {
        require!(title.len() <= 128, MarketplaceError::FieldTooLong);
        require!(description.len() <= 512, MarketplaceError::FieldTooLong);
        if let Some(ref cid) = images_cid {
            require!(cid.len() <= 64, MarketplaceError::FieldTooLong);
        }
        require!(price_usdc > 0, MarketplaceError::InvalidPrice);
        require!(min_order_qty > 0, MarketplaceError::InvalidQuantity);
        if let Some(max) = max_order_qty {
            require!(max >= min_order_qty, MarketplaceError::InvalidQuantity);
        }
        require!(shipping_deadline_hours >= 1, MarketplaceError::InvalidDeadline);
        require!(
            ctx.accounts.vendor_profile.is_active,
            MarketplaceError::VendorNotActive
        );

        let listing = &mut ctx.accounts.listing;
        listing.listing_id = listing_id;
        listing.vendor = ctx.accounts.vendor_profile.authority;
        listing.title = title.clone();
        listing.description = description;
        listing.images_cid = images_cid;
        listing.category = category;
        listing.price_usdc = price_usdc;
        listing.min_order_qty = min_order_qty;
        listing.max_order_qty = max_order_qty;
        listing.stock = stock;
        listing.shipping_deadline_hours = shipping_deadline_hours;
        listing.requires_signature = requires_signature;
        listing.is_active = true;
        listing.bump = ctx.bumps.listing;

        emit!(ListingCreated {
            listing: ctx.accounts.listing.key(),
            vendor: ctx.accounts.vendor_profile.authority,
            title,
            price_usdc,
        });
        Ok(())
    }

    /// Update a product listing's mutable fields.
    pub fn update_listing(
        ctx: Context<UpdateListing>,
        title: String,
        description: String,
        images_cid: Option<String>,
        category: ProductCategory,
        price_usdc: u64,
        min_order_qty: u32,
        max_order_qty: Option<u32>,
        stock: Option<u32>,
        shipping_deadline_hours: u32,
        requires_signature: bool,
    ) -> Result<()> {
        require!(title.len() <= 128, MarketplaceError::FieldTooLong);
        require!(description.len() <= 512, MarketplaceError::FieldTooLong);
        if let Some(ref cid) = images_cid {
            require!(cid.len() <= 64, MarketplaceError::FieldTooLong);
        }
        require!(price_usdc > 0, MarketplaceError::InvalidPrice);
        require!(min_order_qty > 0, MarketplaceError::InvalidQuantity);
        if let Some(max) = max_order_qty {
            require!(max >= min_order_qty, MarketplaceError::InvalidQuantity);
        }
        require!(shipping_deadline_hours >= 1, MarketplaceError::InvalidDeadline);

        let listing = &mut ctx.accounts.listing;
        listing.title = title;
        listing.description = description;
        listing.images_cid = images_cid;
        listing.category = category;
        listing.price_usdc = price_usdc;
        listing.min_order_qty = min_order_qty;
        listing.max_order_qty = max_order_qty;
        listing.stock = stock;
        listing.shipping_deadline_hours = shipping_deadline_hours;
        listing.requires_signature = requires_signature;
        Ok(())
    }

    /// Soft-deactivate a listing.
    pub fn deactivate_listing(ctx: Context<DeactivateListing>) -> Result<()> {
        ctx.accounts.listing.is_active = false;
        Ok(())
    }

    /// Place a marketplace order.
    /// Creates a MarketplaceOrder PDA and CPI-calls trade_escrow::create_trade
    /// to lock USDC in the escrow vault.
    ///
    /// Seeds for marketplace_order: ["mktorder", buyer, order_id]
    pub fn place_order(
        ctx: Context<PlaceOrder>,
        order_id: [u8; 16],
        trade_id: [u8; 32],
        quantity: u32,
        milestone_hash: [u8; 32],
    ) -> Result<()> {
        let listing_key = ctx.accounts.listing.key();
        let is_active = ctx.accounts.listing.is_active;
        let min_qty = ctx.accounts.listing.min_order_qty;
        let max_qty = ctx.accounts.listing.max_order_qty;
        let stock_opt = ctx.accounts.listing.stock;
        let price_usdc = ctx.accounts.listing.price_usdc;
        let sig_req = ctx.accounts.listing.requires_signature;

        require!(is_active, MarketplaceError::ListingNotActive);
        require!(
            ctx.accounts.vendor_profile.is_active,
            MarketplaceError::VendorNotActive
        );
        require!(quantity >= min_qty, MarketplaceError::QuantityBelowMin);
        if let Some(max) = max_qty {
            require!(quantity <= max, MarketplaceError::QuantityAboveMax);
        }
        if let Some(stock) = stock_opt {
            require!(quantity <= stock, MarketplaceError::InsufficientStock);
        }

        let total_amount = price_usdc
            .checked_mul(quantity as u64)
            .ok_or(MarketplaceError::InvalidPrice)?;

        // Validate the trade-escrow PDAs passed by the client.
        let trade_escrow_pid = ctx.accounts.trade_escrow_program.key();
        let (expected_trade, _) = Pubkey::find_program_address(
            &[b"trade", ctx.accounts.buyer.key().as_ref(), &trade_id],
            &trade_escrow_pid,
        );
        require_keys_eq!(
            expected_trade,
            ctx.accounts.trade_account.key(),
            MarketplaceError::InvalidTradeAccount
        );
        let (expected_vault, _) =
            Pubkey::find_program_address(&[b"vault", &trade_id], &trade_escrow_pid);
        require_keys_eq!(
            expected_vault,
            ctx.accounts.escrow_vault.key(),
            MarketplaceError::InvalidTradeAccount
        );
        let (expected_authority, _) =
            Pubkey::find_program_address(&[b"authority"], &trade_escrow_pid);
        require_keys_eq!(
            expected_authority,
            ctx.accounts.vault_authority.key(),
            MarketplaceError::InvalidTradeAccount
        );

        // milestone_hash is computed off-chain and passed by the client
        // (e.g. sha256(order_id || listing_pubkey_bytes))

        // CPI → trade_escrow::create_trade
        let cpi_program = ctx.accounts.trade_escrow_program.to_account_info();
        let cpi_accounts = trade_escrow::cpi::accounts::CreateTrade {
            buyer: ctx.accounts.buyer.to_account_info(),
            seller: ctx.accounts.seller.to_account_info(),
            trade_account: ctx.accounts.trade_account.to_account_info(),
            escrow_vault: ctx.accounts.escrow_vault.to_account_info(),
            vault_authority: ctx.accounts.vault_authority.to_account_info(),
            buyer_token_account: ctx.accounts.buyer_token_account.to_account_info(),
            usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        trade_escrow::cpi::create_trade(
            CpiContext::new(cpi_program, cpi_accounts),
            trade_id,
            total_amount,
            milestone_hash,
            sig_req,
            None,
        )?;

        // Decrement stock if finite.
        if let Some(ref mut stock) = ctx.accounts.listing.stock {
            *stock = stock.saturating_sub(quantity);
        }
        ctx.accounts.vendor_profile.total_sales = ctx
            .accounts
            .vendor_profile
            .total_sales
            .saturating_add(total_amount);

        let now = Clock::get()?.unix_timestamp;
        let order = &mut ctx.accounts.marketplace_order;
        order.order_id = order_id;
        order.buyer = ctx.accounts.buyer.key();
        order.vendor = ctx.accounts.vendor_profile.authority;
        order.listing = listing_key;
        order.quantity = quantity;
        order.unit_price = price_usdc;
        order.total_amount = total_amount;
        order.trade_account = ctx.accounts.trade_account.key();
        order.escrow_trade_id = trade_id;
        order.status = OrderStatus::EscrowLocked;
        order.created_at = now;
        order.bump = ctx.bumps.marketplace_order;

        emit!(OrderPlaced {
            order_id,
            buyer: ctx.accounts.buyer.key(),
            vendor: ctx.accounts.vendor_profile.authority,
            listing: listing_key,
            total_amount,
            trade_account: ctx.accounts.trade_account.key(),
        });
        Ok(())
    }

    /// Cancel a marketplace order.
    /// Requires the associated escrow trade to already be in Cancelled status.
    pub fn cancel_order(ctx: Context<CancelOrder>, _order_id: [u8; 16]) -> Result<()> {
        let order = &ctx.accounts.marketplace_order;
        require!(
            !matches!(order.status, OrderStatus::Cancelled),
            MarketplaceError::OrderAlreadyFinalized
        );
        require_keys_eq!(
            order.trade_account,
            ctx.accounts.trade_account.key(),
            MarketplaceError::InvalidTradeAccount
        );

        // Read the trade-escrow account and confirm it's Cancelled.
        let trade_data = ctx.accounts.trade_account.try_borrow_data()?;
        let trade =
            trade_escrow::TradeAccount::try_deserialize(&mut trade_data.as_ref())?;
        require!(
            matches!(trade.status, trade_escrow::TradeStatus::Cancelled),
            MarketplaceError::TradeNotCancelled
        );

        ctx.accounts.marketplace_order.status = OrderStatus::Cancelled;
        Ok(())
    }

    /// Submit a review for a vendor after a confirmed delivery.
    /// Only the buyer of the associated escrow trade may review, and the trade
    /// must be in Released status.
    /// Seeds: ["review", trade_account, reviewer]
    pub fn submit_review(
        ctx: Context<SubmitReview>,
        rating: u8,
        comment_cid: Option<String>,
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, MarketplaceError::InvalidRating);
        if let Some(ref cid) = comment_cid {
            require!(cid.len() <= 64, MarketplaceError::FieldTooLong);
        }

        // Verify the escrow trade is Released and reviewer was the buyer.
        let trade_data = ctx.accounts.trade_account.try_borrow_data()?;
        let trade =
            trade_escrow::TradeAccount::try_deserialize(&mut trade_data.as_ref())?;
        require!(
            matches!(trade.status, trade_escrow::TradeStatus::Released),
            MarketplaceError::TradeNotReleased
        );
        require!(
            trade.buyer == ctx.accounts.reviewer.key()
                || trade.seller == ctx.accounts.reviewer.key(),
            MarketplaceError::Unauthorized
        );

        let vendor_auth = ctx.accounts.vendor_profile.authority;
        require!(
            trade.buyer == vendor_auth
                || trade.seller == vendor_auth,
            MarketplaceError::InvalidVendor
        );

        let now = Clock::get()?.unix_timestamp;
        let review = &mut ctx.accounts.review;
        review.reviewer = ctx.accounts.reviewer.key();
        review.vendor = vendor_auth;
        review.trade_account = ctx.accounts.trade_account.key();
        review.rating = rating;
        review.comment_cid = comment_cid;
        review.is_active = true;
        review.created_at = now;
        review.bump = ctx.bumps.review;

        // Update vendor aggregate rating.
        ctx.accounts.vendor_profile.rating_sum = ctx
            .accounts
            .vendor_profile
            .rating_sum
            .saturating_add(rating as u64);
        ctx.accounts.vendor_profile.rating_count = ctx
            .accounts
            .vendor_profile
            .rating_count
            .saturating_add(1);

        emit!(ReviewSubmitted {
            vendor: vendor_auth,
            reviewer: ctx.accounts.reviewer.key(),
            rating,
        });
        Ok(())
    }

    /// Admin-only: close (hard-delete) an abusive review, returning rent to admin.
    pub fn close_review(_ctx: Context<CloseReview>) -> Result<()> {
        // Account closing is handled by the `close = admin` constraint.
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = MARKETPLACE_CONFIG_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, MarketplaceConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterVendor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = VENDOR_PROFILE_SPACE,
        seeds = [b"vendor", authority.key().as_ref()],
        bump,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVendor<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vendor", authority.key().as_ref()],
        bump = vendor_profile.bump,
        constraint = vendor_profile.authority == authority.key() @ MarketplaceError::Unauthorized,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
}

#[derive(Accounts)]
pub struct VerifyVendor<'info> {
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ MarketplaceError::Unauthorized,
    )]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [b"vendor", vendor_profile.authority.as_ref()],
        bump = vendor_profile.bump,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
}

#[derive(Accounts)]
#[instruction(listing_id: [u8; 16])]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"vendor", authority.key().as_ref()],
        bump = vendor_profile.bump,
        constraint = vendor_profile.authority == authority.key() @ MarketplaceError::Unauthorized,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    #[account(
        init,
        payer = authority,
        space = PRODUCT_LISTING_SPACE,
        seeds = [b"listing", authority.key().as_ref(), listing_id.as_ref()],
        bump,
    )]
    pub listing: Account<'info, ProductListing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateListing<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"vendor", authority.key().as_ref()],
        bump = vendor_profile.bump,
        constraint = vendor_profile.authority == authority.key() @ MarketplaceError::Unauthorized,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    #[account(
        mut,
        seeds = [b"listing", authority.key().as_ref(), listing.listing_id.as_ref()],
        bump = listing.bump,
        constraint = listing.vendor == authority.key() @ MarketplaceError::Unauthorized,
    )]
    pub listing: Account<'info, ProductListing>,
}

#[derive(Accounts)]
pub struct DeactivateListing<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"listing", authority.key().as_ref(), listing.listing_id.as_ref()],
        bump = listing.bump,
        constraint = listing.vendor == authority.key() @ MarketplaceError::Unauthorized,
    )]
    pub listing: Account<'info, ProductListing>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 16], trade_id: [u8; 32], quantity: u32, milestone_hash: [u8; 32])]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vendor", vendor_profile.authority.as_ref()],
        bump = vendor_profile.bump,
        constraint = vendor_profile.is_active @ MarketplaceError::VendorNotActive,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,

    #[account(
        mut,
        seeds = [b"listing", vendor_profile.authority.as_ref(), listing.listing_id.as_ref()],
        bump = listing.bump,
        constraint = listing.is_active @ MarketplaceError::ListingNotActive,
        constraint = listing.vendor == vendor_profile.authority @ MarketplaceError::InvalidVendor,
    )]
    pub listing: Account<'info, ProductListing>,

    #[account(
        init,
        payer = buyer,
        space = MARKETPLACE_ORDER_SPACE,
        seeds = [b"mktorder", buyer.key().as_ref(), order_id.as_ref()],
        bump,
    )]
    pub marketplace_order: Account<'info, MarketplaceOrder>,

    // Accounts forwarded to trade_escrow CPI --------------------------------

    /// CHECK: Only stored as the seller/vendor key in trade-escrow.
    pub seller: UncheckedAccount<'info>,

    /// CHECK: PDA of trade-escrow program; initialized via CPI.
    #[account(mut)]
    pub trade_account: UncheckedAccount<'info>,

    /// CHECK: Token vault PDA of trade-escrow program; initialized via CPI.
    #[account(mut)]
    pub escrow_vault: UncheckedAccount<'info>,

    /// CHECK: PDA signer authority of trade-escrow vault.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ MarketplaceError::Unauthorized,
        constraint = buyer_token_account.mint == DEVNET_USDC_MINT @ MarketplaceError::InvalidUsdcMint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(address = DEVNET_USDC_MINT @ MarketplaceError::InvalidUsdcMint)]
    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: The trade-escrow program for CPI calls.
    pub trade_escrow_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 16])]
pub struct CancelOrder<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mktorder", buyer.key().as_ref(), order_id.as_ref()],
        bump = marketplace_order.bump,
        constraint = marketplace_order.buyer == buyer.key() @ MarketplaceError::Unauthorized,
    )]
    pub marketplace_order: Account<'info, MarketplaceOrder>,
    /// CHECK: We deserialize this to read trade status; validated via order.trade_account.
    pub trade_account: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SubmitReview<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vendor", vendor_profile.authority.as_ref()],
        bump = vendor_profile.bump,
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    #[account(
        init,
        payer = reviewer,
        space = VENDOR_REVIEW_SPACE,
        seeds = [b"review", trade_account.key().as_ref(), reviewer.key().as_ref()],
        bump,
    )]
    pub review: Account<'info, VendorReview>,
    /// CHECK: We deserialize this to check Released status.
    pub trade_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseReview<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ MarketplaceError::Unauthorized,
    )]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        close = admin,
    )]
    pub review: Account<'info, VendorReview>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct VendorRegistered {
    pub authority: Pubkey,
    pub shop_name: String,
    pub vendor_type: VendorType,
}

#[event]
pub struct ListingCreated {
    pub listing: Pubkey,
    pub vendor: Pubkey,
    pub title: String,
    pub price_usdc: u64,
}

#[event]
pub struct OrderPlaced {
    pub order_id: [u8; 16],
    pub buyer: Pubkey,
    pub vendor: Pubkey,
    pub listing: Pubkey,
    pub total_amount: u64,
    pub trade_account: Pubkey,
}

#[event]
pub struct ReviewSubmitted {
    pub vendor: Pubkey,
    pub reviewer: Pubkey,
    pub rating: u8,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum MarketplaceError {
    #[msg("Field value exceeds maximum allowed length")]
    FieldTooLong,
    #[msg("Too many categories")]
    TooManyCategories,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Invalid quantity")]
    InvalidQuantity,
    #[msg("Invalid shipping deadline")]
    InvalidDeadline,
    #[msg("Vendor is not active")]
    VendorNotActive,
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Quantity is below the minimum order quantity")]
    QuantityBelowMin,
    #[msg("Quantity exceeds the maximum order quantity")]
    QuantityAboveMax,
    #[msg("Insufficient stock")]
    InsufficientStock,
    #[msg("Invalid trade account address")]
    InvalidTradeAccount,
    #[msg("Trade must be in Cancelled status")]
    TradeNotCancelled,
    #[msg("Trade must be in Released status")]
    TradeNotReleased,
    #[msg("Order is already finalized")]
    OrderAlreadyFinalized,
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("Invalid vendor for this operation")]
    InvalidVendor,
    #[msg("Signer is not authorized")]
    Unauthorized,
    #[msg("Mint must be the configured USDC mint")]
    InvalidUsdcMint,
}
