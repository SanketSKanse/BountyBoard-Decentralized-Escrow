# BountyBoard

BountyBoard is a decentralized bounty platform built around smart contract based escrow.

The project is being developed as a full stack Web3 application with a React frontend, Node.js backend, database layer, and Solidity smart contracts.

## Current Development Status

BountyBoard is currently being developed and tested in a local development environment.

The smart contracts are currently deployed and tested on a local Hardhat blockchain. The project has not yet been deployed to a public Ethereum testnet or mainnet.

The current local blockchain runs at:

```text
http://127.0.0.1:8545

At this stage, the primary focus is on developing, integrating, and testing the application locally before moving towards a public testnet deployment.

Project Architecture
The project is organized as a monorepo containing the frontend, backend, and smart contract workspaces.

BountyBoard
│
├── client
│   └── React frontend
│
├── server
│   └── Express backend
│
├── contracts
│   └── Solidity smart contracts
│
├── package.json
└── .env.example

Technology Stack
Frontend
React

TypeScript

Vite

Tailwind CSS

Ethers.js

Backend
Node.js

Express

TypeScript

Prisma

PostgreSQL

Ethers.js

Smart Contracts
Solidity

Hardhat

Ethers.js

Mocha

Chai

Smart Contract Development
The smart contract layer is currently being developed using Hardhat.

For development and testing, the project uses a local Hardhat blockchain instead of a public blockchain network.

This allows the contracts to be compiled, deployed, tested, and interacted with locally without using real funds or requiring a public testnet.

The current contract development flow is:

┌──────────────────────────┐
│     Solidity Contract    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│     Hardhat Compile      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Local Hardhat Blockchain│
│    127.0.0.1:8545        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Local Contract Deployment│
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Local Contract Address │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Application Interaction  │
└──────────────────────────┘

Local Blockchain
The project currently uses a local Ethereum compatible blockchain provided by Hardhat.

Start the local blockchain using:

npm run dev:chain

The local blockchain runs on:

127.0.0.1:8545

This local network is used for smart contract development, deployment, and testing.

No public blockchain deployment has been performed at this stage.

Local Contract Deployment
Once the local blockchain is running, the smart contract can be deployed to the local network using:

npm run deploy:local

The deployment process creates a local instance of the smart contract on the Hardhat blockchain.

The deployed contract address is then used by the application during local development.

The current deployment flow is:

┌─────────────────────────┐
│ Start Hardhat Node      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Deploy Smart Contract   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Contract Deployed Locally│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Local Contract Address  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Application Interaction │
└─────────────────────────┘

Smart Contract Testing
The smart contract workspace is configured with Hardhat for development and testing.

Run the contract tests using:

npm run test:contracts

The current testing environment allows the contract behaviour to be tested on the local development setup before moving towards a public testnet.

Frontend
The frontend is located inside the client workspace.

It is built using React, TypeScript, Vite, and Tailwind CSS.

Ethers.js is used for blockchain interaction from the frontend.

The frontend is currently part of the local development environment and is intended to interact with the locally deployed smart contract.

Backend
The backend is located inside the server workspace.

It is built using Node.js, Express, and TypeScript.

Prisma is used as the database ORM, with PostgreSQL used as the database layer.

The backend provides the off-chain application layer while the smart contract provides the blockchain layer.

Database
The project uses Prisma for database management.

Generate the Prisma client using:

npm run db:generate

Push the current Prisma schema to the configured database using:

npm run db:push

Running the Project Locally
1. Install Dependencies
npm install

2. Configure Environment Variables
Create the environment file:

cp .env.example .env

Configure the required environment variables inside .env.

3. Start the Local Blockchain
npm run dev:chain

The Hardhat blockchain will run locally on:

127.0.0.1:8545

4. Deploy the Smart Contract
npm run deploy:local

This deploys the smart contract to the local Hardhat network.

5. Start the Frontend and Backend
npm run dev

This starts the application development environment.

Complete Local Development Flow
The complete development process currently looks like this:

                 BountyBoard Development
                          │
                          ▼
                ┌──────────────────┐
                │ Install Packages │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Start Hardhat    │
                │ Local Blockchain │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Deploy Smart     │
                │ Contract Locally │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Start Backend    │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Start Frontend   │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Local Application│
                │   Interaction    │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Test Contract &  │
                │ Application Flow │
                └──────────────────┘

Current Project Scope
The current implementation establishes the foundation for the decentralized bounty and escrow application.

The project currently includes:

React based frontend setup

Express based backend setup

Prisma database integration

Solidity smart contract workspace

Hardhat development environment

Local Ethereum compatible blockchain

Local smart contract deployment

Smart contract testing setup

Ethers.js integration

TypeScript configuration across the project

The project is currently focused on local development and testing.

Blockchain Deployment Status
Component	Current Status
Hardhat Local Blockchain	Active
Local Contract Deployment	Active
Local Contract Testing	In Progress
Frontend Integration	In Progress
Backend Integration	In Progress
Public Testnet Deployment	Not Started
Mainnet Deployment	Not Started

Current Environment
Blockchain Network
        │
        ▼
┌────────────────────────────┐
│      Hardhat Localnet      │
│                            │
│      127.0.0.1:8545        │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│    Locally Deployed        │
│    Smart Contract          │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│      BountyBoard App       │
│                            │
│  React + Express + Prisma  │
└────────────────────────────┘

Build
Build the frontend and backend using:

npm run build

Type Checking
Run TypeScript type checking across the project using:

npm run typecheck

Development Status
The project is currently in the local development phase.

The current development environment consists of:

Local Hardhat Blockchain
          │
          ▼
Local Smart Contract
          │
          ▼
Backend
          │
          ▼
Database
          │
          ▼
React Frontend

The smart contract is currently not deployed to a public testnet or mainnet.

All current blockchain development and testing is performed locally.

Next Development Stage
After completing and validating the local implementation, the next stage will be moving the smart contract to a public testnet.

The expected progression is:

┌─────────────────────────┐
│   Local Development     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Local Contract Testing  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Frontend & Backend      │
│ Integration             │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Public Testnet          │
│ Deployment              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Testnet Testing         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Production Preparation  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Mainnet Deployment      │
└─────────────────────────┘

Security
The current contracts are intended for local development and testing.

Do not use real funds with the current local deployment.

Private keys, wallet seed phrases, API keys, database credentials, and other sensitive information should never be committed to the repository.

A production deployment should only be considered after appropriate testing, security review, and contract auditing.

License
This project is currently under development. License information will be added when the project reaches its intended release stage.
