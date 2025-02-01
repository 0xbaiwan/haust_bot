# HAUST BOT

## 什么是 [Haust Network](https://haust.network/)

Haust Network: 一个多功能的区块链解决方案

Haust 是一个基于以太坊虚拟机 (EVM) 的区块链，专门为微支付解决方案和高 gas 消耗的智能合约设计。Haust Network 利用区块链技术的无许可特性，提供了一个多功能的项目来提供创新的解决方案。

它提供去中心化金融 (DeFi) 解决方案，并率先实现了共生网络。

Haust 具有高安全性和低手续费的特点，并提供了自己的 SDK 用于与 Telegram 和其他消息应用的本地集成。值得注意的是，该网络引入了 Haustoria，这是一个支持在直接连接到 Haust 的各种网络上进行流动性质押的功能。

## 主要功能

### 代理功能
- 支持多种代理类型（HTTP/HTTPS/SOCKS4/SOCKS5）
- 自动获取和管理代理池
- 每个请求使用随机代理
- 代理失败时自动切换
- 支持无代理模式运行
- 内置代理连接测试功能

### 自动铸造/桥接和分发 ETH
- 自动将 ETH 从 Sepolia 分发到 wallets.json 中的其他地址
- 确保 wallets.json 中的第一个钱包有足够的 Sepolia ETH
- 支持批量处理钱包操作
- 智能重试机制，确保交易成功

### NFT 铸造功能
- 支持批量NFT铸造
- 自动处理多个钱包的NFT铸造任务
- 智能分批处理，避免网络拥堵
- 详细的铸造状态日志

### 智能合约部署
- 自动为每个钱包部署智能合约
- 部署失败时自动重试（最多3次）
- 每次重试间隔0.5-3秒随机
- 部署成功后自动进行代币转账测试

## 功能特性

- **自动生成新钱包**
- **自动领取水龙头到新地址**
- **自动部署智能合约**
- **合约部署重试机制**
- **自动分发 Sepolia ETH**
- **NFT批量铸造**
- **代理支持**
  - 支持多种代理协议
  - 每个请求使用随机代理
  - 代理失败时自动切换
  - 支持无代理模式运行
  - 代理连接测试功能
- **所有钱包信息保存在 wallets.json 中**

## 环境要求

- **Node.js**: v16.0.0 或更高版本
- **npm**: v7.0.0 或更高版本

## 安装步骤

1. 克隆本仓库:
   ```bash
   git clone https://github.com/0xbaiwan/haust_bot
   cd haust_bot
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 配置代理（可选）:
   在项目根目录创建 proxy.txt 文件，每行添加一个代理地址，支持以下格式：
   ```
   http://user:pass@host:port
   https://host:port
   socks4://host:port
   socks5://host:port
   ```
4. 运行主程序:
   ```bash
   npm run start
   ```

## 主菜单功能

运行程序后会显示以下菜单：

=======HAUST BOT=======
1. 创建新钱包
2. 自动领取测试代币
3. 自动部署合约交互
4. 分发 Sepolia ETH
5. NFT铸造
6. 测试代理
7. 退出

选择对应数字即可执行相应功能，执行完成后按回车键返回主菜单。

## 保持会话在后台运行（可选）
1. 运行 `screen` 建立新会话窗口；
2. 运行脚本；
3. 成功后， 按 ctrl+A+D 分离会话，此时会话就会在后台运行；
4. 重命名会话。首先 `screen -ls` 查看所有会话列表，找到想要重命名的会话id，如17170，运行 `screen -S 17170 -X sessionname new_name(新名字）`；
5. 运行 `screen -ls` 看看名称是不是变更成功；

## 购买代理（可选）

- 免费静态住宅代理：
   - [WebShare](https://www.webshare.io/?referral_code=gtw7lwqqelgu)
   - [ProxyScrape](https://proxyscrape.com/)
   - [MonoSans](https://github.com/monosans/proxy-list)
- 付费高级静态住宅代理：
   - [922proxy](https://www.922proxy.com/register?inviter_code=d6416857)
   - [Proxy-Cheap](https://app.proxy-cheap.com/r/Pd6sqg)
   - [Infatica](https://dashboard.infatica.io/aff.php?aff=580)
- 付费动态IP代理
   - [IPRoyal](https://iproyal.com/?r=733417)
