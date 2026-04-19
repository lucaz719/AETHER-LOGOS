/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/prediction_market.json`.
 */
export type PredictionMarket = {
  "address": "BWvCzv6ZymKHRqVGFxWeEekvgiN1hvDKDg1C3LHEPpYX",
  "metadata": {
    "name": "predictionMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AETHER-LOGOS Prediction Market Program"
  },
  "instructions": [
    {
      "name": "claimWinnings",
      "docs": [
        "Claim proportional winnings from a resolved market."
      ],
      "discriminator": [
        161,
        215,
        24,
        59,
        14,
        236,
        242,
        221
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "The user claiming winnings."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAccount",
          "docs": [
            "The resolved market."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market_account.shipment_twin",
                "account": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "hedgePosition",
          "docs": [
            "User's position."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "marketAccount"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "docs": [
            "Market vault holding staked USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "marketAuthority",
          "docs": [
            "Market authority PDA – signs for vault token transfers."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
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
              },
              {
                "kind": "account",
                "path": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's USDC token account (destination for winnings)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createMarket",
      "docs": [
        "Create a new hedge market for a specific shipment digital twin."
      ],
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "creator",
          "docs": [
            "Creator who pays for account rent and can later resolve the market."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "shipmentTwin",
          "docs": [
            "The shipment digital-twin reference (compressed NFT asset id)."
          ]
        },
        {
          "name": "marketAccount",
          "docs": [
            "Market PDA – initialised here."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "shipmentTwin"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "docs": [
            "Market vault – PDA token account holding staked USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "marketAuthority",
          "docs": [
            "Market authority PDA – signs for vault token transfers."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
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
              },
              {
                "kind": "account",
                "path": "marketAccount"
              }
            ]
          }
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
          "name": "question",
          "type": "string"
        },
        {
          "name": "resolutionTime",
          "type": "i64"
        },
        {
          "name": "protocolFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "placeHedge",
      "docs": [
        "Stake USDC on the Yes or No side of a market.",
        "Creates the position PDA on first call (init-if-needed)."
      ],
      "discriminator": [
        147,
        167,
        115,
        90,
        190,
        29,
        124,
        17
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "User placing the hedge."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAccount",
          "docs": [
            "The market being bet on."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market_account.shipment_twin",
                "account": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "hedgePosition",
          "docs": [
            "User's position PDA – created on first hedge via init-if-needed."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "marketAccount"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "docs": [
            "Market vault holding staked USDC."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's USDC token account (source of stake)."
          ],
          "writable": true
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
          "name": "side",
          "type": {
            "defined": {
              "name": "side"
            }
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resolveMarket",
      "docs": [
        "Resolve the market by declaring an outcome.",
        "Only the creator may resolve (hackathon scope)."
      ],
      "discriminator": [
        155,
        23,
        80,
        173,
        46,
        74,
        23,
        239
      ],
      "accounts": [
        {
          "name": "creator",
          "docs": [
            "Only the original creator may resolve."
          ],
          "signer": true
        },
        {
          "name": "marketAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market_account.shipment_twin",
                "account": "marketAccount"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "hedgePosition",
      "discriminator": [
        88,
        83,
        42,
        238,
        125,
        99,
        252,
        52
      ]
    },
    {
      "name": "marketAccount",
      "discriminator": [
        201,
        78,
        187,
        225,
        240,
        198,
        201,
        251
      ]
    }
  ],
  "events": [
    {
      "name": "hedgePlaced",
      "discriminator": [
        174,
        169,
        216,
        73,
        202,
        80,
        114,
        78
      ]
    },
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "winningsClaimed",
      "discriminator": [
        187,
        184,
        29,
        196,
        54,
        117,
        70,
        150
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketNotOpen",
      "msg": "Market is not open"
    },
    {
      "code": 6001,
      "name": "marketNotResolved",
      "msg": "Market is not yet resolved"
    },
    {
      "code": 6002,
      "name": "invalidResolutionTime",
      "msg": "Resolution time must be in the future"
    },
    {
      "code": 6003,
      "name": "questionTooLong",
      "msg": "Question exceeds the 128-character limit"
    },
    {
      "code": 6004,
      "name": "feeTooHigh",
      "msg": "Protocol fee exceeds the 10 % maximum (1000 bps)"
    },
    {
      "code": 6005,
      "name": "alreadyClaimed",
      "msg": "Winnings have already been claimed"
    },
    {
      "code": 6006,
      "name": "positionNotWinning",
      "msg": "Position is not on the winning side"
    },
    {
      "code": 6007,
      "name": "insufficientAmount",
      "msg": "Stake amount must be greater than zero"
    },
    {
      "code": 6008,
      "name": "unauthorizedResolver",
      "msg": "Only the market creator can resolve"
    },
    {
      "code": 6009,
      "name": "zeroPayout",
      "msg": "Computed payout is zero"
    }
  ],
  "types": [
    {
      "name": "hedgePlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "side"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "hedgePosition",
      "docs": [
        "A user's hedge position within a specific market.",
        "PDA seeds: [\"position\", market pubkey, user pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "side"
              }
            }
          },
          {
            "name": "amount",
            "docs": [
              "USDC amount staked."
            ],
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketAccount",
      "docs": [
        "Parimutuel prediction market tied to a shipment digital twin.",
        "PDA seeds: [\"market\", shipment_twin pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentTwin",
            "docs": [
              "The compressed-NFT / shipment reference this market hedges against."
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "The wallet that created (and can resolve) this market."
            ],
            "type": "pubkey"
          },
          {
            "name": "question",
            "docs": [
              "Human-readable question (max 128 chars)."
            ],
            "type": "string"
          },
          {
            "name": "resolutionTime",
            "docs": [
              "Unix timestamp after which the market may be resolved."
            ],
            "type": "i64"
          },
          {
            "name": "totalYes",
            "docs": [
              "Total USDC staked on the Yes side."
            ],
            "type": "u64"
          },
          {
            "name": "totalNo",
            "docs": [
              "Total USDC staked on the No side."
            ],
            "type": "u64"
          },
          {
            "name": "outcome",
            "docs": [
              "None while open; Some(true) = Yes won, Some(false) = No won."
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "marketStatus"
              }
            }
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Protocol fee in basis points (e.g. 200 = 2%)."
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "question",
            "type": "string"
          },
          {
            "name": "resolutionTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "marketStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "resolved"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "yes"
          },
          {
            "name": "no"
          }
        ]
      }
    },
    {
      "name": "winningsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
