import { expect } from "chai";
import hre from "hardhat";

enum BountyStatus {
    Open = 0,
    Assigned = 1,
    Disputed = 2,
    Completed = 3,
    Cancelled = 4,
}

describe("BountyEscrow", function () {
    async function deployFixture() {
        const { ethers } = await hre.network.connect();
        const [client, freelancer, arbiter, attacker, other] =
            await ethers.getSigners();
        const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
        const bountyEscrow = await BountyEscrow.deploy(arbiter.address);
        await bountyEscrow.waitForDeployment();
        return { ethers, bountyEscrow, client, freelancer, arbiter, attacker, other };
    }

    function findParsedEvent(receipt: any, bountyEscrow: any, eventName: string) {
        for (const log of receipt?.logs ?? []) {
            try {
                const parsed = bountyEscrow.interface.parseLog(log);
                if (parsed && parsed.name === eventName) {
                    return parsed;
                }
            } catch {
                // ignore
            }
        }
        return null;
    }

    describe("Deployment & Constructor", function () {
        it("should deploy with the specified arbiter", async function () {
            const { bountyEscrow, arbiter } = await deployFixture();
            expect(await bountyEscrow.arbiter()).to.equal(arbiter.address);
        });

        it("should reject deployment with zero address arbiter", async function () {
            const { ethers } = await deployFixture();
            const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
            try {
                await BountyEscrow.deploy(ethers.ZeroAddress);
                expect.fail("Deployment should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Invalid arbiter address");
            }
        });
    });

    describe("Bounty Creation", function () {
        it("should create a bounty and store the correct information", async function () {
            const { ethers, bountyEscrow, client } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            const tx = await bountyEscrow.createBounty({
                value: bountyAmount,
            });
            const receipt = await tx.wait();

            expect(await bountyEscrow.bountyCount()).to.equal(1n);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.client).to.equal(client.address);
            expect(bounty.freelancer).to.equal(ethers.ZeroAddress);
            expect(bounty.amount).to.equal(bountyAmount);
            expect(bounty.remainingBalance).to.equal(bountyAmount);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Open));

            const event = findParsedEvent(receipt, bountyEscrow, "BountyCreated");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(client.address);
            expect(event?.args[2]).to.equal(bountyAmount);
        });

        it("should reject a bounty with zero ETH", async function () {
            const { bountyEscrow } = await deployFixture();
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
            const { ethers, bountyEscrow, client } = await deployFixture();
            const firstAmount = ethers.parseEther("1");
            const secondAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: firstAmount })).wait();
            await (await bountyEscrow.createBounty({ value: secondAmount })).wait();

            expect(await bountyEscrow.bountyCount()).to.equal(2n);

            const firstBounty = await bountyEscrow.bounties(1);
            const secondBounty = await bountyEscrow.bounties(2);

            expect(firstBounty.client).to.equal(client.address);
            expect(firstBounty.amount).to.equal(firstAmount);
            expect(firstBounty.remainingBalance).to.equal(firstAmount);
            expect(firstBounty.status).to.equal(BigInt(BountyStatus.Open));

            expect(secondBounty.client).to.equal(client.address);
            expect(secondBounty.amount).to.equal(secondAmount);
            expect(secondBounty.remainingBalance).to.equal(secondAmount);
            expect(secondBounty.status).to.equal(BigInt(BountyStatus.Open));
        });

        it("should hold the bounty ETH inside the contract", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            const contractBalance = await ethers.provider.getBalance(
                await bountyEscrow.getAddress()
            );
            expect(contractBalance).to.equal(bountyAmount);
        });
    });

    describe("Freelancer Assignment", function () {
        it("should allow the client to assign a freelancer and update status to Assigned", async function () {
            const { ethers, bountyEscrow, client, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.client).to.equal(client.address);
            expect(bounty.freelancer).to.equal(freelancer.address);
            expect(bounty.amount).to.equal(bountyAmount);
            expect(bounty.remainingBalance).to.equal(bountyAmount);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Assigned));
        });

        it("should prevent anyone other than the client from assigning a freelancer", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow)
                    .assignFreelancer(1, freelancer.address);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include(
                    "Only client can assign freelancer"
                );
            }
        });

        it("should prevent assigning freelancer if bounty is not Open", async function () {
            const { ethers, bountyEscrow, freelancer, other } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await bountyEscrow.assignFreelancer(1, other.address);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not open");
            }
        });
    });

    describe("Payment Release (Non-Milestone)", function () {
        it("should release the bounty payment to the freelancer", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const balanceBefore = await ethers.provider.getBalance(freelancer.address);
            const tx = await bountyEscrow.releasePayment(1);
            const receipt = await tx.wait();
            const balanceAfter = await ethers.provider.getBalance(freelancer.address);

            expect(balanceAfter - balanceBefore).to.equal(bountyAmount);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Completed));
            expect(bounty.remainingBalance).to.equal(0n);

            const event = findParsedEvent(receipt, bountyEscrow, "PaymentReleased");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(freelancer.address);
            expect(event?.args[2]).to.equal(bountyAmount);
        });

        it("should prevent releasing payment twice", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.releasePayment(1)).wait();

            try {
                await bountyEscrow.releasePayment(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty already completed");
            }
        });

        it("should prevent anyone other than the client from releasing payment", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow)
                    .releasePayment(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can release payment");
            }
        });

        it("should prevent full payment release for a milestone bounty", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Phase 1", ethers.parseEther("1"))).wait();

            try {
                await bountyEscrow.releasePayment(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Cannot release payment for milestone bounty");
            }
        });
    });

    describe("Milestones", function () {
        it("should allow the client to create a milestone", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");
            const milestoneAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", milestoneAmount)).wait();

            const milestone = await bountyEscrow.milestones(1, 0);
            expect(milestone.description).to.equal("Milestone 1");
            expect(milestone.amount).to.equal(milestoneAmount);
            expect(milestone.completed).to.equal(false);
        });

        it("should prevent milestones from exceeding the bounty amount", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("3");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", ethers.parseEther("2"))).wait();

            try {
                await bountyEscrow.createMilestone(1, "Milestone 2", ethers.parseEther("2"));
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Milestones exceed bounty amount");
            }
        });

        it("should prevent anyone other than the client from creating a milestone", async function () {
            const { ethers, bountyEscrow, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow)
                    .createMilestone(1, "Malicious milestone", ethers.parseEther("1"));
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can create milestone");
            }
        });

        it("should release milestone payment when the client approves it", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");
            const milestoneAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", milestoneAmount)).wait();

            const balanceBefore = await ethers.provider.getBalance(freelancer.address);
            await (await bountyEscrow.approveMilestone(1, 0)).wait();
            const balanceAfter = await ethers.provider.getBalance(freelancer.address);

            expect(balanceAfter - balanceBefore).to.equal(milestoneAmount);

            const milestone = await bountyEscrow.milestones(1, 0);
            expect(milestone.completed).to.equal(true);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.remainingBalance).to.equal(bountyAmount - milestoneAmount);
        });

        it("should prevent anyone other than the client from approving a milestone", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", ethers.parseEther("2"))).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).approveMilestone(1, 0);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can approve milestone");
            }
        });

        it("should prevent approving the same milestone twice", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", ethers.parseEther("2"))).wait();
            await (await bountyEscrow.approveMilestone(1, 0)).wait();

            try {
                await bountyEscrow.approveMilestone(1, 0);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Milestone already completed");
            }
        });

        it("should reject an invalid milestone ID", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await bountyEscrow.approveMilestone(1, 999);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Invalid milestone ID");
            }
        });

        it("should emit MilestoneApproved when a milestone is approved", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");
            const milestoneAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Milestone 1", milestoneAmount)).wait();

            const tx = await bountyEscrow.approveMilestone(1, 0);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "MilestoneApproved");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(0n);
            expect(event?.args[2]).to.equal(freelancer.address);
            expect(event?.args[3]).to.equal(milestoneAmount);
        });

        it("should return the correct number of milestones", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            expect(await bountyEscrow.getMilestoneCount(1)).to.equal(0n);

            await (await bountyEscrow.createMilestone(1, "M1", ethers.parseEther("1"))).wait();
            expect(await bountyEscrow.getMilestoneCount(1)).to.equal(1n);

            await (await bountyEscrow.createMilestone(1, "M2", ethers.parseEther("2"))).wait();
            expect(await bountyEscrow.getMilestoneCount(1)).to.equal(2n);
        });
    });

    describe("Bounty Cancellation (cancelBounty)", function () {
        it("should allow the client to cancel an Open bounty and refund 100% ETH", async function () {
            const { ethers, bountyEscrow, client } = await deployFixture();
            const bountyAmount = ethers.parseEther("3");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const cancelTx = await bountyEscrow.cancelBounty(1);
            const receipt = await cancelTx.wait();
            const gasCost = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
            const clientBalanceAfter = await ethers.provider.getBalance(client.address);

            expect(clientBalanceAfter - clientBalanceBefore + gasCost).to.equal(bountyAmount);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Cancelled));
            expect(bounty.remainingBalance).to.equal(0n);

            const contractBalance = await ethers.provider.getBalance(await bountyEscrow.getAddress());
            expect(contractBalance).to.equal(0n);
        });

        it("should emit BountyCancelled event", async function () {
            const { ethers, bountyEscrow, client } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            const tx = await bountyEscrow.cancelBounty(1);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "BountyCancelled");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(client.address);
            expect(event?.args[2]).to.equal(bountyAmount);
        });

        it("should prevent non-client from cancelling a bounty", async function () {
            const { ethers, bountyEscrow, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).cancelBounty(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can cancel bounty");
            }
        });

        it("should prevent cancelling a bounty once a freelancer is assigned", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await bountyEscrow.cancelBounty(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty cannot be cancelled");
            }
        });

        it("should prevent cancelling an already cancelled bounty", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.cancelBounty(1)).wait();

            try {
                await bountyEscrow.cancelBounty(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty cannot be cancelled");
            }
        });
    });

    describe("Dispute Raising (raiseDispute)", function () {
        it("should allow client to raise dispute on Assigned bounty and emit DisputeRaised", async function () {
            const { ethers, bountyEscrow, client, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const tx = await bountyEscrow.raiseDispute(1);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "DisputeRaised");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(client.address);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Disputed));
        });

        it("should allow freelancer to raise dispute on Assigned bounty", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const tx = await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).raiseDispute(1);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "DisputeRaised");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(freelancer.address);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Disputed));
        });

        it("should prevent third parties from raising dispute", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).raiseDispute(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client or freelancer can raise dispute");
            }
        });

        it("should prevent raising dispute on Open bounty", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            try {
                await bountyEscrow.raiseDispute(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not assigned");
            }
        });

        it("should freeze escrow and prevent payments or milestone approval while Disputed", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("4");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "Phase 1", ethers.parseEther("2"))).wait();
            await (await bountyEscrow.raiseDispute(1)).wait();

            try {
                await bountyEscrow.approveMilestone(1, 0);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not assigned");
            }

            try {
                await bountyEscrow.releasePayment(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not assigned");
            }
        });
    });

    describe("Dispute Resolution (resolveDispute)", function () {
        it("should allow arbiter to resolve dispute and distribute split correctly", async function () {
            const { ethers, bountyEscrow, client, freelancer, arbiter } = await deployFixture();
            const bountyAmount = ethers.parseEther("10");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.raiseDispute(1)).wait();

            const clientRefund = ethers.parseEther("4");
            const freelancerPayout = ethers.parseEther("6");

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

            const tx = await (bountyEscrow.connect(arbiter) as typeof bountyEscrow)
                .resolveDispute(1, clientRefund, freelancerPayout);
            await tx.wait();

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);

            expect(clientBalanceAfter - clientBalanceBefore).to.equal(clientRefund);
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(freelancerPayout);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Completed));
            expect(bounty.remainingBalance).to.equal(0n);
        });

        it("should emit DisputeResolved event upon resolution", async function () {
            const { ethers, bountyEscrow, freelancer, arbiter } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.raiseDispute(1)).wait();

            const clientRefund = ethers.parseEther("2");
            const freelancerPayout = ethers.parseEther("3");

            const tx = await (bountyEscrow.connect(arbiter) as typeof bountyEscrow)
                .resolveDispute(1, clientRefund, freelancerPayout);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "DisputeResolved");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(clientRefund);
            expect(event?.args[2]).to.equal(freelancerPayout);
        });

        it("should reject resolution if caller is not arbiter", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.raiseDispute(1)).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow)
                    .resolveDispute(1, ethers.parseEther("2"), ethers.parseEther("3"));
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only arbiter can resolve dispute");
            }
        });

        it("should reject resolution if split sum does not match remaining balance", async function () {
            const { ethers, bountyEscrow, freelancer, arbiter } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.raiseDispute(1)).wait();

            try {
                await (bountyEscrow.connect(arbiter) as typeof bountyEscrow)
                    .resolveDispute(1, ethers.parseEther("2"), ethers.parseEther("2"));
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Split must equal remaining balance");
            }
        });

        it("should reject resolution if bounty is not in Disputed status", async function () {
            const { ethers, bountyEscrow, freelancer, arbiter } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await (bountyEscrow.connect(arbiter) as typeof bountyEscrow)
                    .resolveDispute(1, ethers.parseEther("2"), ethers.parseEther("3"));
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not disputed");
            }
        });
    });

    describe("Remainder Refund (refundRemainder)", function () {
        it("should allow client to refund unallocated funds once all milestones are completed", async function () {
            const { ethers, bountyEscrow, client, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("10");
            const milestone1 = ethers.parseEther("4");
            const milestone2 = ethers.parseEther("3");
            const expectedRemainder = ethers.parseEther("3");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "M1", milestone1)).wait();
            await (await bountyEscrow.createMilestone(1, "M2", milestone2)).wait();

            // Approve all milestones
            await (await bountyEscrow.approveMilestone(1, 0)).wait();
            await (await bountyEscrow.approveMilestone(1, 1)).wait();

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const refundTx = await bountyEscrow.refundRemainder(1);
            const receipt = await refundTx.wait();
            const gasCost = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
            const clientBalanceAfter = await ethers.provider.getBalance(client.address);

            expect(clientBalanceAfter - clientBalanceBefore + gasCost).to.equal(expectedRemainder);

            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Completed));
            expect(bounty.remainingBalance).to.equal(0n);
        });

        it("should emit RemainderRefunded event", async function () {
            const { ethers, bountyEscrow, client, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");
            const milestoneAmount = ethers.parseEther("3");
            const remainder = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "M1", milestoneAmount)).wait();
            await (await bountyEscrow.approveMilestone(1, 0)).wait();

            const tx = await bountyEscrow.refundRemainder(1);
            const receipt = await tx.wait();

            const event = findParsedEvent(receipt, bountyEscrow, "RemainderRefunded");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(client.address);
            expect(event?.args[2]).to.equal(remainder);
        });

        it("should reject refundRemainder if milestones are not yet completed", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("10");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "M1", ethers.parseEther("4"))).wait();
            await (await bountyEscrow.createMilestone(1, "M2", ethers.parseEther("3"))).wait();

            // Approve only first milestone
            await (await bountyEscrow.approveMilestone(1, 0)).wait();

            try {
                await bountyEscrow.refundRemainder(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("All milestones must be completed");
            }
        });

        it("should reject refundRemainder if caller is not client", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();
            await (await bountyEscrow.createMilestone(1, "M1", ethers.parseEther("3"))).wait();
            await (await bountyEscrow.approveMilestone(1, 0)).wait();

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).refundRemainder(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can refund remainder");
            }
        });

        it("should reject refundRemainder if bounty has no milestones", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("5");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await bountyEscrow.refundRemainder(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("No milestones found");
            }
        });
    });

    describe("Work Submission (submitWork)", function () {
        it("should allow the assigned freelancer to submit deliverable URI and emit WorkSubmitted", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");
            const deliverableUri = "ipfs://bafybeicdeliverableproof123";

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const tx = await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).submitWork(
                1,
                deliverableUri
            );
            const receipt = await tx.wait();

            expect(await bountyEscrow.bountyDeliverables(1)).to.equal(deliverableUri);
            const submittedAt = await bountyEscrow.bountySubmittedAt(1);
            expect(submittedAt > 0n).to.be.true;

            const event = findParsedEvent(receipt, bountyEscrow, "WorkSubmitted");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(freelancer.address);
            expect(event?.args[2]).to.equal(deliverableUri);
            expect(event?.args[3]).to.equal(submittedAt);
        });

        it("should reject empty deliverable URI", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).submitWork(1, "");
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Deliverable URI cannot be empty");
            }
        });

        it("should reject submission from non-freelancer", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            // Client attempts to submit work
            try {
                await bountyEscrow.submitWork(1, "ipfs://proof");
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only assigned freelancer can submit work");
            }

            // Attacker attempts to submit work
            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).submitWork(1, "ipfs://proof");
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only assigned freelancer can submit work");
            }
        });

        it("should reject work submission when bounty is not Assigned", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("1");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            try {
                await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).submitWork(1, "ipfs://proof");
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not assigned");
            }
        });

        it("should reject work submission with invalid bounty ID", async function () {
            const { bountyEscrow, freelancer } = await deployFixture();

            try {
                await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).submitWork(999, "ipfs://proof");
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Invalid bounty ID");
            }
        });
    });

    describe("Deadlines & Expired Refunds (setDeadline & claimExpiredRefund)", function () {
        it("should create bounty with deadline via createBountyWithDeadline", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");
            const block = await ethers.provider.getBlock("latest");
            const futureDeadline = BigInt(block!.timestamp + 3600);

            const tx = await bountyEscrow.createBountyWithDeadline(futureDeadline, {
                value: bountyAmount,
            });
            const receipt = await tx.wait();

            expect(await bountyEscrow.bountyCount()).to.equal(1n);
            expect(await bountyEscrow.bountyDeadlines(1)).to.equal(futureDeadline);

            const event = findParsedEvent(receipt, bountyEscrow, "DeadlineUpdated");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(futureDeadline);
        });

        it("should reject createBountyWithDeadline with deadline in the past", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const block = await ethers.provider.getBlock("latest");
            const pastDeadline = BigInt(block!.timestamp - 60);

            try {
                await bountyEscrow.createBountyWithDeadline(pastDeadline, {
                    value: ethers.parseEther("1"),
                });
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Deadline must be in the future");
            }
        });

        it("should allow client to set a future deadline and emit DeadlineUpdated", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            await (await bountyEscrow.createBounty({ value: ethers.parseEther("1") })).wait();

            const block = await ethers.provider.getBlock("latest");
            const futureDeadline = BigInt(block!.timestamp + 7200);

            const tx = await bountyEscrow.setDeadline(1, futureDeadline);
            const receipt = await tx.wait();

            expect(await bountyEscrow.bountyDeadlines(1)).to.equal(futureDeadline);

            const event = findParsedEvent(receipt, bountyEscrow, "DeadlineUpdated");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(futureDeadline);
        });

        it("should reject setDeadline if deadline is in the past", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            await (await bountyEscrow.createBounty({ value: ethers.parseEther("1") })).wait();

            const block = await ethers.provider.getBlock("latest");
            const pastDeadline = BigInt(block!.timestamp - 100);

            try {
                await bountyEscrow.setDeadline(1, pastDeadline);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Deadline must be in the future");
            }
        });

        it("should reject setDeadline if caller is not client", async function () {
            const { ethers, bountyEscrow, attacker } = await deployFixture();
            await (await bountyEscrow.createBounty({ value: ethers.parseEther("1") })).wait();

            const block = await ethers.provider.getBlock("latest");
            const futureDeadline = BigInt(block!.timestamp + 3600);

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).setDeadline(1, futureDeadline);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can set deadline");
            }
        });

        it("should reject setDeadline if bounty is completed or cancelled", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            await (await bountyEscrow.createBounty({ value: ethers.parseEther("1") })).wait();
            await (await bountyEscrow.cancelBounty(1)).wait();

            const block = await ethers.provider.getBlock("latest");
            const futureDeadline = BigInt(block!.timestamp + 3600);

            try {
                await bountyEscrow.setDeadline(1, futureDeadline);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Cannot set deadline in current status");
            }
        });

        it("should allow client to claim expired refund if deadline passed and no work was submitted", async function () {
            const { ethers, bountyEscrow, client, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("3");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 1000);
            await (await bountyEscrow.setDeadline(1, deadline)).wait();

            // Advance time past deadline
            await ethers.provider.send("evm_increaseTime", [1001]);
            await ethers.provider.send("evm_mine", []);

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const tx = await bountyEscrow.claimExpiredRefund(1);
            const receipt = await tx.wait();
            const gasCost = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
            const clientBalanceAfter = await ethers.provider.getBalance(client.address);

            // Verify full remaining refund received
            expect(clientBalanceAfter - clientBalanceBefore + gasCost).to.equal(bountyAmount);

            // Verify status and balance updated
            const bounty = await bountyEscrow.bounties(1);
            expect(bounty.status).to.equal(BigInt(BountyStatus.Cancelled));
            expect(bounty.remainingBalance).to.equal(0n);

            // Verify ExpiredBountyRefunded event emitted
            const event = findParsedEvent(receipt, bountyEscrow, "ExpiredBountyRefunded");
            expect(event).to.not.be.null;
            expect(event?.args[0]).to.equal(1n);
            expect(event?.args[1]).to.equal(client.address);
            expect(event?.args[2]).to.equal(bountyAmount);
        });

        it("should reject claimExpiredRefund if deadline has not passed yet", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 5000);
            await (await bountyEscrow.setDeadline(1, deadline)).wait();

            try {
                await bountyEscrow.claimExpiredRefund(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty deadline has not expired");
            }
        });

        it("should reject claimExpiredRefund if deadline was never set", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            try {
                await bountyEscrow.claimExpiredRefund(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty deadline has not expired");
            }
        });

        it("should reject claimExpiredRefund if freelancer has already submitted work", async function () {
            const { ethers, bountyEscrow, freelancer } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 1000);
            await (await bountyEscrow.setDeadline(1, deadline)).wait();

            // Freelancer submits work before deadline
            await (
                await (bountyEscrow.connect(freelancer) as typeof bountyEscrow).submitWork(
                    1,
                    "ipfs://bafybeidocuments"
                )
            ).wait();

            // Advance time past deadline
            await ethers.provider.send("evm_increaseTime", [1500]);
            await ethers.provider.send("evm_mine", []);

            try {
                await bountyEscrow.claimExpiredRefund(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include(
                    "Cannot claim expired refund after work is submitted; raise a dispute instead"
                );
            }
        });

        it("should reject claimExpiredRefund if caller is not client", async function () {
            const { ethers, bountyEscrow, freelancer, attacker } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();
            await (await bountyEscrow.assignFreelancer(1, freelancer.address)).wait();

            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 1000);
            await (await bountyEscrow.setDeadline(1, deadline)).wait();

            await ethers.provider.send("evm_increaseTime", [1001]);
            await ethers.provider.send("evm_mine", []);

            try {
                await (bountyEscrow.connect(attacker) as typeof bountyEscrow).claimExpiredRefund(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only client can claim expired refund");
            }
        });

        it("should reject claimExpiredRefund if bounty is not assigned (e.g. Open)", async function () {
            const { ethers, bountyEscrow } = await deployFixture();
            const bountyAmount = ethers.parseEther("2");

            await (await bountyEscrow.createBounty({ value: bountyAmount })).wait();

            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 1000);
            await (await bountyEscrow.setDeadline(1, deadline)).wait();

            await ethers.provider.send("evm_increaseTime", [1001]);
            await ethers.provider.send("evm_mine", []);

            try {
                await bountyEscrow.claimExpiredRefund(1);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Bounty is not assigned");
            }
        });

        it("should reject claimExpiredRefund with invalid bounty ID", async function () {
            const { bountyEscrow } = await deployFixture();

            try {
                await bountyEscrow.claimExpiredRefund(999);
                expect.fail("Transaction should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Invalid bounty ID");
            }
        });
    });
});
