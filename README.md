[![CI](https://github.com/WavesHQ/quantum/actions/workflows/ci.yml/badge.svg)](https://github.com/WavesHQ/quantum/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/WavesHQ/quantum/branch/main/graph/badge.svg?token=OXLL8IBZQV)](https://codecov.io/gh/WavesHQ/quantum)

# [Quantum Bridge](https://quantumbridge.app)

> https://quantumbridge.app

[![Netlify Status](https://api.netlify.com/api/v1/badges/4eaec04e-1416-4c65-843e-d7413fb81d2c/deploy-status)](https://app.netlify.com/sites/defichain-erc20-bridge/deploys)

## Quantum Bridge

All smart contracts will be deployed on Sepolia testnet for testing purposes.

<details>
<summary>Instant Smart Contract</summary>

- The instant smart contract is designed for the immediate execution of transactions, offering quick and seamless processing without additional steps. Transactions are executed instantly upon initiation, fully automated to ensure rapid and efficient processing. This makes the instant smart contract particularly suitable for routine operations where speed and efficiency are crucial. By eliminating extra steps and focusing on automation, it simplifies the transaction process and reduces administrative overhead, ensuring that transactions are processed quickly and effectively.

</details>

<details>
<summary>Queue Smart Contract</summary>

- The queue smart contract handles transactions that require an additional step before completion, ensuring a thorough verification process. When a transaction is initiated through this contract, it is placed in a queue and processed only after this verification step is completed. This introduces a delay, allowing for enhanced security by reviewing each transaction before its final execution. The queue smart contract is specifically designed to support transactions from DeFiChain to Ethereum, providing an additional layer of protection and assurance for high-value or sensitive operations.

</details>

<details>
<summary>How to get ether on a testnet to make testnet transactions?</summary>

- Users can get the SepoliaETH via Sepolia Faucet [here](https://sepoliafaucet.com/)
</details>

<details>
<summary>How to get ERC20 tokens to test bridging functionality?</summary>

- The MUSDT and MUSDC contract have been deployed on Sepolia for testing.
- Users will be able to mint tokens by calling the `mint()` function with the respective EOA (Externally Owned Account) or contract address and amount.
</details>

<details>
<summary>When bridging from DeFiChain, what is the expected signed message?</summary>

- Expected message should be similar to `0x9a2618a0503cf675a85e4519fc97890fba5b851d15e02b8bc8f351d22b46580059c03992465695e89fc29e528797972d05de0b34768d5d3d7f772f2422eb9af01b == relayerAddress._signTypedData(domainData, eip712Types, eip712Data)`.
- This data is signed by the relayer address. Data that hasn't been signed by the relayer address will revert with the error `FAKE_SIGNATURE`.
</details>

## Workflow for Generating Prisma Client and Applying Database Migrations

<details>
<summary>Workflow</summary>

- After making changes to the database schema in `schema.prisma`, run `cd apps/server` in the terminal (/bridge).
- Run `./with-db generate` to generate the Prisma Client.
- Run `./with-db migrate dev` to migrate and apply database migrations in the development environment.

</details>
