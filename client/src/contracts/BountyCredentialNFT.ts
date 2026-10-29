export { BOUNTY_CREDENTIAL_NFT_ADDRESS } from './config';

export const BOUNTY_CREDENTIAL_NFT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function bountyToTokenId(uint256 bountyId) view returns (uint256)",
    "function totalCredentials() view returns (uint256)",
    "function credentials(uint256 tokenId) view returns (uint256 bountyId, address recipient, uint256 amount, address token, uint256 completedAt)",
    "function getCredential(uint256 tokenId) view returns (tuple(uint256 bountyId, address recipient, uint256 amount, address token, uint256 completedAt))",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event CredentialMinted(uint256 indexed tokenId, uint256 indexed bountyId, address indexed recipient, uint256 amount, address token, uint256 completedAt)"
];
