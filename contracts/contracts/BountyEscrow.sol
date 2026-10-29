// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BountyCredentialNFT.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
        if (!success) {
            if (data.length > 0) {
                assembly {
                    let returndata_size := mload(data)
                    revert(add(32, data), returndata_size)
                }
            } else {
                revert("SafeERC20: transfer failed");
            }
        }
        require(data.length == 0 || abi.decode(data, (bool)), "SafeERC20: transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
        );
        if (!success) {
            if (data.length > 0) {
                assembly {
                    let returndata_size := mload(data)
                    revert(add(32, data), returndata_size)
                }
            } else {
                revert("SafeERC20: transferFrom failed");
            }
        }
        require(data.length == 0 || abi.decode(data, (bool)), "SafeERC20: transferFrom failed");
    }
}

contract BountyEscrow {
    using SafeERC20 for IERC20;

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
    address public immutable treasury;
    address public immutable deployer;
    address public credentialNFT;
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1% (100 / 10,000)
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public bountyCount;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => string) public bountyDeliverables;
    mapping(uint256 => uint256) public bountySubmittedAt;
    mapping(uint256 => uint256) public bountyDeadlines;
    mapping(uint256 => address) public bountyTokens; // address(0) = ETH, otherwise ERC20 address

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

    event WorkSubmitted(
        uint256 indexed bountyId,
        address indexed freelancer,
        string deliverableUri,
        uint256 submittedAt
    );

    event DeadlineUpdated(
        uint256 indexed bountyId,
        uint256 deadline
    );

    event ExpiredBountyRefunded(
        uint256 indexed bountyId,
        address indexed client,
        uint256 refundAmount
    );

    event FeeCollected(
        uint256 indexed bountyId,
        address indexed token,
        uint256 fee
    );

    event CredentialMinted(
        uint256 indexed bountyId,
        address indexed recipient,
        uint256 tokenId
    );

    constructor(address _arbiter, address _treasury) {
        require(_arbiter != address(0), "Invalid arbiter address");
        require(_treasury != address(0), "Invalid treasury address");
        arbiter = _arbiter;
        treasury = _treasury;
        deployer = msg.sender;
    }

    function setCredentialNFT(address _credentialNFT) external {
        require(
            msg.sender == arbiter || msg.sender == deployer,
            "Only arbiter or deployer can set credential NFT"
        );
        require(_credentialNFT != address(0), "Invalid credential NFT address");
        credentialNFT = _credentialNFT;
    }

    function _mintCredentialSafe(
        uint256 bountyId,
        address recipient,
        uint256 amount
    ) internal {
        if (
            credentialNFT != address(0) &&
            recipient != address(0) &&
            amount > 0 &&
            credentialNFT.code.length > 0
        ) {
            try IBountyCredentialNFT(credentialNFT).mintCredential(
                recipient,
                bountyId,
                amount,
                bountyTokens[bountyId]
            ) returns (uint256 tokenId) {
                emit CredentialMinted(bountyId, recipient, tokenId);
            } catch {
                // Safe fallback: contract execution never fails even if NFT minting fails
            }
        }
    }

    function _transferFunds(
        uint256 bountyId,
        address recipient,
        uint256 grossAmount,
        bool applyFee
    ) internal {
        if (grossAmount == 0) return;

        address token = bountyTokens[bountyId];
        uint256 fee = 0;
        uint256 netAmount = grossAmount;

        if (applyFee) {
            fee = (grossAmount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
            netAmount = grossAmount - fee;
            if (fee > 0) {
                emit FeeCollected(bountyId, token, fee);
            }
        }

        if (token == address(0)) {
            if (fee > 0) {
                (bool feeSuccess, ) = payable(treasury).call{value: fee}("");
                require(feeSuccess, "Treasury fee transfer failed");
            }
            if (netAmount > 0) {
                (bool success, ) = payable(recipient).call{value: netAmount}("");
                require(success, "Payment transfer failed");
            }
        } else {
            if (fee > 0) {
                IERC20(token).safeTransfer(treasury, fee);
            }
            if (netAmount > 0) {
                IERC20(token).safeTransfer(recipient, netAmount);
            }
        }
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

    function createBountyWithDeadline(
        uint256 deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Bounty amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            client: msg.sender,
            freelancer: address(0),
            amount: msg.value,
            remainingBalance: msg.value,
            status: BountyStatus.Open
        });

        bountyDeadlines[bountyCount] = deadline;

        emit BountyCreated(
            bountyCount,
            msg.sender,
            msg.value
        );

        emit DeadlineUpdated(
            bountyCount,
            deadline
        );

        return bountyCount;
    }

    function createTokenBounty(
        address token,
        uint256 amount
    ) external returns (uint256) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Bounty amount must be greater than 0");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            client: msg.sender,
            freelancer: address(0),
            amount: amount,
            remainingBalance: amount,
            status: BountyStatus.Open
        });

        bountyTokens[bountyCount] = token;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit BountyCreated(
            bountyCount,
            msg.sender,
            amount
        );

        return bountyCount;
    }

    function createTokenBountyWithDeadline(
        address token,
        uint256 amount,
        uint256 deadline
    ) external returns (uint256) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Bounty amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            client: msg.sender,
            freelancer: address(0),
            amount: amount,
            remainingBalance: amount,
            status: BountyStatus.Open
        });

        bountyTokens[bountyCount] = token;
        bountyDeadlines[bountyCount] = deadline;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit BountyCreated(
            bountyCount,
            msg.sender,
            amount
        );

        emit DeadlineUpdated(
            bountyCount,
            deadline
        );

        return bountyCount;
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

        if (credentialNFT != address(0)) {
            _mintCredentialSafe(bountyId, freelancer, bounties[bountyId].amount);
        }

        _transferFunds(bountyId, freelancer, amount, true);

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
            if (credentialNFT != address(0)) {
                _mintCredentialSafe(bountyId, freelancer, bounties[bountyId].amount);
            }
        }

        _transferFunds(bountyId, freelancer, amount, true);

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

        _transferFunds(bountyId, bounty.client, refundAmount, false);

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

        address client = bounty.client;
        address freelancer = bounty.freelancer;

        bounty.remainingBalance = 0;
        bounty.status = BountyStatus.Completed;

        if (clientRefund > 0) {
            _transferFunds(bountyId, client, clientRefund, false);
        }

        if (freelancerPayout > 0) {
            _transferFunds(bountyId, freelancer, freelancerPayout, true);
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

        if (credentialNFT != address(0)) {
            uint256 earnedAmount = bounty.amount - refundAmount;
            _mintCredentialSafe(bountyId, bounty.freelancer, earnedAmount);
        }

        _transferFunds(bountyId, bounty.client, refundAmount, false);

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

    function submitWork(
        uint256 bountyId,
        string calldata deliverableUri
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            bounties[bountyId].status == BountyStatus.Assigned,
            "Bounty is not assigned"
        );

        require(
            msg.sender == bounties[bountyId].freelancer,
            "Only assigned freelancer can submit work"
        );

        require(
            bytes(deliverableUri).length > 0,
            "Deliverable URI cannot be empty"
        );

        bountyDeliverables[bountyId] = deliverableUri;
        bountySubmittedAt[bountyId] = block.timestamp;

        emit WorkSubmitted(
            bountyId,
            msg.sender,
            deliverableUri,
            block.timestamp
        );
    }

    function setDeadline(
        uint256 bountyId,
        uint256 deadline
    ) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        require(
            msg.sender == bounties[bountyId].client,
            "Only client can set deadline"
        );

        require(
            bounties[bountyId].status == BountyStatus.Open ||
                bounties[bountyId].status == BountyStatus.Assigned,
            "Cannot set deadline in current status"
        );

        require(
            deadline > block.timestamp,
            "Deadline must be in the future"
        );

        bountyDeadlines[bountyId] = deadline;

        emit DeadlineUpdated(
            bountyId,
            deadline
        );
    }

    function claimExpiredRefund(uint256 bountyId) external {
        require(
            bountyId > 0 && bountyId <= bountyCount,
            "Invalid bounty ID"
        );

        Bounty storage bounty = bounties[bountyId];

        require(
            msg.sender == bounty.client,
            "Only client can claim expired refund"
        );

        require(
            bounty.status == BountyStatus.Assigned,
            "Bounty is not assigned"
        );

        require(
            bountyDeadlines[bountyId] > 0 && block.timestamp > bountyDeadlines[bountyId],
            "Bounty deadline has not expired"
        );

        require(
            bytes(bountyDeliverables[bountyId]).length == 0,
            "Cannot claim expired refund after work is submitted; raise a dispute instead"
        );

        require(
            bounty.remainingBalance > 0,
            "No remaining balance to refund"
        );

        uint256 refundAmount = bounty.remainingBalance;
        bounty.remainingBalance = 0;
        bounty.status = BountyStatus.Cancelled;

        _transferFunds(bountyId, bounty.client, refundAmount, false);

        emit ExpiredBountyRefunded(
            bountyId,
            bounty.client,
            refundAmount
        );
    }
}