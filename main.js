import 'dotenv/config';
import axios from 'axios';
import fs from 'fs/promises';

// 检查并获取API Key
async function getApiKey(readline) {
  try {
    // 检查.env文件是否存在
    await fs.promises.access('.env');
    const envContent = await fs.promises.readFile('.env', 'utf-8');
    
    // 如果.env文件不为空且包含API Key
    if (envContent && envContent.includes('IPROYAL_API_KEY=')) {
      return;
    }
  } catch (err) {
    // .env文件不存在
  }

  // 提示用户输入API Key
  const apiKey = await readline.question('请输入IPRoyal API Key（直接按回车将以无代理模式运行）：');
  
  if (apiKey) {
    // 将API Key保存到.env文件
    await fs.promises.writeFile('.env', `IPROYAL_API_KEY=${apiKey}\n`);
    log.info('API Key已保存到.env文件');
  } else {
    log.warn('未提供API Key，将以无代理模式运行');
  }
}
import log from "./utils/logger.js";
import iniBapakBudi from "./utils/banner.js";

/**
 * 读取钱包文件
 * @returns {Promise<Array>} 返回钱包地址数组
 */
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

/**
 * 获取IPRoyal动态代理
 * @returns {Promise<Array>} 返回代理地址数组 
 */
export async function readProxies() {
    try {
        // IPRoyal API配置
        const apiKey = process.env.IPROYAL_API_KEY;
        if (!apiKey) {
            throw new Error('请设置IPRoyal API Key');
        }

        // 获取动态IP
        const response = await axios.get('https://dashboard.iproyal.com/api/proxies', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        // 解析响应并返回代理列表
        return response.data.proxies.map(proxy => {
            return `${proxy.username}:${proxy.password}`;
        });
    } catch (err) {
        log.error('获取IPRoyal代理失败:', err.message);
        return [];
    }
}

/**
 * 领取水龙头
 * @param {string} address 钱包地址
 * @param {Array} proxies 代理列表
 */
const claimFaucet = async (address, proxies) => {
    const maxRetries = 5;
    let attempt = 0;
    let currentProxy = getRandomProxy(proxies);

    while (attempt < maxRetries) {
        try {
            const axiosConfig = {
                method: 'post',
                url: 'https://faucet.haust.app/api/claim',
                data: { address },
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (currentProxy) {
                axiosConfig.httpsAgent = currentProxy.agent;
                log.info(`使用 IPRoyal 动态代理 钱包: ${address}`);
            } else {
                log.warn(`钱包 ${address} 无可用代理，将不使用代理`);
            }

            const response = await axios(axiosConfig);
            log.info(`钱包 ${address} 领取成功:`, response.data);
            return;
        } catch (error) {
            attempt++;
            log.error(`钱包 ${address} 领取失败: ${error.message}`);
            if (attempt < maxRetries) {
                currentProxy = getRandomProxy(proxies);
                // 增加请求间隔时间以避免429错误
                const delay = Math.min(5000, 1000 * Math.pow(2, attempt)); // 指数退避
                log.info(`等待 ${delay} 毫秒后重试...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                log.error(`钱包 ${address} 领取失败，已达最大重试次数 ${maxRetries}`);
            }
        }
    }
};

import IPRoyalProxy from './utils/proxy.js';

function getRandomProxy(proxies) {
    if (proxies.length === 0) {
        return null;
    }
    
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    return new IPRoyalProxy(proxy);
}

// 显示主菜单
function showMenu() {
    console.log(`
==========================
        HAUST BOT
==========================
1. 创建新钱包
2. 自动领取测试代币
3. 自动部署合约交互
4. 分发 Sepolia ETH
5. 退出
`);
}

// 处理菜单选择
async function handleMenu(choice, readline) {
    switch (choice) {
        case '1':
            await createNewWallets(readline);
            break;
        case '2':
            await autoClaimFaucet();
            break;
        case '3':
            await deployAndInteract();
            break;
        case '4':
            await distributeSepoliaETH(readline);
            break;
        case '5':
            process.exit(0);
        default:
            log.warn("无效的选择，请输入 1-5 之间的数字");
    }
}

// 创建新钱包
async function createNewWallets(readline) {
    try {
        const { ethers } = await import('ethers');
        const numWallets = await readline.question("请输入要创建的钱包数量: ");
        const count = parseInt(numWallets) || 1;
        const wallets = [];

        for (let i = 0; i < count; i++) {
            const wallet = ethers.Wallet.createRandom();
            wallets.push({
                address: wallet.address,
                privateKey: wallet.privateKey
            });
        }

        await fs.writeFile('wallets.json', JSON.stringify(wallets, null, 2));
        log.success(`成功创建 ${count} 个新钱包`);
    } catch (error) {
        log.error("创建钱包时出错:", error.message);
    }
}

// 自动部署合约交互
async function deployAndInteract() {
    try {
        const { spawn } = await import('child_process');
        const deployProcess = spawn('node', ['deploy.js'], {
            stdio: 'inherit'
        });

        deployProcess.on('close', async (code) => {
            if (code === 0) {
                log.success('合约部署完成');
            } else {
                log.error(`部署进程退出，代码: ${code}`);
            }
            // 等待用户按回车键继续
            const readline = (await import('node:readline/promises')).createInterface({
                input: process.stdin,
                output: process.stdout
            });
            await readline.question("按回车键返回主菜单...");
            readline.close();
        });

        deployProcess.on('error', (err) => {
            log.error(`部署进程错误: ${err.message}`);
        });
    } catch (error) {
        log.error("部署合约时出错:", error.message);
    }
}

// 分发 Sepolia ETH
async function distributeSepoliaETH(readline) {
    try {
        const wallets = await readWallets();
        if (wallets.length < 2) {
            log.warn("至少需要 2 个钱包才能进行 ETH 分发");
            return;
        }

        const amount = await readline.question("请输入要分发的 ETH 数量: ");

        log.info(`正在从 ${wallets[0].address} 分发 ${amount} ETH...`);
        const { exec } = await import('child_process');
        exec(`node bridge.js ${amount}`, (error, stdout, stderr) => {
            if (error) {
                log.error(`分发 ETH 时出错: ${error.message}`);
                return;
            }
            if (stderr) {
                log.error(`分发 ETH 时出错: ${stderr}`);
                return;
            }
            log.success("ETH 分发完成");
            console.log(stdout);
        });
    } catch (error) {
        log.error("分发 ETH 时出错:", error.message);
    }
}

// 自动领取功能
async function autoClaimFaucet() {
    const wallets = await readWallets();
    const proxies = await readProxies();

    if (wallets.length === 0) {
        log.warn("没有可处理的钱包地址");
        return;
    }

    const tasks = wallets.map((wallet) => {
        if (proxies.length > 0) {
            log.info(`开始处理钱包 ${wallet.address} 的领取流程`);
        } else {
            log.warn(`钱包 ${wallet.address} 无可用代理，将不使用代理`);
        }

        return claimFaucet(wallet.address, proxies);
    });

    try {
        await Promise.all(tasks);
        log.info("所有钱包领取处理完成");
    } catch (error) {
        log.error("处理钱包领取时出错:", error.message);
    }
}

// 显示钱包信息
async function showWallets() {
    const wallets = await readWallets();
    if (wallets.length === 0) {
        log.warn("没有可用的钱包信息");
        return;
    }

    log.info("当前钱包信息：");
    wallets.forEach((wallet, index) => {
        log.info(`${index + 1}. ${wallet.address}`);
    });
}

// 显示代理信息
async function showProxies() {
    const proxies = await readProxies();
    if (proxies.length === 0) {
        log.warn("没有可用的代理信息");
        return;
    }

    log.info("当前代理信息：");
    proxies.forEach((proxy, index) => {
        log.info(`${index + 1}. ${proxy}`);
    });
}

// 主程序
const main = async () => {
    log.info(iniBapakBudi);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 使用 node:readline/promises 模块
    const readline = (await import('node:readline/promises')).createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // 获取API Key
    await getApiKey(readline);

    while (true) {
        showMenu();
        const choice = await readline.question("请选择要执行的操作 (1-5): ");
        
        await handleMenu(choice, readline);
        
        // 等待用户按回车键继续
        await readline.question("按回车键返回主菜单...");
    }
    
    readline.close();
};

main();
