/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/trade_escrow.json`.
 */
export type TradeEscrow = {
  "address": "6LaqcgUheXF2AVdGZRrh2gWanwDLmr1hcQhmDmt9rHcc",
  "metadata": {
    "name": "tradeEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AETHER-LOGOS Trade Escrow Program"
  },
  "instructions": [
    {
      "name": "adminResolve",
      "docs": [
        "Admin-resolve a disputed trade by sending funds to the winner.",
        "Hackathon simplification: signer must be the buyer (acts as admin)."
      ],
      "discriminator": [
        90,
        215,
        29,
        95,
        17,
        61,
        118,
        229
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Admin signer (buyer in hackathon scope)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tradeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "trade_account.buyer",
                "account": "tradeAccount"
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "Escrow vault holding the USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "winnerTokenAccount",
          "docs": [
            "Winner's USDC token account."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "tradeId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "winner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createTrade",
      "docs": [
        "Create a new trade escrow and deposit USDC from the buyer."
      ],
      "discriminator": [
        183,
        82,
        24,
        245,
        248,
        30,
        204,
        246
      ],
      "accounts": [
        {
          "name": "buyer",
          "docs": [
            "Buyer who initiates the trade and deposits USDC."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "docs": [
            "Seller's wallet (unchecked – just stored on the trade)."
          ]
        },
        {
          "name": "tradeAccount",
          "docs": [
            "Trade PDA – initialised here."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "Escrow vault – a PDA-owned token account that holds the USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "Vault authority PDA – signs for vault token transfers."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "buyerTokenAccount",
          "docs": [
            "Buyer's USDC token account (source of deposit)."
          ],
          "writable": true
        },
        {
          "name": "usdcMint",
          "docs": [
            "USDC mint."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tradeId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "amountUsdc",
          "type": "u64"
        },
        {
          "name": "milestoneHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "trackingId",
          "type": "string"
        },
        {
          "name": "carrier",
          "type": {
            "defined": {
              "name": "carrier"
            }
          }
        }
      ]
    },
    {
      "name": "openDispute",
      "docs": [
        "Open a dispute on a trade. Either the buyer or seller may call this",
        "while the trade is still Locked or Verified."
      ],
      "discriminator": [
        137,
        25,
        99,
        119,
        23,
        223,
        161,
        42
      ],
      "accounts": [
        {
          "name": "disputer",
          "docs": [
            "Either buyer or seller."
          ],
          "signer": true
        },
        {
          "name": "tradeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "trade_account.buyer",
                "account": "tradeAccount"
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tradeId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "releaseFunds",
      "docs": [
        "Release escrowed USDC to the seller once the milestone is verified.",
        "Permissionlessly callable – anyone can crank this after verification."
      ],
      "discriminator": [
        225,
        88,
        91,
        108,
        126,
        52,
        2,
        26
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Permissionless crank signer."
          ],
          "signer": true
        },
        {
          "name": "tradeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "trade_account.buyer",
                "account": "tradeAccount"
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "Escrow vault holding the USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "sellerTokenAccount",
          "docs": [
            "Seller's USDC token account (destination)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "tradeId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "submitProof",
      "docs": [
        "Submit a zkTLS proof to verify the carrier milestone."
      ],
      "discriminator": [
        54,
        241,
        46,
        84,
        4,
        212,
        46,
        94
      ],
      "accounts": [
        {
          "name": "submitter",
          "docs": [
            "Anyone can submit a proof on behalf of the trade."
          ],
          "signer": true
        },
        {
          "name": "tradeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "trade_account.buyer",
                "account": "tradeAccount"
              },
              {
                "kind": "arg",
                "path": "tradeId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tradeId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "zktlsProofBytes",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tradeAccount",
      "discriminator": [
        46,
        97,
        187,
        111,
        38,
        69,
        11,
        236
      ]
    }
  ],
  "events": [
    {
      "name": "tradeCreated",
      "discriminator": [
        110,
        86,
        122,
        20,
        81,
        78,
        181,
        72
      ]
    },
    {
      "name": "tradeDisputed",
      "discriminator": [
        62,
        77,
        216,
        232,
        31,
        153,
        79,
        74
      ]
    },
    {
      "name": "tradeProofSubmitted",
      "discriminator": [
        231,
        205,
        135,
        212,
        95,
        245,
        136,
        208
      ]
    },
    {
      "name": "tradeSettled",
      "discriminator": [
        22,
        119,
        166,
        225,
        175,
        53,
        93,
        216
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTradeStatus",
      "msg": "Trade is not in the required status for this operation"
    },
    {
      "code": 6001,
      "name": "unauthorizedAccess",
      "msg": "Signer is not authorized for this action"
    },
    {
      "code": 6002,
      "name": "invalidProof",
      "msg": "Submitted proof is invalid or empty"
    },
    {
      "code": 6003,
      "name": "deliveryNotProven",
      "msg": "Delivery milestone has not been proven yet"
    },
    {
      "code": 6004,
      "name": "invalidWinner",
      "msg": "Winner must be either the buyer or the seller"
    },
    {
      "code": 6005,
      "name": "trackingIdTooLong",
      "msg": "Tracking ID exceeds the 64-character limit"
    }
  ],
  "types": [
    {
      "name": "carrier",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "dhl"
          },
          {
            "name": "fedEx"
          },
          {
            "name": "maersk"
          },
          {
            "name": "ups"
          }
        ]
      }
    },
    {
      "name": "tradeAccount",
      "docs": [
        "Core state for a single trade escrow.",
        "PDA seeds: [\"trade\", buyer.key(), trade_id]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "amountUsdc",
            "docs": [
              "USDC amount with 6 decimals (e.g. 1_000_000 = 1 USDC)."
            ],
            "type": "u64"
          },
          {
            "name": "milestoneHash",
            "docs": [
              "SHA-256 hash of the expected carrier milestone status."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "trackingId",
            "docs": [
              "Carrier tracking identifier (max 64 chars)."
            ],
            "type": "string"
          },
          {
            "name": "carrier",
            "type": {
              "defined": {
                "name": "carrier"
              }
            }
          },
          {
            "name": "milestoneVerified",
            "type": "bool"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "tradeStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tradeCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "amountUsdc",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tradeDisputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "disputer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tradeProofSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "verifier",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tradeSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "amountUsdc",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tradeStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "locked"
          },
          {
            "name": "verified"
          },
          {
            "name": "released"
          },
          {
            "name": "disputed"
          }
        ]
      }
    }
  ]
};
