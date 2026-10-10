export const BOUNTY_ESCROW_ADDRESS =
    (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
    '0xfb84744c7aD2162F40623B65858Cb3041fe3dbF4';

export const BOUNTY_BOARD_CHAIN_ID = BigInt(
    (import.meta.env.VITE_CHAIN_ID as string) || '84532'
);