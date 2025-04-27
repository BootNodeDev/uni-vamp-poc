/**
 * Home page for Balancer to Uniswap v4 migration
 */
import { BalancerUserPositions } from '@/src/components/BalancerUserPositions'
import { useUniswapV4Positions } from '@/src/hooks/useUniswapv4Positions'

import { ConnectWalletButton } from '@/src/providers/Web3Provider'
import { NumberType, formatNumberOrString } from '@/src/utils/numberFormat'
import { Title } from '@bootnodedev/db-ui-toolkit'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

/**
 * A styled container for the home page
 */
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`

/**
 * A header component for the page
 */
const Header = styled.header`
  margin-bottom: 2rem;
  text-align: center;
`

/**
 * Styled component for the wallet connection container
 */
const ConnectWalletContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  max-width: 600px;
  margin: 4rem auto;
  text-align: center;
  background-color: var(--theme-background-light, #f9f9f9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
`

const SectionDivider = styled.div`
  margin: 3rem 0;
  border-top: 1px solid var(--theme-border-color-light, #f0f0f0);
`

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--theme-text-color, #333);
`

const Column = styled.div`
  width: 48%;
  min-width: 500px;
  background-color: var(--theme-background-light, #f9f9f9);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
`

const Row = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 2rem;
  justify-content: space-between;
`

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`

const PositionCard = styled.div`
  background-color: var(--theme-background-light, #f9f9f9);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
`

const PositionHeader = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
`

const PositionName = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
`

const TokenList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`

const TokenItem = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
`

const TokenSymbol = styled.div`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`

const TokenBalance = styled.div`
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: 0.5rem;
`

const TokenBalanceAmount = styled.div`
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: 0.5rem;
`

const UniswapV4UserPositions = ({ userAddress }: { userAddress: string }) => {
  const { positions, isLoading } = useUniswapV4Positions(userAddress)

  console.log(positions)
  if (isLoading) {
    return <LoadingState>Loading your Uniswap v4 positions...</LoadingState>
  }

  if (!positions) {
    return <LoadingState>No positions found</LoadingState>
  }

  return positions?.map((position) => {
    return (
      <PositionCard key={position?.poolId}>
        <PositionHeader>
          <PositionName>
            <a
              href={`https://app.uniswap.org/explore/pools/base/${position?.poolId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pool {position?.token0.symbol}/{position?.token1.symbol}
            </a>
          </PositionName>
        </PositionHeader>

        <TokenList>
          <TokenItem>
            <TokenSymbol>{position?.token0.symbol}</TokenSymbol>
            <TokenBalance>
              <TokenBalanceAmount>
                {formatNumberOrString(position?.amounts.amount0, NumberType.TokenNonTx)}
              </TokenBalanceAmount>
            </TokenBalance>
          </TokenItem>

          <TokenItem>
            <TokenSymbol>{position?.token1.symbol}</TokenSymbol>
            <TokenBalance>
              <TokenBalanceAmount>
                {formatNumberOrString(position?.amounts.amount1, NumberType.TokenNonTx)}
              </TokenBalanceAmount>
            </TokenBalance>
          </TokenItem>
        </TokenList>
      </PositionCard>
    )
  })
}

/**
 * Main home component showing user's positions
 */
export const Home = () => {
  const { address } = useAccount()

  if (!address) {
    return (
      <ConnectWalletContainer>
        <p>Connect your wallet to view your positions</p>
        <ConnectWalletButton />
      </ConnectWalletContainer>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Balancer to Uniswap v4 Migration</Title>
        <p>View your positions and migrate between protocols</p>
      </Header>

      <Row>
        <Column>
          <SectionTitle>Your Balancer Positions</SectionTitle>
          <BalancerUserPositions userAddress={address} />
        </Column>

        <Column>
          <SectionTitle>Your Uniswap v4 Positions</SectionTitle>
          <UniswapV4UserPositions userAddress={address} />
        </Column>
      </Row>

      <SectionDivider />
    </Container>
  )
}
