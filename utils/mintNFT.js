import { ethers } from 'ethers';
import log from "./logger.js";

const NFT_CONTRACT = '0x5E2C8EF3035feeC3056864512Aaf8f4dc88CaEe3';

export async function mintNFT(privateKey, rpcUrl) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);

        const abi = [
            "function mint(address to) external",
            "function balanceOf(address owner) external view returns (uint256)"
        ];

        const contract = new ethers.Contract(NFT_CONTRACT, abi, wallet);

        // 检查当前钱包的NFT余额
        const balance = await contract.balanceOf(wallet.address);
        log.info(`Current NFT balance: ${balance}`);

        // 铸造NFT
        log.info(`Minting NFT to ${wallet.address}...`);
        const tx = await contract.mint(wallet.address, { gasLimit: 300000 });
        await tx.wait();

        log.info(`NFT Mint Transaction confirmed: ${tx.hash}`);

        // 验证新的余额
        const newBalance = await contract.balanceOf(wallet.address);
        log.info(`New NFT balance: ${newBalance}`);

    } catch (error) {
        log.error("Error minting NFT:", error.message);
    }
}