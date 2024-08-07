# smartcontracts

A package which contains the Ethereum smart contracts for the DeFiChain to Ethereum bridge.

## Deployed Smart Contracts on development testnet (http://127.0.0.1:8545/)

Before running the below script, devs need to run a local hardhat node. This can be achieved by running `nx hardhat node` in the package/smartcontracts/src directory.

If local node is running on different port other than `8545`. Devs need to update the port in `./src/hardhat.config.ts` under development network.

Then, to deploy the Smart Contracts and mint test tokens on local testnet, devs can run the command `npx hardhat run --network development ./scripts/localContractsDeployment.ts` in the package/smartcontracts/src directory.

This script will deploy all needed contracts. Will mint `100,000` MUSDC and MUSDT token to the user(in this case, accounts[0]). This will also approve the Bridge contract and add test tokens as supported tokens for bridging with maximum daily allowance.

Following addresses will be the admin, operational roles and relayer address.

Admin == accounts[0],

Operational == accounts[1],

Relayer address == accounts[0]

Devs can change these addresses as per their requirements in `../scripts/localContractsDeployment.ts` file.

## Contract Operations

We are implementing a TimeLock contract that will work as an Admin address for ADMIN ONLY tx. There will be 3 days delay on every operational tx except when calling `Withdraw()` function, TimeLock contract is not able to call this function.

<details>
<summary>TimeLock Contract Operations</summary>

Gnosis safe will be implemented with both proposers and executors roles. Only the Timelock smart contract has the role (TIMELOCK_ADMIN_ROLE) to grant roles for now. If we want to grant new roles to new addresses, have to go through a round of scheduling and executing the grantRole functions through the Timelock contract. When revoking privileges, either the revokeRole() or renounceRole() functions must be used.

To execute only Admin transactions, the developer will need to follow these steps:

1.  First, create a transaction using Safe [guide](https://help.safe.global/en/articles/3738081-contract-interactions).
2.  After providing the contract address and ABI, the developer can select the contract method (in this case, we will try to change the transaction fee).
3.  Select "Schedule". According to the Schedule() function, the following arguments need to be provided:

    - `address target`
    - `uint256 value`
    - `bytes calldata data`
    - `bytes32 predecessor`
    - `bytes32 salt`
    - `uint256 delay`

    - The target address is the Proxy Bridge.
    - The value will usually be 0.
    - The data is the encoded data of the function and arguments (BridgeV1Interface.encodeFunctionData('changeTxFee', [100])).
    - Predecessor should almost always be 0x0 unless we have a prerequisite transaction.
    - Salt will be in incremented order (e.g., 0x0...1, 0x0...2, 0x0...3, and so on)
    - Delay (in seconds) should be >= `getMinDelay()` which will be set to 3 days.

4.  Salt can be `0x0000000000000000000000000000000000000000000000000000000000000000` for 1st transaction,
    `0x0000000000000000000000000000000000000000000000000000000000000001` for 2nd transaction and so on.

        - The reason behind choosing different salt is to avoid having the same operation identifier again.

5.  After scheduling the transaction using a timelock, the developer must call the execute() function with the provided arguments (same as above). - If the execute() function is called before the specified `delay` time has passed, the transaction will revert with the error message "TimelockController: operation is not ready". This is because the timelock is designed to ensure that the specified delay time has elapsed before the transaction can be executed. - Once the delay time has passed, the transaction can be executed normally.
</details>

<details>
<summary>Bridge Contract Operations</summary>

### Bridge Contract Account Permission

- There are only two roles: DEFAULT_ADMIN_ROLE and WITHDRAW_ROLE.
- The TimeLock contract is assigned the DEFAULT_ADMIN_ROLE, while another Gnosis Safe is assigned the WITHDRAW_ROLE.
- The DEFAULT_ADMIN_ROLE has the ability to grant both roles to other addresses, but these changes will happen instantly once executed.
- Both addresses can renounce their own roles by calling the renounceRole() function.

### Bridge ERC20 tokens - to transfer ERC20 tokens from an EOA to the Bridge

- Once approving the bridge contract, user will call the `bridgeToDeFiChain()` function with following arguments:
  - `_defiAddress`- address on Defi Chain that receiving funds
  - `_tokenAddress` - ERC20 token's address
  - `_amount` amount to bridge over to Defi chain.

### Add supported token

- Only an address with the Admin role can call the `addSupportedTokens()` function.
  - This function sets the `_tokenCap` for an ERC20 token or ETH, identified by its `_tokenAddress`.
  - All tokens added will be immediately supported by the bridge.
  - For ETH, use `address(0)` as the `_tokenAddress`.
  - The `_tokenCap` defines the maximum balance of tokens the contract can hold for each `_tokenAddress`. Any funds exceeding this cap will be transferred to a specified wallet address in the event of a flush.
  - After adding a supported token to the smart contract, update the token symbol in the server's [.env](./apps/server/.env#L42-L43) variables: `SUPPORTED_EVM_TOKENS` and `SUPPORTED_DFC_TOKENS`.

### Remove Supported Token

- Only an address with the Admin role can call the `removeSupportedTokens()` function. This function also sets the `_tokenCap` to `0`.
- After removing a supported token from the smart contract, remove the token symbol from the server's [.env](./apps/server/.env#L42-L43) variables: `SUPPORTED_EVM_TOKENS` and `SUPPORTED_DFC_TOKENS`.

### Withdraw

- `withdraw()` function when called will withdraw an ERC20 token and ETH (address == 0x0). Only the address with the WITHDRAW role can call this function.

### flushMultipleTokenFunds

- `flushMultipleTokenFunds(uint256 _fromIndex, uint256 _toIndex)` function to flush the excess funds `(token.balanceOf(Bridge) - tokenCap)` across supported tokens to a hardcoded address (`flushReceiveAddress`) anyone can call this function.
  - For example, calling flushMultipleTokenFunds(0,3), only the tokens at index 0, 1 and 2 will be flushed.
  - This applies to all tokens and ETH.
  - only funds exceeding respective `_tokenCap` will be transferred to a specified wallet address in the event of a flush.

### flushFundPerToken

- `flushFundPerToken(address _tokenAddress)` is doing same as above function, however doing on token basis instead of from and to indexes.

### Change Flush Receive Address

- Admin address can change `flushReceiveAddress`.
  - `changeFlushReceiveAddress` function will reset the `flushReceiveAddress` to new address.

### Change relayer address

- Admin address can change `relayerAddress`.
  - The relayer address will primarily be used for verifying the signature that is signed by the server.
  - The server will need to sign with the corresponding private key of the relayer address.

### Transaction fee change

- Only address with Admin role can change `transactionFee`.
  - Initial fee will be set to 0%.
  - This means that if the user bridges `X` tokens, 100% of X will be bridged to defiChain.
  - If in the future, fee > 0, respected amount will be sent to `communityWallet`.

### Change Tx Fee AddressHere's the continuation of the markdown with improved indentation and formatting within collapsible sections:

### Change Tx Fee Address

- Only address with admin role can change `communityWallet`.
  - This is where the tx fees upon bridging will go.

### Change Token Cap

- Only address with admin role can change `tokenCap`.

### Modify admin and operational address

- `grantRole` and `revokeRole` will be used to grant a role to new addresses and revoke the existing addresses role respectively.
- Only Admin address can make these changes.

## Deployed Smart Contracts on Sepolia Testnet

<details>
<summary>Deploy ERC20 Tokens 'MUSDT' & 'MUSDC'</summary>

- To deploy ERC20 tokens, user will have to run the command:
  - `npx hardhat run --network sepolia ./scripts/deployERC20.ts` in the smartContract directory.
- To verify the said tokens and other contracts, there would be a prompt on the terminal after running the deployment command that developers will need to follow.
- Developers need to deploy the `BridgeV1` implementation contract before the `BridgeProxy`.
  - `BridgeProxy` should only need to be deployed _once_ to a blockchain. Subsequent deployments should only be deploying the implementation contract (`BridgeV2`, `BridgeV3`, etc.), before calling `_upgradeTo` of the `BridgeProxy` contract.
  - This follows the [proxy pattern](https://blog.openzeppelin.com/proxy-patterns/), with the behavior being inherited from `OpenZeppelin` proxy contracts.
- `BridgeV1` can be deployed with the command:
  - `npx hardhat run --network sepolia ./scripts/deployBridgeImplementation.ts`
- `BridgeProxy` can be deployed with:
  - `npx hardhat run --network sepolia ./scripts/deployBridgeProxy.ts`
- Before running the above command, following `vars` need to be addressed:
  - `ADMIN_ADDRESS`
  - `OPERATIONAL_ADDRESS`
  - `RELAYER_ADDRESS`
  - `TRANSACTION_FEE`
  - `BRIDGE_IMPLEMENTATION_ADDRESS` aka `BridgeV1` contract address.

</details>

## Mainnet Addresses

<details>
<summary>TimeLock</summary>

- Time Lock Contract address:
  - [0xbfe4a2126313bcdc44daf3551b9f22ddda02c937](https://etherscan.io/address/0xbfe4a2126313bcdc44daf3551b9f22ddda02c937)

</details>

<details>
<summary>BridgeV1</summary>

- BridgeV1 Contract address:
  - [0x7bdbd5675bad2653cba9bc0e09564dd8d7b53957](https://etherscan.io/address/0x7bdbd5675bad2653cba9bc0e09564dd8d7b53957)

</details>

<details>
<summary>BridgeProxy</summary>

- BridgeProxy Contract address:
  - [0x54346d39976629b65ba54eac1c9ef0af3be1921b](https://etherscan.io/address/0x54346d39976629b65ba54eac1c9ef0af3be1921b)

</details>

<details>
<summary>BridgeQueue</summary>

- BridgeQueue Contract address:
  - [0x180520fffecb138a042b473aa131673deff40cdb](https://etherscan.io/address/0x180520fffecb138a042b473aa131673deff40cdb)

</details>

<details>
<summary>BridgeQueueProxy</summary>

- BridgeQueueProxy Contract address:
  - [0xba188cdec7b48e6f1079256208b96f067e385ff1](https://etherscan.io/address/0xba188cdec7b48e6f1079256208b96f067e385ff1)

</details>

## Sepolia Testnet Addresses

<details>
<summary>Mock USDT</summary>

- [0x5e19180828c6942b42e3cE860C564610e064fEee](https://sepolia.etherscan.io/address/0x5e19180828c6942b42e3cE860C564610e064fEee)

</details>

<details>
<summary>Mock USDC</summary>

- [0x754028ed11D02f8f255410d32704839C33142b44](https://sepolia.etherscan.io/address/0x754028ed11D02f8f255410d32704839C33142b44)

</details>

<details>
<summary>Mock EUROC</summary>

- [0xc8042c992c9627dF9e84ddf57Bc6adc1AB9C3acd](https://sepolia.etherscan.io/address/0xc8042c992c9627dF9e84ddf57Bc6adc1AB9C3acd)

</details>

<details>
<summary>Mock DFI</summary>

- [0x1f84B07483AC2D5f212a7bF14184310baE087448](https://sepolia.etherscan.io/address/0x1f84B07483AC2D5f212a7bF14184310baE087448)

</details>

<details>
<summary>Mock WBTC</summary>

- [0x8B3d701B187D8Eb8c0b9368AebbAAFC62D3fa0e1](https://sepolia.etherscan.io/address/0x8B3d701B187D8Eb8c0b9368AebbAAFC62D3fa0e1)

</details>

<details>
<summary>Mock MaticToken</summary>

- [0x0B36470228F0B8C8E0313ba0C4356520F50cE85b](https://sepolia.etherscan.io/address/0x0B36470228F0B8C8E0313ba0C4356520F50cE85b)

</details>

<details>
<summary>Timelock Controller</summary>

- [0x7A5A990EBaC71e56538C9311A6E080fe6e6Cdf0A](https://sepolia.etherscan.io/address/0x7A5A990EBaC71e56538C9311A6E080fe6e6Cdf0A)

</details>

<details>
<summary>Bridge Queue Proxy</summary>

- [0x29D6d5f8ad010b548D0dC68d8b50c043c4bED1Cc](https://sepolia.etherscan.io/address/0x29D6d5f8ad010b548D0dC68d8b50c043c4bED1Cc)

</details>

<details>
<summary>Bridge Queue</summary>

- [0x964B2feE939aa623869c7380f4e83789f98b2e88](https://sepolia.etherscan.io/address/0x964B2feE939aa623869c7380f4e83789f98b2e88)

</details>

<details>
<summary>Bridge V1 Proxy</summary>

- [0x62cAa18a745b3d61E81f64e5B47c1A21dE8155bA](https://sepolia.etherscan.io/address/0x62cAa18a745b3d61E81f64e5B47c1A21dE8155bA)

</details>

<details>
<summary>Bridge V1</summary>

- [0xD321B5EfB5E8E3aE630d13DB2A00eB50eEBEFd4E](https://sepolia.etherscan.io/address/0xD321B5EfB5E8E3aE630d13DB2A00eB50eEBEFd4E)

</details>

## Fund Bridge ERC20 Tokens

<details>
<summary>Add funds</summary>

- Anyone can send funds to the bridge contract. Ideally, this should be done by liquidity providers.
- If there are tokens sent by other addresses to the contract, those tokens will be unaccounted for.
- Admins can send ERC20 tokens via the `transfer(address _to, uint256 _amount)` function or utilizing wallets such as Metamask.

</details>
</details>
