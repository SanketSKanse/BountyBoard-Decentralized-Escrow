# BountyBoard

BountyBoard is a decentralized bounty platform built around smart contract based escrow.

The project is being developed as a full stack Web3 application with a React frontend, Node.js backend, database layer, and Solidity smart contracts.

## Architecture Overview

The repository is organized as a monorepo containing three core workspaces:

```text
BountyBoard
│
├── client/        # React + Vite + Tailwind CSS + Ethers.js
├── server/        # Node.js + Express + TypeScript + Prisma (PostgreSQL)
├── contracts/     # Solidity smart contracts + deployment scripts + tests
├── package.json   # Workspace orchestration
└── .env.example   # Environment variables reference
```

---

## Supported Blockchain Networks & Faucets

BountyBoard targets live Ethereum Layer-2 testnets for rapid block finality and minimal gas costs:

| Network | Chain ID | RPC Endpoint | Block Explorer | Free Testnet Faucets |
| :--- | :--- | :--- | :--- | :--- |
| **Base Sepolia** | `84532` | `https://sepolia.base.org` | [sepolia.basescan.org](https://sepolia.basescan.org) | • [Optimism Superchain Faucet](https://console.optimism.io/faucet)<br>• [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) |
| **Optimism Sepolia** | `11155420` | `https://sepolia.optimism.io` | [sepolia-optimism.etherscan.io](https://sepolia-optimism.etherscan.io) | • [Optimism Console Faucet](https://console.optimism.io/faucet) |
| **Ethereum Sepolia** | `11155111` | `https://rpc.sepolia.org` | [sepolia.etherscan.io](https://sepolia.etherscan.io) | • [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)<br>• [Alchemy Faucet](https://sepoliafaucet.com/) |

---

## Smart Contract Development & Deployment

### 1. Compile Contracts
```bash
npm run compile --workspace contracts
```

### 2. Run Automated Contract Tests
Run the comprehensive smart contract test suite offline (runs in-memory via Hardhat):
```bash
npm run test:contracts
```

### 3. Deploy On-Chain
Deploy the smart contract directly to the desired testnet:

```bash
# Deploy to Base Sepolia
npm run deploy:base

# Deploy to Optimism Sepolia
npm run deploy:op

# Deploy to Ethereum Sepolia
npm run deploy:sepolia
```

Deployment output will log the deployer account, balance, newly deployed contract address, and a direct link to the corresponding block explorer.

---

## Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` into each service:
```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
cp contracts/.env.example contracts/.env
```

Ensure `contracts/.env` has `DEPLOYER_PRIVATE_KEY` funded with testnet ETH from [console.optimism.io/faucet](https://console.optimism.io/faucet).

### 3. Database Setup
```bash
npm run db:generate
npm run db:push
```

### 4. Start Development Servers
Run frontend and backend simultaneously:
```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## Quality & Verification

- **Type Checking**:
  ```bash
  npm run typecheck
  ```
- **Build**:
  ```bash
  npm run build
  ```
- **Pre-Commit Guard**:
  Git hooks safeguard against committing private keys or pushing code with broken tests.

---

## License
MIT
