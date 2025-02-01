import fs from 'fs/promises';
import log from "./utils/logger.js"
import iniBapakBudi from "./utils/banner.js"
import { ethers } from 'ethers';
import readline from 'readline';

const USDT = '0x93C5d30a7509E60871B77A3548a5BD913334cd35';
const USDC = '0xadbf21cCdFfe308a8d83AC933EF5D3c98830397F';
const WBTC = '0x21472DF1B5d2b673F6444B41258C6460294a2C06';
const BRIDGE_CONTRACT = '0x5E2C8EF3035feeC3056864512Aaf8f4dc88CaEe3';
const RPC_URL = 'https://sepolia.drpc.org';

async function readWallets() {
    try {
        await fs.access("wallets.json");

        const data = await fs.readFile("wallets.json", "utf-8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.info("No wallets found in wallets.json");
            return [];
        }
        throw err;
    }
}
async function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}


const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

async function retry(operation, name) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === MAX_RETRIES - 1) throw error;
            log.warn(`Retrying ${name} operation in ${RETRY_DELAY/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

export async function bridgeAsset(privateKey) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const contracts = [
        { name: "USDT", address: USDT },
        { name: "USDC", address: USDC },
        { name: "WBTC", address: WBTC },
    ];

    for (const { name, address: contractAddress } of contracts) {
        const abi = [
            "function mint(address to, uint256 amount) external",
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function bridgeAsset(uint32 destinationNetwork, address destinationAddress, uint256 amount, address token, bool forceUpdateGlobalExitRoot, bytes permitData) external"
        ];
        const contract = new ethers.Contract(contractAddress, abi, wallet);
        const contractBridge = new ethers.Contract(BRIDGE_CONTRACT, abi, wallet);

        const to = wallet.address;
        const amount = ethers.parseUnits("10000", 6);

        try {
            // Mint tokens with retry
            log.info(`Minting ${ethers.formatUnits(amount, 6)} ${name} tokens to ${to}...`);
            const tx = await retry(async () => {
                const tx = await contract.mint(to, amount);
                await tx.wait();
                return tx;
            }, `${name} mint`);
            log.info(`${name} Mint Transaction confirmed:`, tx.hash);

            // Approve tokens with retry
            log.info(`Approving ${ethers.formatUnits(amount, 6)} ${name} tokens for ${BRIDGE_CONTRACT}...`);
            const approveTx = await retry(async () => {
                const tx = await contract.approve(BRIDGE_CONTRACT, amount);
                await tx.wait();
                return tx;
            }, `${name} approve`);
            log.info(`${name} Approve Transaction confirmed:`, approveTx.hash);

            // Bridge tokens with retry
            const randomAmount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
            const bridgeAmount = randomAmount * 10 ** 6;
            log.info(`Bridging ${randomAmount} ${name} tokens to Haust network...`);

            const bridgeTx = await retry(async () => {
                const tx = await contractBridge.bridgeAsset(
                    1,
                    to,
                    bridgeAmount,
                    contractAddress,
                    true,
                    "0x",
                    { gasLimit: 500000 }
                );
                await tx.wait();
                return tx;
            }, `${name} bridge`);
            log.info(`${name} Bridge Transaction confirmed:`, bridgeTx.hash);
            console.log(`\n`);

        } catch (error) {
            log.error(`Error during ${name} operations after all retries:`, error.message || error);
            continue;
        }
    }
}

// Function to send faucet to a wallet
export async function sendFaucet(faucetAmount, addressRecipient, pvkey) {
    log.info(`Sending Faucet ${faucetAmount} To Address ${addressRecipient}`);
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(pvkey, provider);

        const tx = {
            to: addressRecipient,
            value: ethers.parseEther(faucetAmount),
            gasLimit: 21000,
        };

        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait();
        log.info(`Transaction confirmed:`, txResponse.hash);
    } catch (error) {
        log.error("Error sending faucet:", error.message);
    }
}

async function distributeFaucet(wallets) {
    const faucetAmount = await askQuestion('How Many ETH You Want To Send to each address, example 0.01 : ')
    try {
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[0];
            const nextWallet = wallets[i + 1];

            await sendFaucet(faucetAmount, nextWallet.address, wallet.privateKey);
        }
    } catch (error) {
        log.error("Error distributing faucet:", error.message);
    }
}

async function processBatch(wallets, startIdx, batchSize) {
    const endIdx = Math.min(startIdx + batchSize, wallets.length);
    const batch = wallets.slice(startIdx, endIdx);
    
    await Promise.all(
        batch.map(async (wallet) => {
            try {
                log.info(`Starting Processing for wallet: ${wallet.address}`);
                await bridgeAsset(wallet.privateKey);
            } catch (error) {
                log.error(`Error processing wallet ${wallet.address}:`, error.message);
            }
        })
    );
}

async function main() {
    log.info(iniBapakBudi);
    const wallets = await readWallets();
    if (wallets.length === 0) {
        log.warn("No wallets to process.");
        return;
    }

    log.info(`Found ${wallets.length} existing wallets...`);
    log.info(`do you want to turn on auto distribute eth sepolia?`);
    const isFacuet = await askQuestion('Make sure your first wallet in wallets.json have sepolia eth (y/n) : ')
    if (isFacuet === 'y') {
        await distributeFaucet(wallets);
    }

    try {
        const batchSize = 5;
        for (let i = 0; i < wallets.length; i += batchSize) {
            log.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(wallets.length/batchSize)}...`);
            await processBatch(wallets, i, batchSize);
        }
        log.info("All batches processed successfully.");
    } catch (error) {
        log.error("Error in batch processing:", error.message);
    }
}

main();
