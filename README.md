#  Decentralized Voting

A secure, transparent, and tamper-proof voting system built on the Solana blockchain using the Anchor framework.

## Features

- **Create Polls** - Anyone can create a poll with 2-10 options, custom questions, and scheduled start/end times
- **Cast Votes** - Users can vote on active polls with their choice recorded on-chain
- **One Vote Per User** - Each wallet can only vote once per poll, enforced by PDA constraints
- **Time-Based Validation** - Polls automatically enforce start and end time restrictions
- **Creator-Only Close** - Only poll creators can close their polls after the end time
- **Transparent Results** - All votes and results are publicly verifiable on the blockchain

## Tech Stack

- **Blockchain**: Solana
- **Framework**: Anchor v0.31.1
- **Language**: Rust (Program) / TypeScript (Tests)
- **Testing**: Mocha + Chai

## 📋 Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.31.1)
- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/samar-58/decentralized-voting.git
cd decentralized-voting
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Build the program

```bash
anchor build
```

### 4. Update the program ID

After building, get your program ID:

```bash
solana address -k target/deploy/decentralized_voting-keypair.json
```

Update the program ID in:
- `programs/decentralized-voting/src/lib.rs` (line 3)
- `Anchor.toml` (under `[programs.localnet]`)

### 5. Build again with the correct program ID

```bash
anchor build
```

### 6. Run tests

```bash
anchor test
```

##  Program Instructions

### `create_poll`

Creates a new poll with the specified parameters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `poll_id` | `u64` | Unique identifier for the poll |
| `question` | `String` | Poll question (max 200 chars) |
| `options` | `Vec<String>` | Answer options (2-10 options) |
| `start_time` | `i64` | Unix timestamp when voting starts |
| `end_time` | `i64` | Unix timestamp when voting ends |

### `vote`

Casts a vote on an active poll.

| Parameter | Type | Description |
|-----------|------|-------------|
| `choice_index` | `u8` | Index of the chosen option |

### `close_poll`

Closes a poll after its end time (creator only).

*No parameters required*

## 🏗️ Account Structure

### Poll Account

```rust
pub struct Poll {
    pub creator: Pubkey,      // Poll creator's public key
    pub poll_id: u64,         // Unique poll identifier
    pub question: String,     // Poll question
    pub options: Vec<String>, // Answer options
    pub vote_counts: Vec<u64>,// Vote count per option
    pub start_time: i64,      // Voting start time
    pub end_time: i64,        // Voting end time
    pub is_closed: bool,      // Whether poll is closed
    pub bump: u8,             // PDA bump seed
}
```

### Vote Record Account

```rust
pub struct VoteRecord {
    pub poll: Pubkey,      // Poll public key
    pub voter: Pubkey,     // Voter's public key
    pub choice_index: u8,  // Index of chosen option
    pub bump: u8,          // PDA bump seed
}
```

##  Security Features

- **PDA-based accounts** - All accounts are derived using Program Derived Addresses
- **Signer verification** - Only authorized signers can perform actions
- **Time validation** - Votes only accepted during active poll period
- **Duplicate vote prevention** - One vote per wallet enforced by unique PDA seeds
- **Creator authorization** - Only creators can close their polls

##  Test Coverage

The test suite includes 19 comprehensive tests covering:

- ✔️ Poll creation (success and error cases)
- ✔️ Voting (success and error cases)
- ✔️ Poll closing (success and error cases)
- ✔️ Multiple voter tracking
- ✔️ Duplicate vote prevention
- ✔️ Time-based validations
- ✔️ Authorization checks

Run tests with:

```bash
anchor test
```

##  Project Structure

```
decentralized-voting/
├── programs/
│   └── decentralized-voting/
│       └── src/
│           └── lib.rs          # Solana program code
├── tests/
│   └── decentralized-voting.ts # Test suite
├── migrations/
│   └── deploy.ts               # Deployment script
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Rust dependencies
└── package.json                # Node.js dependencies
```

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  License

This project is open source and available under the [MIT License](LICENSE).

##  Acknowledgments

- [Solana](https://solana.com/) - High-performance blockchain
- [Anchor](https://www.anchor-lang.com/) - Solana development framework
