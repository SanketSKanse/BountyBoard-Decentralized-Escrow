export const BOUNTY_ESCROW_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const BOUNTY_ESCROW_ABI = [
    "function createBounty() payable",
    "function assignFreelancer(uint256 bountyId, address freelancer)",
    "function bountyCount() view returns (uint256)",
    "function bounties(uint256) view returns (address client, address freelancer, uint256 amount, bool completed)"
];