import { useEffect, useState, useCallback } from 'react';
import { BrowserProvider, formatEther, type JsonRpcSigner } from 'ethers';
import {
    BASE_SEPOLIA_CHAIN_ID,
    OP_SEPOLIA_CHAIN_ID,
    SUPPORTED_NETWORKS,
    isSupportedChainId,
    getNetworkConfig,
} from '../contracts/config';

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
    const [chainId, setChainId] = useState<bigint | null>(null);
    const [networkName, setNetworkName] = useState<string | null>(null);
    const [isUnsupportedChain, setIsUnsupportedChain] = useState(false);
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

    const switchNetwork = useCallback(async (targetChainId: bigint = BASE_SEPOLIA_CHAIN_ID) => {
        if (!window.ethereum) {
            setError('MetaMask not detected in browser.');
            return;
        }
        setError(null);

        const targetNet = getNetworkConfig(targetChainId);
        const targetHex = targetNet.chainIdHex;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetHex }],
            });
        } catch (switchError: any) {
            // 4902 indicates chain hasn't been added to MetaMask yet
            if (
                switchError?.code === 4902 ||
                switchError?.data?.originalError?.code === 4902 ||
                switchError?.message?.includes('Unrecognized chain ID')
            ) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: targetHex,
                                chainName: targetNet.chainName,
                                nativeCurrency: targetNet.nativeCurrency,
                                rpcUrls: [targetNet.rpcUrl],
                                blockExplorerUrls: [targetNet.blockExplorerUrl],
                            },
                        ],
                    });
                } catch (addError: any) {
                    console.error('Failed to add Ethereum chain:', addError);
                    setError(addError?.message || 'Failed to add network to MetaMask.');
                    throw addError;
                }
            } else {
                console.error('Failed to switch Ethereum chain:', switchError);
                setError(switchError?.message || 'Failed to switch network in MetaMask.');
                throw switchError;
            }
        }
    }, []);

    const updateNetworkState = useCallback(async (provider: BrowserProvider) => {
        try {
            const network = await provider.getNetwork();
            const currentChainId = network.chainId;
            setChainId(currentChainId);

            const supported = isSupportedChainId(currentChainId);
            setIsUnsupportedChain(!supported);

            const netConfig = SUPPORTED_NETWORKS[currentChainId.toString()];
            setNetworkName(netConfig ? netConfig.chainName : `Unsupported (${network.name || currentChainId})`);
            return currentChainId;
        } catch (err) {
            console.error('Failed to get network:', err);
            return null;
        }
    }, []);

    const initConnection = useCallback(async (requestPrompt = false) => {
        if (!window.ethereum) return;

        try {
            const provider = new BrowserProvider(window.ethereum);
            let accounts: string[] = [];

            if (requestPrompt) {
                accounts = await provider.send('eth_requestAccounts', []);
            } else {
                // Silent check on load
                accounts = await provider.send('eth_accounts', []);
            }

            const currentChainId = await updateNetworkState(provider);

            if (accounts.length > 0) {
                const connectedSigner = await provider.getSigner();
                const connectedAddress = await connectedSigner.getAddress();
                const rawBalance = await provider.getBalance(connectedAddress);

                setSigner(connectedSigner);
                setAddress(connectedAddress);
                setBalance(Number(formatEther(rawBalance)).toFixed(4));
            } else {
                setSigner(null);
                setAddress(null);
                setBalance(null);
            }

            // If user explicitly connected and chain is unsupported, offer auto switch
            if (requestPrompt && currentChainId && !isSupportedChainId(currentChainId)) {
                await switchNetwork(BASE_SEPOLIA_CHAIN_ID);
            }
        } catch (err: any) {
            console.error('Wallet connection error:', err);
            if (requestPrompt) {
                setError(err?.message || 'Connection was rejected or failed.');
            }
        }
    }, [switchNetwork, updateNetworkState]);

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
                await updateNetworkState(provider);
                const newSigner = await provider.getSigner();
                const newAddress = await newSigner.getAddress();
                const rawBalance = await provider.getBalance(newAddress);

                setSigner(newSigner);
                setAddress(newAddress);
                setBalance(Number(formatEther(rawBalance)).toFixed(4));
            }
        };

        const handleChainChanged = async () => {
            // Re-sync wallet when network changes in MetaMask
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
    }, [initConnection, updateNetworkState]);

    return {
        address,
        balance,
        signer,
        chainId,
        networkName,
        isUnsupportedChain,
        error,
        isConnecting,
        connect,
        switchNetwork,
        refreshBalance,
        BASE_SEPOLIA_CHAIN_ID,
        OP_SEPOLIA_CHAIN_ID,
    };
}