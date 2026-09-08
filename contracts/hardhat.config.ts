import { defineConfig } from 'hardhat/config';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatMocha from '@nomicfoundation/hardhat-mocha';
import 'dotenv/config';

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
    },
});