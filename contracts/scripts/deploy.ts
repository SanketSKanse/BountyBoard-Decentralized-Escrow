import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error(
            "No deployer account found. Set DEPLOYER_PRIVATE_KEY in .env or run against local network."
        );
    }

    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("====================================================");
    console.log("🚀 Starting BountyEscrow Deployment");
    console.log("Deployer Address:", deployer.address);
    console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
    console.log("====================================================");

    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const bountyEscrow = await BountyEscrow.deploy();

    console.log("Waiting for contract deployment transaction...");
    await bountyEscrow.waitForDeployment();

    const address = await bountyEscrow.getAddress();
    console.log("====================================================");
    console.log("✅ BountyEscrow deployed successfully!");
    console.log("Contract Address:", address);
    console.log("====================================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});