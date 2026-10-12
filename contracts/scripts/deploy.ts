import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error(
            "No deployer account found. Set DEPLOYER_PRIVATE_KEY in .env before deploying on-chain."
        );
    }

    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("====================================================");
    console.log("🚀 Starting BountyEscrow On-Chain Deployment");
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log("Deployer Address:", deployer.address);
    console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
    console.log("====================================================");

    if (balance === 0n) {
        console.warn("⚠️ Warning: Deployer balance is 0 ETH. Transaction may fail if gas cannot be paid.");
    }

    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const bountyEscrow = await BountyEscrow.deploy();

    console.log("Waiting for contract deployment transaction...");
    await bountyEscrow.waitForDeployment();

    const address = await bountyEscrow.getAddress();
    console.log("====================================================");
    console.log("✅ BountyEscrow deployed successfully!");
    console.log("Contract Address:", address);

    if (network.chainId === 84532n) {
        console.log("BaseScan Explorer: https://sepolia.basescan.org/address/" + address);
    } else if (network.chainId === 11155420n) {
        console.log("Optimism Explorer: https://sepolia-optimism.etherscan.io/address/" + address);
    } else if (network.chainId === 11155111n) {
        console.log("Etherscan Explorer: https://sepolia.etherscan.io/address/" + address);
    }
    console.log("====================================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});