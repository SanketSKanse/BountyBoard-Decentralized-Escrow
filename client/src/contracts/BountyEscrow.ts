export const BOUNTY_ESCROW_ADDRESS =
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const BOUNTY_ESCROW_ABI = [
    "function createBounty() external payable",
    "function assignFreelancer(uint256 bountyId, address freelancer) external",
    "function bountyCount() external view returns (uint256)",
    "function bounties(uint256) external view returns (address client, address freelancer, uint256 amount, bool completed)"
];