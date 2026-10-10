import { useEffect, useState, useCallback } from 'react';
import { BrowserProvider, formatEther, type JsonRpcSigner } from 'ethers';
import { BOUNTY_BOARD_CHAIN_ID } from '../contracts/config';

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const refreshBalance = useCallback(async (addr: string) => {
        if (!window.ethereum) return;
        try {
            const provider = new BrowserProvider(window.ethereum);
            const rawBalance = await provider.getBalance(addr);
            setBalance(Number(formatEther(rawBalance)).toFixed(4));
        } catch (err) {
            console.error('Failed to refresh balance', err);
        }
    }, []);

    const ensureCorrectNetwork = useCallback(async () => {
        if (!window.ethereum) return;
        const targetHex = `0x${BOUNTY_BOARD_CHAIN_ID.toString(16)}`;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetHex }],
            });
        } catch (switchError: any) {
            // 4902 indicates chain hasn't been added to MetaMask yet
            if (switchError?.code === 4902 && BOUNTY_BOARD_CHAIN_ID === 84532n) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: targetHex,
                            chainName: 'Base Sepolia Testnet',
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org'],
                        },
                    ],
                });
            } else {
                throw switchError;
            }
        }
    }, []);

    const initConnection = useCallback(async (requestPrompt = false) => {
        if (!window.ethereum) return;

        try {
            const provider = new BrowserProvider(window.ethereum);
            let accounts: string[] = [];

            if (requestPrompt) {
                await ensureCorrectNetwork();
                accounts = await provider.send('eth_requestAccounts', []);
            } else {
                // Silent check on load
                accounts = await provider.send('eth_accounts', []);
            }

            if (accounts.length > 0) {
                const connectedSigner = await provider.getSigner();
                const connectedAddress = await connectedSigner.getAddress();
                const rawBalance = await provider.getBalance(connectedAddress);

                setSigner(connectedSigner);
                setAddress(connectedAddress);
                setBalance(Number(formatEther(rawBalance)).toFixed(4));
            }
        } catch (err: any) {
            console.error('Wallet connection error:', err);
            if (requestPrompt) {
                setError(err?.message || 'Connection was rejected or failed.');
            }
        }
    }, [ensureCorrectNetwork]);

    const connect = useCallback(async () => {
        setError(null);
        if (!window.ethereum) {
            setError('MetaMask not found. Please install it first.');
            return;
        }

        try {
            setIsConnecting(true);
            await initConnection(true);
        } finally {
            setIsConnecting(false);
        }
    }, [initConnection]);

    // Check connection on mount automatically
    useEffect(() => {
        initConnection(false);
    }, [initConnection]);

    // Handle account and chain switching dynamically
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = async (accounts: string[]) => {
            if (accounts.length === 0) {
                setAddress(null);
                setBalance(null);
                setSigner(null);
            } else {
                const provider = new BrowserProvider(window.ethereum);
                const newSigner = await provider.getSigner();
                const newAddress = await newSigner.getAddress();
                const rawBalance = await provider.getBalance(newAddress);

                setSigner(newSigner);
                setAddress(newAddress);
                setBalance(Number(formatEther(rawBalance)).toFixed(4));
            }
        };

        const handleChainChanged = async () => {
            // Re-sync wallet without forced reload
            await initConnection(false);
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            if (window.ethereum?.removeListener) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [initConnection]);

    return { address, balance, signer, error, isConnecting, connect, refreshBalance };
}