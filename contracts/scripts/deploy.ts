import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const [deployer] = await ethers.getSigners();

    console.log("Deploying BountyEscrow...");
    console.log("Deployer:", deployer.address);

    const BountyEscrow =
        await ethers.getContractFactory("BountyEscrow");

    const bountyEscrow =
        await BountyEscrow.deploy();

    await bountyEscrow.waitForDeployment();

    const address =
        await bountyEscrow.getAddress();

    console.log("BountyEscrow deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});