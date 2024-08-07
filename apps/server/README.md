### Local setup

Run these commands in the root directory of the server package to get started:

1. **Install Dependencies and Build the Project**

   ```bash
   pnpm install && pnpm build
   ```

   Installs project dependencies and builds the project using the TypeScript compiler.

2. **Start the Necessary Containers**

   ```bash
   pnpm playground:start
   ```

   Runs the necessary Docker containers that the server relies on. This command may take some time to start up the containers.

3. **Run the Server**

   ```bash
   pnpm dev
   ```

   Starts the NestJS server in development mode. This command also runs the necessary database migrations.

## Available Scripts

In addition to the setup commands, you can use the following scripts to manage the server:

- **Build**

  ```bash
  pnpm run build
  ```

  Compiles the TypeScript code into JavaScript using the `tsconfig.build.json` configuration.

- **Clean**

  ```bash
  pnpm run clean
  ```

  Removes the `dist` directory to clean up build artifacts.

- **Development Server**

  ```bash
  pnpm run dev
  ```

  Starts the NestJS server in watch mode. Also runs migrations if any are pending.

- **Docker: Pull**

  ```bash
  pnpm run docker:pull
  ```

  Pulls the latest Docker images for the API and other services.

- **Generate Migrations**

  ```bash
  pnpm run generate:migrations
  ```

  Runs Prisma migration commands and formats the Prisma schema.

- **Generate Prisma Client**

  ```bash
  pnpm run generate:prisma
  ```

  Generates the Prisma client.

- **Lint**

  ```bash
  pnpm run lint
  ```

  Runs ESLint to check for linting errors in your code.

- **Create Migration**

  ```bash
  pnpm run migration:create
  ```

  Creates a new Prisma migration without applying it.

- **Deploy Migrations**

  ```bash
  pnpm run migration:deploy
  ```

  Applies pending Prisma migrations to the database.

- **Development Migrations**

  ```bash
  pnpm run migration:dev
  ```

  Runs Prisma migrations in development mode.

- **Prepare**

  ```bash
  pnpm run prepare
  ```

  Generates the Prisma client. This is often run automatically before other commands.

- **Test**

  ```bash
  pnpm run test
  ```

  Runs Jest tests with coverage reporting and other configurations.

- **E2E Tests**

  ```bash
  pnpm run test:e2e
  ```

  Runs end-to-end tests using Jest.

- **i18n Tests**

  ```bash
  pnpm run test:i9n
  ```

  Runs internationalization (i18n) tests using Jest.

- **Unit Tests**

  ```bash
  pnpm run test:unit
  ```

  Runs unit tests using Jest.

## Docker Setup

If using Docker, ensure you have Docker and Docker Compose installed. You can start the Docker services with:

```bash
pnpm run playground:start
```

## Environment Variables

The environment variables declared in this file are automatically made available in the server. Below is a description of each variable and its purpose.

### Database Configuration

- `POSTGRES_DB`: The name of the PostgreSQL database used by the application. (e.g., `"bridge-db"`)
- `POSTGRES_USER`: The username for accessing the PostgreSQL database. (e.g., `"postgres"`)
- `POSTGRES_PASSWORD`: The password for the PostgreSQL user. (e.g., `"password"`)
- `DATABASE_URL`: The full connection URL for PostgreSQL, constructed from the `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. (e.g., `"postgresql://postgres:password@localhost:5432/bridge-db?schema=public"`)

### Application Configuration

- `APP_VERSION`: The current version of the application. (e.g., `"0.0.0"`)

### Blockchain Configuration

- `ETHEREUM_RPC_URL`: The RPC URL for connecting to the Ethereum network (Sepolia testnet in this case). (e.g., `"https://rpc.ankr.com/eth_sepolia"`)
- `DEFICHAIN_WHALE_URL`: The URL for connecting to the DeFiChain node. (e.g., `"http://localhost:19553"`)
- `DEFICHAIN_NETWORK`: The DeFiChain network name. (e.g., `"Playground"`)

### Bridge Contract Configuration

- `BRIDGE_PROXY_ADDRESS`: The address of the bridge proxy contract on the Ethereum network.
- `BRIDGE_PROXY_DEPLOYMENT_BLOCK_NUMBER`: The block number at which the bridge proxy contract was deployed.
- `BRIDGE_PROXY_TX_INDEX_IN_BLOCK`: The transaction index in the block where the bridge proxy contract was deployed.

### Queue Configuration

- `QUANTUM_QUEUE_PROXY_ADDRESS`: The address of the queue proxy contract.
- `QUEUE_BRIDGE_PROXY_DEPLOYMENT_BLOCK_NUMBER`: The block number at which the queue bridge proxy contract was deployed.
- `QUEUE_BRIDGE_PROXY_TX_INDEX_IN_BLOCK`: The transaction index in the block where the queue bridge proxy contract was deployed.

### Token Addresses

- `USDT_ADDRESS`: The address of the USDT token contract.
- `USDC_ADDRESS`: The address of the USDC token contract.
- `WBTC_ADDRESS`: The address of the WBTC token contract.
- `EUROC_ADDRESS`: The address of the EUROC token contract.
- `DFI_ADDRESS`: The address of the DFI token contract.
- `MATIC_ADDRESS`: The address of the MATIC token contract.
- `XCHF_ADDRESS`: The address of the XCHF token contract.

### Private Keys

- `DEFICHAIN_PRIVATE_KEY`: The private key for the DeFiChain wallet.
- `ETHEREUM_WALLET_PRIVATE_KEY`: The private key for the Ethereum wallet.

### Transaction Fees

- `ETH_FEE_PERCENTAGE`: The fee percentage for Ethereum transactions. (e.g., `"0"`)
- `DFC_FEE_PERCENTAGE`: The fee percentage for DeFiChain transactions. (e.g., `"0.003"`)
- `DEFICHAIN_DUST_UTXO`: The minimum dust UTXO amount for DeFiChain. (e.g., `"0.003"`)
- `DEFICHAIN_RESERVED_AMT`: The reserved amount for DeFiChain transactions. (e.g., `"3"`)

### Supported Tokens

- `SUPPORTED_EVM_TOKENS`: A comma-separated list of supported EVM tokens. (e.g., `"WBTC,ETH,USDT,USDC,EUROC,DFI,MATIC,XCHF"`)
- `SUPPORTED_DFC_TOKENS`: A comma-separated list of supported DFC tokens. (e.g., `"BTC,ETH,USDT,USDC,EUROC,DFI,MATIC,XCHF"`)

### Minimum Queue Amounts

- `ETH_MIN_QUEUE_AMT`: The minimum queue amount for ETH.
- `WBTC_MIN_QUEUE_AMT`: The minimum queue amount for WBTC.
- `USDT_MIN_QUEUE_AMT`: The minimum queue amount for USDT.
- `USDC_MIN_QUEUE_AMT`: The minimum queue amount for USDC.
- `EUROC_MIN_QUEUE_AMT`: The minimum queue amount for EUROC.
- `DFI_MIN_QUEUE_AMT`: The minimum queue amount for DFI.
- `MATIC_MIN_QUEUE_AMT`: The minimum queue amount for MATIC.
- `XCHF_MIN_QUEUE_AMT`: The minimum queue amount for XCHF.
