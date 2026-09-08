import { BrowserProvider, Contract } from "ethers";
import {
    BOUNTY_ESCROW_ADDRESS,
    BOUNTY_ESCROW_ABI,
} from "../contracts/BountyEscrow";

export function useBountyContract() {
    async function getContract() {
        if (!window.ethereum) {
            throw new Error("MetaMask not installed");
        }

        const provider = new BrowserProvider(window.ethereum);

        const signer = await provider.getSigner();

        return new Contract(
            BOUNTY_ESCROW_ADDRESS,
            BOUNTY_ESCROW_ABI,
            signer
        );
    }

    return {
        getContract,
    };
}