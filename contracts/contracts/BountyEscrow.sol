// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BountyEscrow {
    enum BountyStatus {
        Open,
        Assigned,
        Disputed,
        Completed,
        Cancelled
    }

    struct Milestone {
        string description;
        uint256 amount;
        bool completed;
    }

    struct Bounty {
        address client;
        address freelancer;
        uint256 amount;
        uint256 remainingBalance;
        BountyStatus status;
    }

    address public immutable arbiter;
    uint256 public bountyCount;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => Milestone[]) public milestones;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed client,
        uint256 amount
    );

    event PaymentReleased(
        uint256 indexed bountyId,
        address indexed freelancer,
        uint256 amount
    );

    event MilestoneApproved(
        uint256 indexed bountyId,
        uint256 indexed milestoneId,
        address indexed freelancer,
        uint256 amount
    );

    event BountyCancelled(
        uint256 indexed bountyId,
        address indexed client,
        uint256 amount
    );

    event DisputeRaised(
        uint256 indexed bountyId,
        address indexed initiator
    );

    event DisputeResolved(
        uint256 indexed bountyId,
        uint256 clientRefund,
        uint256 freelancerPayout
    );

    event RemainderRefunded(
        uint256 indexed bountyId,
        address indexed client,
        uint256 amount
    );

    constructor(address _arbiter) {
        require(_arbiter != address(0), "Invalid arbiter address");
        arbiter = _arbiter;
    }

    function createBounty() external payable {
        require(msg.value > 0, "Bounty amount must be greater than 0");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            client: msg.sender,
            freelancer: address(0),
            amount: msg.value,
            remainingBalance: msg.value,
            status: BountyStatus.Open
        });

        emit BountyCreated(
            bountyCount,
            msg.sender,
            msg.value
        );
    }

    function assignFreelancer(
        uint256 bountyId,
        address freelancer
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == bounties[bountyId].client,
            "Only client can assign freelancer"
        );

        require(
            freelancer != address(0),
            "Invalid freelancer address"
        );

        require(
            bounties[bountyId].status == BountyStatus.Open,
            "Bounty is not open"
        );

        bounties[bountyId].freelancer = freelancer;
        bounties[bountyId].status = BountyStatus.Assigned;
    }

    function releasePayment(uint256 bountyId) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == bounties[bountyId].client,
            "Only client can release payment"
        );

        require(
            bounties[bountyId].freelancer != address(0),
            "Freelancer not assigned"
        );

        require(
            bounties[bountyId].status != BountyStatus.Completed,
            "Bounty already completed"
        );

        require(
            bounties[bountyId].status == BountyStatus.Assigned,
            "Bounty is not assigned"
        );

        require(
            milestones[bountyId].length == 0,
            "Cannot release payment for milestone bounty"
        );

        uint256 amount = bounties[bountyId].remainingBalance;
        address freelancer = bounties[bountyId].freelancer;

        bounties[bountyId].remainingBalance = 0;
        bounties[bountyId].status = BountyStatus.Completed;

        (bool success, ) = payable(freelancer).call{value: amount}("");

        require(success, "Payment transfer failed");

        emit PaymentReleased(
            bountyId,
            freelancer,
            amount
        );
    }

    function createMilestone(
        uint256 bountyId,
        string calldata description,
        uint256 amount
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == bounties[bountyId].client,
            "Only client can create milestone"
        );

        require(
            bounties[bountyId].status == BountyStatus.Open ||
                bounties[bountyId].status == BountyStatus.Assigned,
            "Cannot create milestone in current status"
        );

        require(
            amount > 0,
            "Milestone amount must be greater than 0"
        );

        uint256 totalMilestoneAmount = 0;

        for (
            uint256 i = 0;
            i < milestones[bountyId].length;
            i++
        ) {
            totalMilestoneAmount += milestones[bountyId][i].amount;
        }

        require(
            totalMilestoneAmount + amount <= bounties[bountyId].amount,
            "Milestones exceed bounty amount"
        );

        milestones[bountyId].push(
            Milestone({
                description: description,
                amount: amount,
                completed: false
            })
        );
    }

    function approveMilestone(
        uint256 bountyId,
        uint256 milestoneId
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == bounties[bountyId].client,
            "Only client can approve milestone"
        );

        require(
            milestoneId < milestones[bountyId].length,
            "Invalid milestone ID"
        );

        require(
            !milestones[bountyId][milestoneId].completed,
            "Milestone already completed"
        );

        require(
            bounties[bountyId].status == BountyStatus.Assigned,
            "Bounty is not assigned"
        );

        address freelancer = bounties[bountyId].freelancer;

        require(
            freelancer != address(0),
            "Freelancer not assigned"
        );

        uint256 amount = milestones[bountyId][milestoneId].amount;

        require(
            bounties[bountyId].remainingBalance >= amount,
            "Insufficient remaining balance"
        );

        milestones[bountyId][milestoneId].completed = true;
        bounties[bountyId].remainingBalance -= amount;

        bool allCompleted = true;
        for (uint256 i = 0; i < milestones[bountyId].length; i++) {
            if (!milestones[bountyId][i].completed) {
                allCompleted = false;
                break;
            }
        }

        if (allCompleted && bounties[bountyId].remainingBalance == 0) {
            bounties[bountyId].status = BountyStatus.Completed;
        }

        (bool success, ) = payable(freelancer).call{value: amount}("");

        require(
            success,
            "Milestone payment failed"
        );

        emit MilestoneApproved(
            bountyId,
            milestoneId,
            freelancer,
            amount
        );
    }

    function cancelBounty(uint256 bountyId) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        Bounty storage bounty = bounties[bountyId];

        require(
            msg.sender == bounty.client,
            "Only client can cancel bounty"
        );

        require(
            bounty.status == BountyStatus.Open,
            "Bounty cannot be cancelled"
        );

        require(
            bounty.freelancer == address(0),
            "Freelancer already assigned"
        );

        uint256 refundAmount = bounty.remainingBalance;
        bounty.remainingBalance = 0;
        bounty.status = BountyStatus.Cancelled;

        (bool success, ) = payable(bounty.client).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit BountyCancelled(
            bountyId,
            bounty.client,
            refundAmount
        );
    }

    function raiseDispute(uint256 bountyId) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.status == BountyStatus.Assigned,
            "Bounty is not assigned"
        );

        require(
            msg.sender == bounty.client || msg.sender == bounty.freelancer,
            "Only client or freelancer can raise dispute"
        );

        bounty.status = BountyStatus.Disputed;

        emit DisputeRaised(bountyId, msg.sender);
    }

    function resolveDispute(
        uint256 bountyId,
        uint256 clientRefund,
        uint256 freelancerPayout
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == arbiter,
            "Only arbiter can resolve dispute"
        );

        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.status == BountyStatus.Disputed,
            "Bounty is not disputed"
        );

        require(
            clientRefund + freelancerPayout == bounty.remainingBalance,
            "Split must equal remaining balance"
        );

        bounty.remainingBalance = 0;
        bounty.status = BountyStatus.Completed;

        if (clientRefund > 0) {
            (bool clientSuccess, ) = payable(bounty.client).call{value: clientRefund}("");
            require(clientSuccess, "Client refund failed");
        }

        if (freelancerPayout > 0) {
            (bool freelancerSuccess, ) = payable(bounty.freelancer).call{value: freelancerPayout}("");
            require(freelancerSuccess, "Freelancer payout failed");
        }

        emit DisputeResolved(bountyId, clientRefund, freelancerPayout);
    }

    function refundRemainder(uint256 bountyId) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        Bounty storage bounty = bounties[bountyId];

        require(
            msg.sender == bounty.client,
            "Only client can refund remainder"
        );

        require(
            bounty.status == BountyStatus.Assigned,
            "Bounty must be assigned"
        );

        require(
            milestones[bountyId].length > 0,
            "No milestones found"
        );

        for (uint256 i = 0; i < milestones[bountyId].length; i++) {
            require(
                milestones[bountyId][i].completed,
                "All milestones must be completed"
            );
        }

        require(
            bounty.remainingBalance > 0,
            "No remaining balance to refund"
        );

        uint256 refundAmount = bounty.remainingBalance;
        bounty.remainingBalance = 0;
        bounty.status = BountyStatus.Completed;

        (bool success, ) = payable(bounty.client).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit RemainderRefunded(bountyId, bounty.client, refundAmount);
    }

    function getMilestoneCount(
        uint256 bountyId
    ) external view returns (uint256) {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        return milestones[bountyId].length;
    }
}