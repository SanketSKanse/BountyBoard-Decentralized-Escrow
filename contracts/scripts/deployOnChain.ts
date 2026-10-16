import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const { ethers } = await hre.network.connect();

    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error(
            "No deployer account found. Set DEPLOYER_PRIVATE_KEY in contracts/.env before deploying on-chain."
        );
    }

    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("====================================================");
    console.log("🚀 Starting BountyEscrow On-Chain Deployment");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log("Deployer Address:", deployer.address);
    console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
    console.log("====================================================");

    if (balance === 0n) {
        throw new Error(
            `\n❌ Deployer balance is 0 ETH on Chain ID ${chainId}.\n` +
            `Please claim testnet ETH from the faucet: https://console.optimism.io/faucet\n` +
            `Fund address: ${deployer.address} before deploying on-chain.\n`
        );
    }

    const arbiterAddress = process.env.ARBITER_ADDRESS?.trim() || deployer.address;
    console.log("Arbiter Address:", arbiterAddress);

    console.log("Deploying BountyEscrow contract...");
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const bountyEscrow = await BountyEscrow.deploy(arbiterAddress);

    console.log("Waiting for deployment transaction to be confirmed on-chain...");
    await bountyEscrow.waitForDeployment();

    const address = await bountyEscrow.getAddress();
    const deployTx = bountyEscrow.deploymentTransaction();
    const txHash = deployTx ? deployTx.hash : "N/A";

    console.log("====================================================");
    console.log("✅ BountyEscrow deployed successfully!");
    console.log("Contract Address:", address);
    console.log("Deployment Tx Hash:", txHash);

    if (chainId === 84532n) {
        console.log("BaseScan Contract: https://sepolia.basescan.org/address/" + address);
        if (txHash !== "N/A") {
            console.log("BaseScan Tx:       https://sepolia.basescan.org/tx/" + txHash);
        }
    } else if (chainId === 11155420n) {
        console.log("Optimism Contract: https://sepolia-optimism.etherscan.io/address/" + address);
        if (txHash !== "N/A") {
            console.log("Optimism Tx:       https://sepolia-optimism.etherscan.io/tx/" + txHash);
        }
    } else if (chainId === 11155111n) {
        console.log("Etherscan Contract: https://sepolia.etherscan.io/address/" + address);
        if (txHash !== "N/A") {
            console.log("Etherscan Tx:       https://sepolia.etherscan.io/tx/" + txHash);
        }
    } else {
        console.log(`Deployed to Chain ID ${chainId}`);
    }
    console.log("====================================================");

    // Export contract artifacts and address to frontend
    exportToFrontend(address, chainId);
}

function exportToFrontend(address: string, chainId: bigint) {
    const artifactPath = path.resolve(
        __dirname,
        "../artifacts/contracts/BountyEscrow.sol/BountyEscrow.json"
    );

    if (!fs.existsSync(artifactPath)) {
        console.warn("⚠️ Warning: Artifact file not found at", artifactPath);
        return;
    }

    const artifactContent = fs.readFileSync(artifactPath, "utf-8");
    const clientContractsDir = path.resolve(__dirname, "../../client/src/contracts");
    const serverContractsDir = path.resolve(__dirname, "../../server/src/contracts");

    if (fs.existsSync(clientContractsDir)) {
        // 1. Export JSON artifact to client
        fs.writeFileSync(
            path.join(clientContractsDir, "BountyEscrow.json"),
            artifactContent,
            "utf-8"
        );
        console.log("📦 Exported ABI artifact to client/src/contracts/BountyEscrow.json");

        // 2. Export updated config.ts with new address and chain ID
        const configPath = path.join(clientContractsDir, "config.ts");
        const configContent = `export type SupportedNetwork = {
    chainId: bigint;
    chainIdHex: string;
    chainName: string;
    rpcUrl: string;
    blockExplorerUrl: string;
    faucetUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
};

export const SUPPORTED_NETWORKS: Record<string, SupportedNetwork> = {
    '84532': {
        chainId: 84532n,
        chainIdHex: '0x14a34',
        chainName: 'Base Sepolia',
        rpcUrl: 'https://sepolia.base.org',
        blockExplorerUrl: 'https://sepolia.basescan.org',
        faucetUrl: 'https://console.optimism.io/faucet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    },
    '11155420': {
        chainId: 11155420n,
        chainIdHex: '0xaa37dc',
        chainName: 'Optimism Sepolia',
        rpcUrl: 'https://sepolia.optimism.io',
        blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
        faucetUrl: 'https://console.optimism.io/faucet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    },
};

export const BASE_SEPOLIA_CHAIN_ID = 84532n;
export const OP_SEPOLIA_CHAIN_ID = 11155420n;

export const BOUNTY_BOARD_CHAIN_ID = BigInt(
    (import.meta.env.VITE_CHAIN_ID as string) || '${chainId.toString()}'
);

export const BOUNTY_ESCROW_ADDRESS =
    (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
    '${address}';

export function isSupportedChainId(chainId: bigint | number | string | null | undefined): boolean {
    if (!chainId) return false;
    const str = chainId.toString();
    return str === '84532' || str === '11155420';
}

export function getNetworkConfig(chainId?: bigint | number | string | null): SupportedNetwork {
    const str = chainId?.toString();
    if (str && SUPPORTED_NETWORKS[str]) {
        return SUPPORTED_NETWORKS[str];
    }
    const defaultKey = BOUNTY_BOARD_CHAIN_ID.toString();
    return SUPPORTED_NETWORKS[defaultKey] || SUPPORTED_NETWORKS['84532'];
}

export function getExplorerAddressUrl(address: string, chainId?: bigint | number | string | null): string {
    const net = getNetworkConfig(chainId);
    return \`\${net.blockExplorerUrl}/address/\${address}\`;
}

export function getExplorerTxUrl(txHash: string, chainId?: bigint | number | string | null): string {
    const net = getNetworkConfig(chainId);
    return \`\${net.blockExplorerUrl}/tx/\${txHash}\`;
}
`;
        fs.writeFileSync(configPath, configContent, "utf-8");
        console.log("⚙️  Updated client/src/contracts/config.ts with contract address & chain ID");

        // 3. Export human-readable ABI
        const humanReadableAbiPath = path.join(clientContractsDir, "BountyEscrow.ts");
        const humanReadableContent = `export { BOUNTY_ESCROW_ADDRESS } from './config';

export const BOUNTY_ESCROW_ABI = [
    "function createBounty() payable",
    "function assignFreelancer(uint256 bountyId, address freelancer)",
    "function bountyCount() view returns (uint256)",
    "function arbiter() view returns (address)",
    "function bounties(uint256) view returns (address client, address freelancer, uint256 amount, uint256 remainingBalance, uint8 status)",
    "function cancelBounty(uint256 bountyId)",
    "function raiseDispute(uint256 bountyId)",
    "function resolveDispute(uint256 bountyId, uint256 clientRefund, uint256 freelancerPayout)",
    "function refundRemainder(uint256 bountyId)",
    "function createMilestone(uint256 bountyId, string description, uint256 amount)",
    "function approveMilestone(uint256 bountyId, uint256 milestoneId)",
    "function releasePayment(uint256 bountyId)",
    "function getMilestoneCount(uint256 bountyId) view returns (uint256)"
];
`;
        fs.writeFileSync(humanReadableAbiPath, humanReadableContent, "utf-8");
        console.log("📝 Updated client/src/contracts/BountyEscrow.ts");
    }

    if (fs.existsSync(serverContractsDir)) {
        fs.writeFileSync(
            path.join(serverContractsDir, "BountyEscrow.json"),
            artifactContent,
            "utf-8"
        );
        console.log("📦 Exported ABI artifact to server/src/contracts/BountyEscrow.json");
    }

    // 4. Update client/.env if present
    const clientEnvPath = path.resolve(__dirname, "../../client/.env");
    if (fs.existsSync(clientEnvPath)) {
        let envContent = fs.readFileSync(clientEnvPath, "utf-8");
        if (envContent.includes("VITE_CONTRACT_ADDRESS=")) {
            envContent = envContent.replace(
                /VITE_CONTRACT_ADDRESS=.*/g,
                `VITE_CONTRACT_ADDRESS=${address}`
            );
        } else {
            envContent += `\nVITE_CONTRACT_ADDRESS=${address}`;
        }
        if (envContent.includes("VITE_CHAIN_ID=")) {
            envContent = envContent.replace(
                /VITE_CHAIN_ID=.*/g,
                `VITE_CHAIN_ID=${chainId.toString()}`
            );
        } else {
            envContent += `\nVITE_CHAIN_ID=${chainId.toString()}`;
        }
        fs.writeFileSync(clientEnvPath, envContent, "utf-8");
        console.log("🌐 Updated client/.env with VITE_CONTRACT_ADDRESS and VITE_CHAIN_ID");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
