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
        localhost: {
            type: 'http',
            url: process.env.RPC_URL ?? 'http://127.0.0.1:8545',
        },
        sepolia: {
            type: 'http',
            url: process.env.SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org',
            accounts,
        },
        baseSepolia: {
            type: 'http',
            url: process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org',
            accounts,
        },
    },
});