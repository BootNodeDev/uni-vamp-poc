# Uni Vamp PoC

## What's Uni Vamp?

**Uni Vamp** is a proof of concept that shows how to **migrate liquidity from Balancer to Uniswap V4 on Base mainnet** — in one smooth, gas-optimized flow.
Built with **dappBooster**, **Balancer SDK**, **Uniswap V4 SDK**, **Permit2 SDK**, and leveraging **Subgraphs**, it connects everything you need into a fast, developer-friendly experience.

With just a few clicks, users can:
- See their Balancer positions on Base mainnet
- Exit pools and collect the tokens
- Batch-sign token approvals with Permit2 using Permit2 SDK
- Create new pool or use existing ones depending on the token pair, fee, tickSpacing, and hooks on Uniswap V4
- Create new Uniswap V4 liquidity position with the tokens previously collected
- Track their Uniswap V4 positions easily

This project is about making migrations simple, efficient, and delightful ✨.

---

![image](https://github.com/user-attachments/assets/593b39ff-34f9-4210-8b70-a78d392223db)

## Tech Stack

- **Frontend:**
  - [dappBooster](https://dappbooster.dev)

- **Blockchain / SDKs:**
  - [Balancer SDK](https://github.com/balancer/b-sdk)
  - [Uniswap V4 SDK](https://github.com/Uniswap/sdks/tree/main/sdks/v4-sdk)
  - [Permit2 SDK](https://github.com/Uniswap/sdks/tree/main/sdks/permit2-sdk)

- **Data Sources:**
  - [Uniswap V4 Base Subgraph](https://api.studio.thegraph.com/query/24660/uniswap-v4-base/version/latest)
  - [Balancer Base V2 Subgraph](https://api.studio.thegraph.com/query/24660/balancer-base-v2/version/latest)
  - [StateView Contract](https://basescan.org/address/0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71#code)
  - [Permit2 Contract](https://basescan.org/address/0x000000000022D473030F116dDEE9F6B43aC78BA3#code)
  - [Position Manager Contract](https://basescan.org/address/0x7C5f5A4bBd8fD63184577525326123B519429bDc#code)

---

## How it works (the hooks)

- `useBalancerPositions`
  - Fetches all user's liquidity positions on Balancer V3 using the Base mainnet Subgraph

- `useExitBalancerPool`
  - Removes liquidity from a selected Balancer pool on Base mainnet
  - Supports "permit" signatures to avoid expensive approval transactions

- `usePermit2BatchSignature`
  - Batch-signs token allowances with Permit2
  - Avoids multiple ERC20 `approve` transactions

- `useV4Pool`
  - Calculates and checks if a Uniswap V4 pool exists for the selected token pair on Base mainnet

- `useUniswapV4Deposit`
  - Handles the creation of a Uniswap V4 liquidity position on Base mainnet
  - Combines token amounts, Permit2 signature, and pool data to create and send the addLiquidity transaction

- `useUniswapV4Positions`
  - Lists the user's active Uniswap V4 positions by fetching tokenIds from the Base mainnet Subgraph and reading on-chain pool and liquidity info

---

## Quick Start

```bash
git clone <repo-url>
cd uni-vamp-poc
pnpm install
pnpm dev
```

### Requirements:
- Base mainnet RPC endpoint
- Access to Balancer and Uniswap Subgraphs on Base mainnet
- Environment variables:
  ```env
  NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
  NEXT_PUBLIC_SUBGRAPH_API_KEY=your-api-key
  ```

---

## Examples (Real usage)

### 1. Listing Balancer Positions

```tsx
const { data: positions, isLoading } = useBalancerPositions(userAddress);

return (
  <div>
    {isLoading ? 'Loading...' : positions?.map((p) => <div key={p.pool.address}>{p.pool.tokens.map(t => t.symbol).join(' / ')}</div>)}
  </div>
);
```

### 2. Exiting a Balancer Pool

```tsx
const { removeOne } = useExitBalancerPool();

await removeOne({
  address: poolAddress,
  amount: '1000000000000000000' // 1 BPT in wei
});
```

### 3. Batch Signing Token Approvals with Permit2

```tsx
const { sign } = usePermit2BatchSignature({
  tokens: [token0Address, token1Address],
  spender: V4_POSITION_MANAGER_ADDRESS_BASE,
});

const permitSignature = await sign();
```

### 4. Checking if a Uniswap V4 Pool Exists

```tsx
const { data: pool, isLoading } = useV4Pool({
  tokenA: { token: token0, amount: amount0 },
  tokenB: { token: token1, amount: amount1 },
  fee: 100,
  tickSpacing: 1,
  hooks: ZERO_ADDRESS,
});

if (pool) {
  console.log('Pool exists:', pool);
}
```

### 5. Creating a Uniswap V4 Position

```tsx
const sendDeposit = useUniswapV4Deposit(pool, { token: token0, amount: amount0 }, { token: token1, amount: amount1 });

await sendDeposit();
```

### 6. Listing Uniswap V4 Positions

```tsx
const { positions } = useUniswapV4Positions(userAddress);

return (
  <div>
    {positions?.map(p => (
      <div key={p.poolId}>{p.token0.symbol} / {p.token1.symbol}: {p.amounts.amount0} - {p.amounts.amount1}</div>
    ))}
  </div>
);
```

---

## Possible Roadmap

- Show all uniswap v4 pools on the selected token pair and allow users to select the best one.
- Allow users to select custom price ranges when creating Uniswap V4 positions.
- Allow users to select custom hooks when creating Uniswap V4 positions. (can be create a new pool)
- Better error handling and transaction feedback.
- Multi-position migration flow (batch exit + batch deposit).
- Slippage tolerance configuration.
- Improved UI/UX for liquidity migration steps.
- Add anothers networks support.
- Add anothers protocols support to start the migration to uniswap v4. (now only Balancer)
---

## License

This is a PoC for research and demonstration purposes. 
Feel free to explore, fork, and improve it.

(c) 2025

