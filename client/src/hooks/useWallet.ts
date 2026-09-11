import { useState } from 'react';
import { BrowserProvider, formatEther, type JsonRpcSigner } from 'ethers';

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
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

            const provider = new BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);

            // A signer is tied to whichever account MetaMask currently has active
            const connectedSigner = await provider.getSigner();
            const connectedAddress = await connectedSigner.getAddress();
            const rawBalance = await provider.getBalance(connectedAddress);

            setSigner(connectedSigner);
            setAddress(connectedAddress);
            setBalance(Number(formatEther(rawBalance)).toFixed(4));
        } catch (err) {
            console.error(err);
            setError('Connection was rejected or failed.');
        } finally {
            setIsConnecting(false);
        }
    }

    return { address, balance, signer, error, isConnecting, connect };
}