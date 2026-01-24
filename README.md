# Decentralized Voting System

A secure, transparent, and tamper-proof voting system built on the Solana blockchain using the Anchor framework.

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/samar-58/decentralized-voting.git
cd decentralized-voting
yarn install

# Build and test
anchor build
anchor test
```

## 📋 Features

- **Create Polls** - Custom questions with 2-10 options and time scheduling
- **Cast Votes** - One vote per wallet, recorded on-chain
- **Time-Based Validation** - Automatic start/end time enforcement
- **Creator Control** - Only creators can close their polls
- **Transparent Results** - Publicly verifiable on Solana blockchain

## 🛠️ Tech Stack

- **Blockchain**: Solana
- **Framework**: Anchor v0.31.1
- **Languages**: Rust (Program), TypeScript (Tests)
- **Testing**: Mocha + Chai

## 📁 Project Structure

```
├── programs/decentralized-voting/src/lib.rs  # Main program
├── tests/decentralized-voting.ts             # Test suite
├── migrations/deploy.ts                      # Deployment
├── Anchor.toml                              # Anchor config
└── package.json                             # Dependencies
```

## 🔧 Prerequisites

- Rust (latest stable)
- Solana CLI (v1.18+)
- Anchor CLI (v0.31.1)
- Node.js (v18+) & Yarn

## 📖 Program Instructions

### Create Poll
```rust
create_poll(
    poll_id: u64,
    question: String,
    options: Vec<String>,
    start_time: i64,
    end_time: i64
)
```

### Vote
```rust
vote(choice_index: u8)
```

### Close Poll
```rust
close_poll() // Creator only
```

## 🔒 Security Features

- PDA-based account derivation
- One vote per wallet enforcement
- Time-based voting windows
- Creator-only poll closure
- Signer verification for all operations

## 🧪 Testing

```bash
# Run all tests
anchor test

# Test coverage includes:
# - Poll creation (success/error)
# - Voting mechanics
# - Time validations
# - Authorization checks
# - Duplicate prevention
```

## 📊 Account Structure

### Poll Account
```rust
struct Poll {
    creator: Pubkey,
    poll_id: u64,
    question: String,
    options: Vec<String>,
    vote_counts: Vec<u64>,
    start_time: i64,
    end_time: i64,
    is_closed: bool,
    bump: u8,
}
```

### Vote Record Account
```rust
struct VoteRecord {
    poll: Pubkey,
    voter: Pubkey,
    choice_index: u8,
    bump: u8,
}
```

## 🤝 Contributing

Contributions welcome! Submit a Pull Request.

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Solana](https://solana.com/) - High-performance blockchain
- [Anchor](https://www.anchor-lang.com/) - Solana development framework