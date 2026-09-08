import { expect } from "chai";
import hre from "hardhat";

describe("BountyEscrow", function () {
    it("should create a bounty and store the correct information", async function () {
        const { ethers } = await hre.network.connect();

        const [client] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const tx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await tx.wait();

        expect(await bountyEscrow.bountyCount()).to.equal(1n);

        const bounty = await bountyEscrow.bounties(1);

        expect(bounty.client).to.equal(client.address);
        expect(bounty.amount).to.equal(bountyAmount);
        expect(bounty.completed).to.equal(false);
    });

    it("should reject a bounty with zero ETH", async function () {
        const { ethers } = await hre.network.connect();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        try {
            await bountyEscrow.createBounty({
                value: 0,
            });

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Bounty amount must be greater than 0"
            );
        }
    });

    it("should create multiple bounties with unique IDs", async function () {
        const { ethers } = await hre.network.connect();

        const [client] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const firstAmount = ethers.parseEther("1");
        const secondAmount = ethers.parseEther("2");

        const tx1 = await bountyEscrow.createBounty({
            value: firstAmount,
        });

        await tx1.wait();

        const tx2 = await bountyEscrow.createBounty({
            value: secondAmount,
        });

        await tx2.wait();

        expect(await bountyEscrow.bountyCount()).to.equal(2n);

        const firstBounty = await bountyEscrow.bounties(1);
        const secondBounty = await bountyEscrow.bounties(2);

        expect(firstBounty.client).to.equal(client.address);
        expect(firstBounty.amount).to.equal(firstAmount);

        expect(secondBounty.client).to.equal(client.address);
        expect(secondBounty.amount).to.equal(secondAmount);

        expect(firstBounty.completed).to.equal(false);
        expect(secondBounty.completed).to.equal(false);
    });

    it("should hold the bounty ETH inside the contract", async function () {
        const { ethers } = await hre.network.connect();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const tx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await tx.wait();

        const contractBalance =
            await ethers.provider.getBalance(
                await bountyEscrow.getAddress()
            );

        expect(contractBalance).to.equal(bountyAmount);
    });

    it("should allow the client to assign a freelancer", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const bounty = await bountyEscrow.bounties(1);

        expect(bounty.client).to.equal(client.address);
        expect(bounty.freelancer).to.equal(freelancer.address);
        expect(bounty.amount).to.equal(bountyAmount);
        expect(bounty.completed).to.equal(false);
    });

    it("should prevent anyone other than the client from assigning a freelancer", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer, attacker] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        try {
            await bountyEscrow
                .connect(attacker)
                .assignFreelancer(1, freelancer.address);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Only client can assign freelancer"
            );
        }
    });

    it("should release the bounty payment to the freelancer", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const balanceBefore =
            await ethers.provider.getBalance(
                freelancer.address
            );

        const releaseTx = await bountyEscrow.releasePayment(1);

        await releaseTx.wait();

        const balanceAfter =
            await ethers.provider.getBalance(
                freelancer.address
            );

        expect(balanceAfter - balanceBefore).to.equal(
            bountyAmount
        );

        const contractBalance =
            await ethers.provider.getBalance(
                await bountyEscrow.getAddress()
            );

        expect(contractBalance).to.equal(0n);

        const bounty = await bountyEscrow.bounties(1);

        expect(bounty.completed).to.equal(true);
    });

    it("should prevent releasing payment twice", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const releaseTx = await bountyEscrow.releasePayment(1);

        await releaseTx.wait();

        try {
            await bountyEscrow.releasePayment(1);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Bounty already completed"
            );
        }
    });

    it("should prevent anyone other than the client from releasing payment", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer, attacker] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("1");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        try {
            await bountyEscrow
                .connect(attacker)
                .releasePayment(1);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Only client can release payment"
            );
        }
    });

    it("should allow the client to create a milestone", async function () {
        const { ethers } = await hre.network.connect();

        const [client] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        const milestone =
            await bountyEscrow.milestones(1, 0);

        expect(milestone.description).to.equal(
            "Build the frontend"
        );

        expect(milestone.amount).to.equal(
            milestoneAmount
        );

        expect(milestone.completed).to.equal(false);
    });

    it("should prevent milestones from exceeding the bounty amount", async function () {
        const { ethers } = await hre.network.connect();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const firstMilestoneAmount = ethers.parseEther("3");

        const firstMilestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build frontend",
                firstMilestoneAmount
            );

        await firstMilestoneTx.wait();

        const secondMilestoneAmount = ethers.parseEther("3");

        try {
            await bountyEscrow.createMilestone(
                1,
                "Build backend",
                secondMilestoneAmount
            );

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Milestones exceed bounty amount"
            );
        }
    });

    it("should prevent anyone other than the client from creating a milestone", async function () {
        const { ethers } = await hre.network.connect();

        const [client, attacker] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        try {
            await bountyEscrow
                .connect(attacker)
                .createMilestone(
                    1,
                    "Malicious milestone",
                    milestoneAmount
                );

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Only client can create milestone"
            );
        }
    });
    it("should release milestone payment when the client approves it", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        const freelancerBalanceBefore =
            await ethers.provider.getBalance(
                freelancer.address
            );

        const approveTx =
            await bountyEscrow.approveMilestone(1, 0);

        await approveTx.wait();

        const freelancerBalanceAfter =
            await ethers.provider.getBalance(
                freelancer.address
            );

        expect(
            freelancerBalanceAfter - freelancerBalanceBefore
        ).to.equal(milestoneAmount);

        const milestone =
            await bountyEscrow.milestones(1, 0);

        expect(milestone.completed).to.equal(true);

        const contractBalance =
            await ethers.provider.getBalance(
                await bountyEscrow.getAddress()
            );

        expect(contractBalance).to.equal(
            bountyAmount - milestoneAmount
        );
    });

    it("should prevent anyone other than the client from approving a milestone", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer, attacker] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        try {
            await bountyEscrow
                .connect(attacker)
                .approveMilestone(1, 0);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Only client can approve milestone"
            );
        }
    });

    it("should prevent approving the same milestone twice", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        // First approval
        const approveTx =
            await bountyEscrow.approveMilestone(1, 0);

        await approveTx.wait();

        // Second approval should fail
        try {
            await bountyEscrow.approveMilestone(1, 0);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Milestone already completed"
            );
        }
    });

    it("should reject an invalid milestone ID", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        // Milestone 0 exists, but milestone 1 does not
        try {
            await bountyEscrow.approveMilestone(1, 1);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Invalid milestone ID"
            );
        }
    });

    it("should reject milestone approval when no freelancer is assigned", async function () {
        const { ethers } = await hre.network.connect();

        const [client] = await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        // No freelancer has been assigned

        try {
            await bountyEscrow.approveMilestone(1, 0);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Freelancer not assigned"
            );
        }
    });

    it("should prevent full payment release for a milestone bounty", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        // Create a milestone
        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                ethers.parseEther("2")
            );

        await milestoneTx.wait();

        // Full bounty payment should now be blocked
        try {
            await bountyEscrow.releasePayment(1);

            expect.fail("Transaction should have reverted");
        } catch (error: any) {
            expect(error.message).to.include(
                "Cannot release payment for milestone bounty"
            );
        }
    });

    it("should allow full payment release for a bounty without milestones", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const freelancerBalanceBefore =
            await ethers.provider.getBalance(
                freelancer.address
            );

        const releaseTx =
            await bountyEscrow.releasePayment(1);

        await releaseTx.wait();

        const freelancerBalanceAfter =
            await ethers.provider.getBalance(
                freelancer.address
            );

        expect(
            freelancerBalanceAfter - freelancerBalanceBefore
        ).to.equal(bountyAmount);

        const bounty =
            await bountyEscrow.bounties(1);

        expect(bounty.completed).to.equal(true);

        const contractBalance =
            await ethers.provider.getBalance(
                await bountyEscrow.getAddress()
            );

        expect(contractBalance).to.equal(0n);
    });

    it("should emit MilestoneApproved when a milestone is approved", async function () {
        const { ethers } = await hre.network.connect();

        const [client, freelancer] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        const assignTx = await bountyEscrow.assignFreelancer(
            1,
            freelancer.address
        );

        await assignTx.wait();

        const milestoneAmount = ethers.parseEther("2");

        const milestoneTx =
            await bountyEscrow.createMilestone(
                1,
                "Build the frontend",
                milestoneAmount
            );

        await milestoneTx.wait();

        const approveTx =
            await bountyEscrow.approveMilestone(1, 0);

        const receipt = await approveTx.wait();

        const event = receipt?.logs.find(
            (log: any) => {
                try {
                    return (
                        bountyEscrow.interface.parseLog(log)
                            ?.name === "MilestoneApproved"
                    );
                } catch {
                    return false;
                }
            }
        );

        expect(event).to.not.equal(undefined);

        const parsedEvent =
            bountyEscrow.interface.parseLog(event);

        expect(parsedEvent?.args[0]).to.equal(1n);
        expect(parsedEvent?.args[1]).to.equal(0n);
        expect(parsedEvent?.args[2]).to.equal(
            freelancer.address
        );
        expect(parsedEvent?.args[3]).to.equal(
            milestoneAmount
        );
    });

    it("should return the correct number of milestones", async function () {
        const { ethers } = await hre.network.connect();

        const [client] =
            await ethers.getSigners();

        const BountyEscrow =
            await ethers.getContractFactory("BountyEscrow");

        const bountyEscrow = await BountyEscrow.deploy();

        await bountyEscrow.waitForDeployment();

        const bountyAmount = ethers.parseEther("5");

        const createTx = await bountyEscrow.createBounty({
            value: bountyAmount,
        });

        await createTx.wait();

        // Initially there are no milestones
        expect(
            await bountyEscrow.getMilestoneCount(1)
        ).to.equal(0n);

        // Add first milestone
        const milestone1 =
            await bountyEscrow.createMilestone(
                1,
                "Build frontend",
                ethers.parseEther("2")
            );

        await milestone1.wait();

        expect(
            await bountyEscrow.getMilestoneCount(1)
        ).to.equal(1n);

        // Add second milestone
        const milestone2 =
            await bountyEscrow.createMilestone(
                1,
                "Build backend",
                ethers.parseEther("2")
            );

        await milestone2.wait();

        expect(
            await bountyEscrow.getMilestoneCount(1)
        ).to.equal(2n);
    });
});
