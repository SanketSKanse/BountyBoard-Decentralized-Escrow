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
    const treasuryAddress = process.env.TREASURY_ADDRESS?.trim() || deployer.address;
    console.log("Arbiter Address:", arbiterAddress);
    console.log("Treasury Address:", treasuryAddress);

    console.log("1. Deploying BountyCredentialNFT contract...");
    const BountyCredentialNFT = await ethers.getContractFactory("BountyCredentialNFT");
    const credentialNFT = await BountyCredentialNFT.deploy(deployer.address);
    await credentialNFT.waitForDeployment();
    const credentialNFTAddress = await credentialNFT.getAddress();
    console.log("✅ BountyCredentialNFT deployed at:", credentialNFTAddress);

    console.log("2. Deploying BountyEscrow contract...");
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const bountyEscrow = await BountyEscrow.deploy(arbiterAddress, treasuryAddress);
    await bountyEscrow.waitForDeployment();
    const address = await bountyEscrow.getAddress();
    const deployTx = bountyEscrow.deploymentTransaction();
    const txHash = deployTx ? deployTx.hash : "N/A";
    console.log("✅ BountyEscrow deployed at:", address);

    console.log("3. Linking Escrow on BountyCredentialNFT...");
    const setEscrowTx = await credentialNFT.setEscrowContract(address);
    await setEscrowTx.wait();
    console.log("✅ Escrow contract linked on BountyCredentialNFT");

    console.log("4. Linking Credential NFT on BountyEscrow...");
    const setCredTx = await bountyEscrow.setCredentialNFT(credentialNFTAddress);
    await setCredTx.wait();
    console.log("✅ Credential NFT linked on BountyEscrow");

    console.log("====================================================");
    console.log("🎉 All contracts deployed and configured successfully!");
    console.log("BountyEscrow Address:       ", address);
    console.log("Credential NFT Address:     ", credentialNFTAddress);
    console.log("Deployment Tx Hash:         ", txHash);

    if (chainId === 84532n) {
        console.log("BaseScan Escrow:     https://sepolia.basescan.org/address/" + address);
        console.log("BaseScan Credential: https://sepolia.basescan.org/address/" + credentialNFTAddress);
        if (txHash !== "N/A") {
            console.log("BaseScan Tx:         https://sepolia.basescan.org/tx/" + txHash);
        }
    } else if (chainId === 11155420n) {
        console.log("Optimism Escrow:     https://sepolia-optimism.etherscan.io/address/" + address);
        console.log("Optimism Credential: https://sepolia-optimism.etherscan.io/address/" + credentialNFTAddress);
        if (txHash !== "N/A") {
            console.log("Optimism Tx:         https://sepolia-optimism.etherscan.io/tx/" + txHash);
        }
    } else if (chainId === 11155111n) {
        console.log("Etherscan Escrow:     https://sepolia.etherscan.io/address/" + address);
        console.log("Etherscan Credential: https://sepolia.etherscan.io/address/" + credentialNFTAddress);
        if (txHash !== "N/A") {
            console.log("Etherscan Tx:         https://sepolia.etherscan.io/tx/" + txHash);
        }
    } else {
        console.log(`Deployed to Chain ID ${chainId}`);
    }
    console.log("====================================================");

    // Export contract artifacts and address to frontend
    exportToFrontend(address, credentialNFTAddress, chainId);
}

function exportToFrontend(address: string, credentialNFTAddress: string, chainId: bigint) {
    const escrowArtifactPath = path.resolve(
        __dirname,
        "../artifacts/contracts/BountyEscrow.sol/BountyEscrow.json"
    );
    const credentialArtifactPath = path.resolve(
        __dirname,
        "../artifacts/contracts/BountyCredentialNFT.sol/BountyCredentialNFT.json"
    );

    const clientContractsDir = path.resolve(__dirname, "../../client/src/contracts");
    const serverContractsDir = path.resolve(__dirname, "../../server/src/contracts");

    if (fs.existsSync(escrowArtifactPath)) {
        const escrowArtifactContent = fs.readFileSync(escrowArtifactPath, "utf-8");
        if (fs.existsSync(clientContractsDir)) {
            fs.writeFileSync(
                path.join(clientContractsDir, "BountyEscrow.json"),
                escrowArtifactContent,
                "utf-8"
            );
        }
        if (fs.existsSync(serverContractsDir)) {
            fs.writeFileSync(
                path.join(serverContractsDir, "BountyEscrow.json"),
                escrowArtifactContent,
                "utf-8"
            );
        }
    }

    if (fs.existsSync(credentialArtifactPath)) {
        const credentialArtifactContent = fs.readFileSync(credentialArtifactPath, "utf-8");
        if (fs.existsSync(clientContractsDir)) {
            fs.writeFileSync(
                path.join(clientContractsDir, "BountyCredentialNFT.json"),
                credentialArtifactContent,
                "utf-8"
            );
        }
        if (fs.existsSync(serverContractsDir)) {
            fs.writeFileSync(
                path.join(serverContractsDir, "BountyCredentialNFT.json"),
                credentialArtifactContent,
                "utf-8"
            );
        }
        console.log("📦 Exported ABI artifacts to client and server contract folders");
    }

    if (fs.existsSync(clientContractsDir)) {
        // 1. Export updated config.ts with new address and chain ID
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

export const BOUNTY_CREDENTIAL_NFT_ADDRESS =
    (import.meta.env.VITE_CREDENTIAL_NFT_ADDRESS as string) ||
    '${credentialNFTAddress}';

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

export const USDC_ADDRESSES: Record<string, string> = {
    '84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    '11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
};

export function getUsdcAddress(chainId?: bigint | number | string | null): string {
    const str = chainId?.toString();
    if (str && USDC_ADDRESSES[str]) {
        return USDC_ADDRESSES[str];
    }
    const defaultKey = BOUNTY_BOARD_CHAIN_ID.toString();
    return USDC_ADDRESSES[defaultKey] || USDC_ADDRESSES['84532'];
}

export const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
];
`;
        fs.writeFileSync(configPath, configContent, "utf-8");
        console.log("⚙️  Updated client/src/contracts/config.ts with contract addresses & chain ID");

        // 2. Export human-readable Escrow ABI
        const humanReadableAbiPath = path.join(clientContractsDir, "BountyEscrow.ts");
        const humanReadableContent = `export { BOUNTY_ESCROW_ADDRESS } from './config';

export const BOUNTY_ESCROW_ABI = [
    "function createBounty() payable",
    "function createBountyWithDeadline(uint256 deadline) payable",
    "function createTokenBounty(address token, uint256 amount) returns (uint256)",
    "function createTokenBountyWithDeadline(address token, uint256 amount, uint256 deadline) returns (uint256)",
    "function assignFreelancer(uint256 bountyId, address freelancer)",
    "function bountyCount() view returns (uint256)",
    "function arbiter() view returns (address)",
    "function treasury() view returns (address)",
    "function PROTOCOL_FEE_BPS() view returns (uint256)",
    "function BPS_DENOMINATOR() view returns (uint256)",
    "function bountyTokens(uint256) view returns (address)",
    "function bounties(uint256) view returns (address client, address freelancer, uint256 amount, uint256 remainingBalance, uint8 status)",
    "function bountyDeliverables(uint256) view returns (string)",
    "function bountySubmittedAt(uint256) view returns (uint256)",
    "function bountyDeadlines(uint256) view returns (uint256)",
    "function cancelBounty(uint256 bountyId)",
    "function raiseDispute(uint256 bountyId)",
    "function resolveDispute(uint256 bountyId, uint256 clientRefund, uint256 freelancerPayout)",
    "function refundRemainder(uint256 bountyId)",
    "function createMilestone(uint256 bountyId, string description, uint256 amount)",
    "function approveMilestone(uint256 bountyId, uint256 milestoneId)",
    "function releasePayment(uint256 bountyId)",
    "function submitWork(uint256 bountyId, string deliverableUri)",
    "function setDeadline(uint256 bountyId, uint256 deadline)",
    "function claimExpiredRefund(uint256 bountyId)",
    "function getMilestoneCount(uint256 bountyId) view returns (uint256)",
    "function credentialNFT() view returns (address)",
    "function setCredentialNFT(address _credentialNFT)",
    "event CredentialMinted(uint256 indexed bountyId, address indexed freelancer, uint256 tokenId)"
];
`;
        fs.writeFileSync(humanReadableAbiPath, humanReadableContent, "utf-8");

        // 3. Export human-readable Credential NFT ABI
        const credentialAbiPath = path.join(clientContractsDir, "BountyCredentialNFT.ts");
        const credentialAbiContent = `export { BOUNTY_CREDENTIAL_NFT_ADDRESS } from './config';

export const BOUNTY_CREDENTIAL_NFT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function bountyToTokenId(uint256 bountyId) view returns (uint256)",
    "function totalCredentials() view returns (uint256)",
    "function credentials(uint256 tokenId) view returns (uint256 bountyId, address recipient, uint256 amount, address token, uint256 completedAt)",
    "function getCredential(uint256 tokenId) view returns (tuple(uint256 bountyId, address recipient, uint256 amount, address token, uint256 completedAt))",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event CredentialMinted(uint256 indexed tokenId, uint256 indexed bountyId, address indexed recipient, uint256 amount, address token, uint256 completedAt)"
];
`;
        fs.writeFileSync(credentialAbiPath, credentialAbiContent, "utf-8");
        console.log("📝 Updated client contract ABIs");
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
        if (envContent.includes("VITE_CREDENTIAL_NFT_ADDRESS=")) {
            envContent = envContent.replace(
                /VITE_CREDENTIAL_NFT_ADDRESS=.*/g,
                `VITE_CREDENTIAL_NFT_ADDRESS=${credentialNFTAddress}`
            );
        } else {
            envContent += `\nVITE_CREDENTIAL_NFT_ADDRESS=${credentialNFTAddress}`;
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
        console.log("🌐 Updated client/.env with contract addresses and chain ID");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
