import { LoadingState, Text, VStack } from '@metafam/ds';
import { PageContainer } from 'components/Container';
import { AdjascentTimezonePlayers } from 'components/Player/Filter/AdjascentTimezonePlayers';
import { PlayerFilter } from 'components/Player/Filter/PlayerFilter';
import { PlayerList } from 'components/Player/PlayerList';
import { HeadComponent } from 'components/Seo';
import { GetPlayersQueryVariables } from 'graphql/autogen/types';
import { getSsrClient } from 'graphql/client';
import { getPlayerFilters, getPlayersWithCount } from 'graphql/getPlayers';
import { usePlayerFilter } from 'lib/hooks/players';
import { useOnScreen } from 'lib/hooks/useOnScreen';
import { InferGetStaticPropsType } from 'next';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

type Props = InferGetStaticPropsType<typeof getStaticProps>;

export const getStaticProps = async () => {
  const [ssrClient, ssrCache] = getSsrClient();

  // This populates the cache server-side
  const { error } = await getPlayersWithCount(undefined, ssrClient);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('getPlayers error', error);
  }
  await getPlayerFilters(ssrClient);

  return {
    props: {
      urqlState: ssrCache.extractData(),
    },
    revalidate: 1,
  };
};

const Players: React.FC<Props> = () => {
  const {
    players,
    aggregates,
    fetching,
    fetchingMore,
    error,
    queryVariables,
    setQueryVariable,
    resetFilter,
    totalCount,
    nextPage,
    moreAvailable,
  } = usePlayerFilter();

  const moreRef = useRef<HTMLDivElement>(null);

  const onScreen = useOnScreen(moreRef);

  const loadMore = useCallback(() => {
    if (onScreen && !fetching && !fetchingMore && moreAvailable) {
      nextPage();
    }
  }, [nextPage, fetching, fetchingMore, moreAvailable, onScreen]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <PageContainer>
      <HeadComponent url="https://my.metagame.wtf/players" />
      <VStack
        w="100%"
        spacing={{ base: '4', md: '8' }}
        pb={{ base: '16', lg: '0' }}
      >
        <PlayerFilter
          fetching={fetching}
          fetchingMore={fetchingMore}
          aggregates={aggregates}
          queryVariables={queryVariables}
          setQueryVariable={setQueryVariable}
          resetFilter={resetFilter}
          totalCount={totalCount}
        />
        {error ? <Text>{`Error: ${error.message}`}</Text> : null}
        {!error && players.length && (fetchingMore || !fetching) ? (
          <PlayerList players={players} />
        ) : null}
        <MorePlayers
          ref={moreRef}
          fetching={fetching || fetchingMore || moreAvailable}
          totalCount={totalCount}
          queryVariables={queryVariables}
        />
      </VStack>
    </PageContainer>
  );
};

export default Players;

type MorePlayersProps = {
  fetching: boolean;
  totalCount: number;
  queryVariables: GetPlayersQueryVariables;
};

const MorePlayers = React.forwardRef<HTMLDivElement, MorePlayersProps>(
  ({ fetching, totalCount, queryVariables }, ref) => {
    const isTimezoneSelected = useMemo(
      () => queryVariables.timezones && queryVariables.timezones.length > 0,
      [queryVariables],
    );
    return (
      <VStack w="100%" ref={ref}>
        {fetching ? <LoadingState color="white" /> : null}
        {!fetching && !isTimezoneSelected ? (
          <Text color="white">
            {totalCount > 0
              ? 'No more players available'
              : 'There were no matches'}
          </Text>
        ) : null}
        {!fetching && isTimezoneSelected ? (
          <AdjascentTimezonePlayers queryVariables={queryVariables} />
        ) : null}
      </VStack>
    );
  },
);
