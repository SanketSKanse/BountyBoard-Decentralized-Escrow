export const BOUNTY_ESCROW_ADDRESS =
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

export const BOUNTY_ESCROW_ABI = [
    "function createBounty() payable",
    "function assignFreelancer(uint256 bountyId, address freelancer)",
    "function bountyCount() view returns (uint256)",
    "function bounties(uint256) view returns (address client, address freelancer, uint256 amount, bool completed)"
];