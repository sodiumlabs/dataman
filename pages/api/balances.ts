// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from 'next'
import { get } from '@vercel/edge-config';
import cors from '../../xcors';

export const config = {
  runtime: "edge",
}

type TokenBalance = {
  tokenAddress: string;
  balance: string;
}
type TokenBalances = TokenBalance[];

const moralisAPIKey = get("moralisAPIKey");
const ankrAPIURL = get("ankrAPIURL");
const convalenthqAPIKey = get("convalenthqAPIKey");

export default async function handler(req: NextApiRequest) {
  const { searchParams } = new URL(req.url!)
  // const { chainId, walletAddress } = req.query;
  const chainId = searchParams.get("chainId");
  const walletAddress = searchParams.get("walletAddress");

  if (!chainId || !walletAddress) {
    return cors(req, new Response(
      JSON.stringify({
        error: 'Missing chainId or walletAddress',
      }),
      {
        status: 400,
        headers: {
          // cache for 1 hour
          'cache-control': 's-maxage=3600',
          'content-type': 'application/json',
        },
      }
    ))
  }

  // 优先使用Convalenthq
  // 如果失败了，再使用Moralis
  // 如果都失败了，返回空数组并且上报错误
  const queue = [
    fallbackAnkr,
    // fallbackConvalenthq,
    // fallbackMoralis,
  ];

  const reportError = (e: unknown) => {
    console.error(e);
  }

  let result: TokenBalances = [];
  let latestError: unknown;
  let success = false;
  for (const fallback of queue) {
    try {
      result = await fallback(chainId, walletAddress);
      success = true;
      break;
    } catch (e) {
      latestError = e;
    }
  }

  if (!success) {
    reportError(latestError);
  }

  return cors(req, new Response(
    JSON.stringify(result),
    {
      status: 200,
      headers: {
        // cache for 2 seconds
        // stale-while-revalidate: 4 seconds
        'cache-control': 's-maxage=2, stale-while-revalidate=4',
        'content-type': 'application/json',
      },
    }
  ))
}

async function fallbackMoralis(chainId: string, walletAddress: string): Promise<TokenBalances> {
  const apiKey = await moralisAPIKey;
  const moralisUrl = "https://deep-index.moralis.io/api/v2";
  const address = walletAddress;
  const convertChainId2MoralisChain = (chainId: string): string => {
    return `0x${parseInt(chainId).toString(16)}`;
  }
  const chain = convertChainId2MoralisChain(chainId);
  console.debug("fetching", `${moralisUrl}/${address}/erc20?chain=${chain}`)
  const response = await fetch(`${moralisUrl}/${address}/erc20?chain=${chain}`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    }
  });

  if (!response.ok) {
    throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
  }

  const result: {
    token_address: string;
    balance: string;
  }[] = await response.json()
  return result.map(t => {
    return {
      tokenAddress: t.token_address,
      balance: t.balance,
    }
  })
}

// covalenthq
// 
async function fallbackConvalenthq(chainId: string, walletAddress: string): Promise<TokenBalances> {
  const convertChainId2ConvalenthqChain = (chainId: string): string => {
    switch (chainId) {
      case "1": return "eth-mainnet";
      case "137": return "matic-mainnet";
      case "80001": return "matic-mumbai";
      // bsc
      case "56": return "bsc-mainnet";
      case "97": return "bsc-testnet";
      default:
        throw new Error(`chainId ${chainId} is not supported`);
    }
  }

  const chain = convertChainId2ConvalenthqChain(chainId);
  const apiKey = await convalenthqAPIKey;
  const result = await fetch(`https://api.covalenthq.com/v1/${chain}/address/${walletAddress}/balances_v2/?key=${apiKey}`, {
    headers: {
      'accept': 'application/json',
    }
  });

  if (!result.ok) {
    throw new Error(`Unexpected response: ${result.status} ${result.statusText}`);
  }

  const response: {
    data: {
      items: {
        contract_address: string,
        native_token: boolean,
        balance: string,
      }[]
    }
  } = await result.json();
  return response.data.items.filter(t => !t.native_token && t.balance != "0").map(t => {
    return {
      tokenAddress: t.contract_address,
      balance: t.balance,
    }
  });
}

// ankr
// 
async function fallbackAnkr(chainId: string, walletAddress: string): Promise<TokenBalances> {
  const convertChainId2AnkrChain = (chainId: string): string => {
    switch (chainId) {
      case "1": return "eth-mainnet";
      case "137": return "matic-mainnet";
      case "80001": return "matic-mumbai";
      case "42161": return "arbitrum";
      // bsc
      case "56": return "bsc-mainnet";
      case "97": return "bsc-testnet";
      default:
        throw new Error(`chainId ${chainId} is not supported`);
    }
  }
  const chain = convertChainId2AnkrChain(chainId);
  console.debug("fetching ankr", `${await ankrAPIURL}`, chain)

  const result = await fetch(`${await ankrAPIURL}`, {
    method: "POST",
    body: JSON.stringify({
      "jsonrpc": "2.0",
      "method": "ankr_getAccountBalance",
      "params": {
        "blockchain": `${chain}`,
        "walletAddress": `${walletAddress}`,
        "onlyWhitelisted": false
      },
      "id": 1
    }),
    headers: {
      'accept': 'application/json',
    }
  });

  if (!result.ok) {
    throw new Error(`Unexpected response: ${result.status} ${result.statusText}`);
  }
  // {
  //   "jsonrpc": "2.0",
  //   "id": 1,
  //   "result": {
  //     "totalBalanceUsd": "18.371699631344101621",
  //     "totalCount": 3,
  //     "assets": [
  //       {
  //         "blockchain": "arbitrum",
  //         "tokenName": "Ether",
  //         "tokenSymbol": "ETH",
  //         "tokenDecimals": 18,
  //         "tokenType": "NATIVE",
  //         "holderAddress": "0xa225f7262a654f1fe2518ab8933f1b9d8023d6df",
  //         "balance": "0.0095302732",
  //         "balanceRawInteger": "9530273200000000",
  //         "balanceUsd": "17.269524631344101621",
  //         "tokenPrice": "1812.070259574940791936",
  //         "thumbnail": "https://ankrscan.io/assets/blockchains/eth.svg"
  //       },
  //       {
  //         "blockchain": "arbitrum",
  //         "tokenName": "Tether USD",
  //         "tokenSymbol": "USDT",
  //         "tokenDecimals": 6,
  //         "tokenType": "ERC20",
  //         "contractAddress": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  //         "holderAddress": "0xa225f7262a654f1fe2518ab8933f1b9d8023d6df",
  //         "balance": "1.102175",
  //         "balanceRawInteger": "1102175",
  //         "balanceUsd": "1.102175",
  //         "tokenPrice": "1",
  //         "thumbnail": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9/logo.png"
  //       },
  //       {
  //         "blockchain": "arbitrum",
  //         "tokenName": "Lumi Finance Token",
  //         "tokenSymbol": "LUA",
  //         "tokenDecimals": 18,
  //         "tokenType": "ERC20",
  //         "contractAddress": "0xc3abc47863524ced8daf3ef98d74dd881e131c38",
  //         "holderAddress": "0xa225f7262a654f1fe2518ab8933f1b9d8023d6df",
  //         "balance": "8.45007333333333335",
  //         "balanceRawInteger": "8450073333333333350",
  //         "balanceUsd": "0",
  //         "tokenPrice": "0",
  //         "thumbnail": ""
  //       }
  //     ],
  //     "syncStatus": {
  //       "timestamp": 1698130128,
  //       "lag": "-1m",
  //       "status": "synced"
  //     }
  //   }
  // }
  const response: {
    result: {
      assets: {
        blockchain: string,
        tokenName: string,
        tokenSymbol: string,
        tokenDecimals: number,
        tokenType: string,
        contractAddress: string,
        holderAddress: string,
        balance: string,
        balanceRawInteger: string,
      }[]
    },
  } = await result.json();
  console.debug(response);
  return response.result.assets.filter(t => t.tokenType != "NATIVE" && t.balanceRawInteger != "0").map(t => {
    return {
      tokenAddress: t.contractAddress,
      balance: t.balanceRawInteger,
    }
  });
}