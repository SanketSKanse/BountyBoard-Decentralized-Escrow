export { BOUNTY_ESCROW_ADDRESS } from './config';

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
