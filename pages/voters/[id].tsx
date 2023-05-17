import { Page } from '../../components/Page';
import { GetStaticProps } from 'next';
import { getAddress, isAddress } from 'viem';
import { FallbackProp } from '../../lib/util/swr';
import { useRouter } from 'next/router';
import { viem } from '../../lib/wagmi';
import { ensureTitleCase, formatAddress } from '../../lib/util/format';
import { Address } from 'wagmi';
import React, { useMemo } from 'react';
import {
  getKey,
  PaginatedVoteList,
} from '../../compositions/PaginatedVoteList';
import { subgraphService } from '../../lib/services/subgraph.service';
import { unstable_serialize } from 'swr/infinite';
import { getEtherscanLink } from '../../lib/util/link';

type VoterPageProps = {
  address: Address;
  ensName: string | null;
  fallback: FallbackProp;
};

type VoterPageParams = {
  id: Address | string;
};

export default function Voter({ fallback, address, ensName }: VoterPageProps) {
  const { isFallback } = useRouter();

  const name = useMemo(
    () =>
      !isFallback
        ? ensName
          ? ensureTitleCase(ensName)
          : formatAddress(address)
        : null,
    [address, ensName, isFallback]
  );

  if (isFallback) {
    return <Page title="Votes" />;
  }

  return (
    <Page title={`${name} Votes`} fallback={fallback}>
      <section className="w-full">
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl text-center font-semibold  mb-1 px-4">
            {name} Votes
          </h1>
          <a
            href={getEtherscanLink(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center hover:text-gray-100 text-sm text-gray-500 underline"
          >
            View on Etherscan
          </a>
        </div>
        <div className="flex flex-col justify-center items-center w-full">
          <PaginatedVoteList voterId={address} />
        </div>
      </section>
    </Page>
  );
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

export const getStaticProps: GetStaticProps<
  VoterPageProps,
  VoterPageParams
> = async context => {
  const params = context.params;
  let address: Address = params.id as Address;
  let ensName;
  if (params.id.includes('.eth')) {
    address = await viem.getEnsAddress({
      name: params.id,
    });
    ensName = params.id;
  } else {
    const isValid = isAddress(address);
    if (!isValid) {
      throw new Error('supplied id is not a valid address or ens name');
    }
    address = getAddress(address);
    ensName = await viem.getEnsName({
      address,
    });
  }
  const votes = await subgraphService.getVotes({
    order: 'desc',
    voterId: address,
    offset: 0,
    limit: 10,
  });

  return {
    props: {
      address,
      ensName,
      fallback: {
        [unstable_serialize((...args) => getKey(...args, address))]: votes,
      },
    },
    revalidate: 30,
  };
};
