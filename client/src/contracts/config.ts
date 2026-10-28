export type SupportedNetwork = {
    chainId: bigint;
    chainIdHex: string;
    chainName: string;
    rpcUrl: string;
    blockExplorerUrl: string;
    faucetUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
};

export const SUPPORTED_NETWORKS: Record<string, SupportedNetwork> = {
    '84532': {
        chainId: 84532n,
        chainIdHex: '0x14a34',
        chainName: 'Base Sepolia',
        rpcUrl: 'https://sepolia.base.org',
        blockExplorerUrl: 'https://sepolia.basescan.org',
        faucetUrl: 'https://console.optimism.io/faucet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    },
    '11155420': {
        chainId: 11155420n,
        chainIdHex: '0xaa37dc',
        chainName: 'Optimism Sepolia',
        rpcUrl: 'https://sepolia.optimism.io',
        blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
        faucetUrl: 'https://console.optimism.io/faucet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    },
};

export const BASE_SEPOLIA_CHAIN_ID = 84532n;
export const OP_SEPOLIA_CHAIN_ID = 11155420n;

export const BOUNTY_BOARD_CHAIN_ID = BigInt(
    (import.meta.env.VITE_CHAIN_ID as string) || '84532'
);

export const BOUNTY_ESCROW_ADDRESS =
    (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
    '0xf1053d03DFd871150524DA63280773fe5c37e8Ad';

export function isSupportedChainId(chainId: bigint | number | string | null | undefined): boolean {
    if (!chainId) return false;
    const str = chainId.toString();
    return str === '84532' || str === '11155420';
}

export function getNetworkConfig(chainId?: bigint | number | string | null): SupportedNetwork {
    const str = chainId?.toString();
    if (str && SUPPORTED_NETWORKS[str]) {
        return SUPPORTED_NETWORKS[str];
    }
    const defaultKey = BOUNTY_BOARD_CHAIN_ID.toString();
    return SUPPORTED_NETWORKS[defaultKey] || SUPPORTED_NETWORKS['84532'];
}

export function getExplorerAddressUrl(address: string, chainId?: bigint | number | string | null): string {
    const net = getNetworkConfig(chainId);
    return `${net.blockExplorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string, chainId?: bigint | number | string | null): string {
    const net = getNetworkConfig(chainId);
    return `${net.blockExplorerUrl}/tx/${txHash}`;
}

export const USDC_ADDRESSES: Record<string, string> = {
    '84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    '11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // OP Sepolia USDC
};

export function getUsdcAddress(chainId?: bigint | number | string | null): string {
    const str = chainId?.toString();
    if (str && USDC_ADDRESSES[str]) {
        return USDC_ADDRESSES[str];
    }
    const defaultKey = BOUNTY_BOARD_CHAIN_ID.toString();
    return USDC_ADDRESSES[defaultKey] || USDC_ADDRESSES['84532'];
}

export const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
];

