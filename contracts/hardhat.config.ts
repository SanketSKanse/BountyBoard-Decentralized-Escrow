import { defineConfig } from 'hardhat/config';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatMocha from '@nomicfoundation/hardhat-mocha';
import 'dotenv/config';

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
const accounts = deployerKey
    ? [deployerKey.startsWith('0x') ? deployerKey : `0x${deployerKey}`]
    : [];

export default defineConfig({
    plugins: [hardhatEthers, hardhatMocha],
    solidity: '0.8.24',
    networks: {
        hardhat: {
            type: 'edr-simulated',
        },
        baseSepolia: {
            type: 'http',
            url: process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org',
            chainId: 84532,
            accounts,
        },
        optimismSepolia: {
            type: 'http',
            url: process.env.OP_SEPOLIA_RPC_URL ?? 'https://sepolia.optimism.io',
            chainId: 11155420,
            accounts,
        },
        sepolia: {
            type: 'http',
            url: process.env.SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org',
            chainId: 11155111,
            accounts,
        },
    },
});