import { BountyCard } from './BountyCard';
import type { Bounty } from '../hooks/useBounties';
import type { JsonRpcSigner } from 'ethers';

type Props = {
    bounties: Bounty[];
    isLoading: boolean;
    connectedAddress: string | null;
    signer: JsonRpcSigner | null;
    onUpdated: () => void;
};

export function BountyList({ bounties, isLoading, connectedAddress, signer, onUpdated }: Props) {
    if (isLoading) return <p className="mt-8 text-slate-400">Loading bounties...</p>;

    if (bounties.length === 0) {
        return <p className="mt-8 text-slate-400">No bounties yet — create the first one above.</p>;
    }

    return (
        <div className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Bounties</h2>
            {bounties.map((b) => (
                <BountyCard
                    key={b.id}
                    bounty={b}
                    connectedAddress={connectedAddress}
                    signer={signer}
                    onUpdated={onUpdated}
                />
            ))}
        </div>
    );
}