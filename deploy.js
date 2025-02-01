import { ethers } from "ethers";
import solc from "solc";
import fs from "fs/promises";
import banner from "./utils/banner.js";
import log from "./utils/logger.js";

const provider = new ethers.JsonRpcProvider("https://haust-network-testnet-rpc.eu-north-2.gateway.fm");

export async function readWallets() {
    try {
        await fs.access("wallets.json");

        const data = await fs.readFile("wallets.json", "utf-8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.info("未找到 wallets.json 文件");
            return [];
        }
        throw err;
    }
}

// Solidity contract source
const contractSource = `
pragma solidity ^0.8.0;

contract Token {
    string public name = "Haust Token";
    string public symbol = "HAUS";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);

    constructor(uint256 _initialSupply) {
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function mint(address _to, uint256 _value) public {
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Mint(_to, _value);
    }
}
`;

// Compile contract
function compileContract() {
    const input = {
        language: "Solidity",
        sources: { "Token.sol": { content: contractSource } },
        settings: {
            outputSelection: {
                "*": { "*": ["abi", "evm.bytecode.object"] },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const contractData = output.contracts["Token.sol"].Token;
    return { abi: contractData.abi, bytecode: contractData.evm.bytecode.object };
}

async function transferTokens(contract) {
    log.info(`尝试向随机地址转账...`)
    const randomCounts = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    for (let i = 0; i < randomCounts; i++) {
        const wallet = ethers.Wallet.createRandom();
        const recipient = wallet.address;
        const randomAmount = Math.floor(Math.random() * (10000 - 10 + 1)) + 10;
        const amount = ethers.parseUnits(randomAmount.toString(), 18);

        try {
            const transferTx = await contract.transfer(recipient, amount);
            await transferTx.wait();
            log.info(`成功转账 ${randomAmount} 个代币到 ${recipient}`);
        } catch (error) {
            log.error(`转账失败: ${error.message}`);
        }
    }
}

// Deploy contract
async function deployContract(wallet, contractData) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const gasLimit = 5000000;
            const factory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, wallet);
            const initialSupply = ethers.parseUnits("1000000", 18);
            const contract = await factory.deploy(initialSupply, { gasLimit });
            await contract.waitForDeployment();

            const contractAddress = await contract.getAddress();
            log.info(`合约部署成功: ${contractAddress}`);
            await transferTokens(contract);
            return;
        } catch (error) {
            attempt++;
            if (attempt < maxRetries) {
                const delay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
                log.warn(`钱包 ${wallet.address} 部署合约失败，第 ${attempt} 次重试（${delay}ms 后）...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                log.error(`钱包 ${wallet.address} 部署合约失败，已达最大重试次数 ${maxRetries}: ${error.message}`);
            }
        }
    }
}

// Deploy contracts for all wallets
async function deployContractsToAllWallets() {
    log.warn(banner);

    const wallets = await readWallets();
    if (!wallets || wallets.length === 0) {
        log.error("未找到钱包，请先创建钱包");
        process.exit(1);
    }

    log.info(`找到 ${wallets.length} 个现有钱包...`);
    const contractData = compileContract();

    try {
        for (const walletData of wallets) {
            const wallet = new ethers.Wallet(walletData.privateKey, provider);
            log.info(`正在为钱包 ${wallet.address} 部署合约...`);
            await deployContract(wallet, contractData);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        log.success("所有合约部署完成");

    } catch (error) {
        log.error(`合约部署过程中发生错误: ${error.message}`);
    }
}

deployContractsToAllWallets();
setInterval(deployContractsToAllWallets, 24 * 60 * 60 * 1000);
