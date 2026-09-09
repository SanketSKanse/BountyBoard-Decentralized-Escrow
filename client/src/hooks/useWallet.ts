import { useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    async function connect() {
        setError(null);

        if (!window.ethereum) {
            setError('MetaMask not found. Please install it first.');
            return;
        }

        try {
            setIsConnecting(true);

            // ethers wraps window.ethereum so we can use clean async functions
            const provider = new BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
console.log("Connected chain ID:", network.chainId.toString());

            // This triggers the MetaMask popup asking the user to approve the connection
            const accounts = await provider.send('eth_requestAccounts', []);
            const connectedAddress = accounts[0];

            // Ask the local blockchain what this address's balance is
            const rawBalance = await provider.getBalance(connectedAddress);

            setAddress(connectedAddress);
            setBalance(formatEther(rawBalance)); // convert from wei to ETH
            setBalance(Number(formatEther(rawBalance)).toFixed(4));
        } catch (err) {
            console.error(err);
            setError('Connection was rejected or failed.');
        } finally {
            setIsConnecting(false);
        }
    }

    return { address, balance, error, isConnecting, connect };
}