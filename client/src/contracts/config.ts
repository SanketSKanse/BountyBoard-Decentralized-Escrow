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
