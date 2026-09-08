// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BountyEscrow {
    struct Milestone {
    string description;
    uint256 amount;
    bool completed;
    }

    struct Bounty {
        address client;
        address freelancer;
        uint256 amount;
        bool completed;
    }

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


    function createBounty() external payable {
        require(msg.value > 0, "Bounty amount must be greater than 0");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            client: msg.sender,
            freelancer: address(0),
            amount: msg.value,
            completed: false
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

        bounties[bountyId].freelancer = freelancer;
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
        !bounties[bountyId].completed,
        "Bounty already completed"
    );

    require(
    milestones[bountyId].length == 0,
    "Cannot release payment for milestone bounty"
);

    uint256 amount = bounties[bountyId].amount;
    address freelancer = bounties[bountyId].freelancer;

    bounties[bountyId].completed = true;

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

    address freelancer = bounties[bountyId].freelancer;

    require(
        freelancer != address(0),
        "Freelancer not assigned"
    );

    uint256 amount =
        milestones[bountyId][milestoneId].amount;

    milestones[bountyId][milestoneId].completed = true;

    (bool success, ) =
        payable(freelancer).call{value: amount}("");

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