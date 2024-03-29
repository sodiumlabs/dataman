// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from 'next'
import { get } from '@vercel/edge-config';
import cors from '../../xcors';
import { getRpcUrl } from './tokenmeta';

export const config = {
  runtime: "edge",
}

type TokenBalance = {
  tokenAddress: string;
  balance: string;
}
type TokenBalances = TokenBalance[];

const ankrAPIURLPromise = get("ankrAPIURL");
const alchemyAPIKeyPromise = get("alchemyAPIKey");

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
    fallbackAlchemy,
    fallbackLumiLayer3,
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
        'Cache-Control': 'max-age=2',
        'CDN-Cache-Control': 'max-age=2',
        'Vercel-CDN-Cache-Control': 'max-age=2',
        'content-type': 'application/json',
      },
    }
  ))
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
  const result = await fetch(`${await ankrAPIURLPromise}`, {
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
        tokenPrice: string,
      }[]
    },
  } = await result.json();
  return response.result.assets.filter(t => t.tokenType != "NATIVE" && t.balanceRawInteger != "0").map(t => {
    return {
      tokenAddress: t.contractAddress,
      balance: t.balanceRawInteger,
    }
  });
}

async function fallbackAlchemy(chainId: string, walletAddress: string): Promise<TokenBalances> {
  const convertChainId2ConvalenthqChain = (chainId: string): string => {
    switch (chainId) {
      case "42161": return "arb-mainnet";
      default:
        throw new Error(`chainId ${chainId} is not supported`);
    }
  }
  const chain = convertChainId2ConvalenthqChain(chainId);
  // {
  //   "jsonrpc": "2.0",
  //   "id": 1,
  //   "result": {
  //     "address": "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5",
  //     "tokenBalances": [
  //       {
  //         "contractAddress": "0x124b29b1b4474a9623db84adefbbe3f33fa13560",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000065d641cef669d0000"
  //       },
  //       {
  //         "contractAddress": "0x147c863bf7f1a3e89979a851cd2334161ad3dda7",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000086e3eed07c3330000"
  //       },
  //       {
  //         "contractAddress": "0x39d6d7977e0a5bbf61195bcb805568264bcd6bd9",
  //         "tokenBalance": "0x00000000000000000000000000000000000000000000000029a2241af62c0000"
  //       },
  //       {
  //         "contractAddress": "0x4b348bc7e0ffa13a4e6b023fe8a34a8d0c4204cb",
  //         "tokenBalance": "0x000000000000000000000000000000000000000000000054ad1ac42b58280000"
  //       },
  //       {
  //         "contractAddress": "0x4d65ee521fd9634355870a633efff99424198e67",
  //         "tokenBalance": "0x000000000000000000000000000000000000000000000053ead0c65830b00000"
  //       },
  //       {
  //         "contractAddress": "0x6f52bd141491a91893ec856a12f79b172c2380b4",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000001bc16d674ec80000"
  //       },
  //       {
  //         "contractAddress": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000"
  //       },
  //       {
  //         "contractAddress": "0x8f9c0f13260adac34f8b040a0143ea6f56f6cb88",
  //         "tokenBalance": "0x00000000000000000000000000000000000000000000000571847d55fb3a1000"
  //       },
  //       {
  //         "contractAddress": "0x93f0d8d2e7996da76dea3cad99bad6a6e0d4e144",
  //         "tokenBalance": "0x000000000000000000000000000000000000000000000036921bbf6ae1c9f000"
  //       },
  //       {
  //         "contractAddress": "0xa2b2a0a158dfeeebb665cabe9a01f1b9151718b9",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000096182e7e45ad7a000"
  //       },
  //       {
  //         "contractAddress": "0xaa54e84a3e6e5a80288d2c2f8e36ea5ca3a3ca30",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000000000000002e90edd000"
  //       },
  //       {
  //         "contractAddress": "0xcb32dbfcecb38e9270cd6007b609b9e2304e437d",
  //         "tokenBalance": "0x0000000000000000000000000000000000000000000002ca5c53409fed372400"
  //       },
  //       {
  //         "contractAddress": "0xd411cedd7ff1a1d9bcd4aa47fecd45678583d926",
  //         "tokenBalance": "0x000000000000000000000000000000000000000000000053978c7e2244580000"
  //       },
  //       {
  //         "contractAddress": "0xde5d5e18c0264262436490f98366c666be476b54",
  //         "tokenBalance": "0x00000000000000000000000000000000000000000000021e19e0c9bab2400000"
  //       },
  //       {
  //         "contractAddress": "0xe526079f4188f0494d6c74b716eb8eb4074f4b71",
  //         "tokenBalance": "0x000000000000000000000000000000000000000000000058ae903d9f47cc4000"
  //       },
  //       {
  //         "contractAddress": "0xfcd658dd020252c9e25552af69849e39e4c0eb22",
  //         "tokenBalance": "0x00000000000000000000000000000000000000000000000c7dd6f30802907000"
  //       }
  //     ]
  //   }
  // }
  console.debug(`https://${chain}.g.alchemy.com/v2/${await alchemyAPIKeyPromise}`);
  const result = await fetch(`https://${chain}.g.alchemy.com/v2/${await alchemyAPIKeyPromise}`, {
    method: "POST",
    body: JSON.stringify({
      "id": 1,
      "jsonrpc": "2.0",
      "method": "alchemy_getTokenBalances",
      "params": [
        walletAddress,
        "erc20"
      ]
    }),
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
    }
  });

  if (!result.ok) {
    throw new Error(`Unexpected response: ${result.status} ${result.statusText}`);
  }
  const response: {
    result: {
      address: string,
      tokenBalances: {
        contractAddress: string,
        tokenBalance: string,
      }[]
    }
  } = await result.json();

  console.debug(response);

  return response.result.tokenBalances.filter(t => t.tokenBalance != "0x0000000000000000000000000000000000000000000000000000000000000000").map(t => {
    return {
      tokenAddress: t.contractAddress,
      balance: t.tokenBalance,
    }
  });
}

async function fallbackLumiLayer3(chainId: string, walletAddress: string): Promise<TokenBalances> {
  if (chainId != "94168") {
    throw new Error(`chainId ${chainId} is not supported`);
  }
  // {
  //   "items": [
  //     {
  //       "token": {
  //         "address": "0x0a67a249Dc74465fa013c79F7Bb7aAEd8E9546dd",
  //         "circulating_market_cap": null,
  //         "decimals": "18",
  //         "exchange_rate": null,
  //         "holders": "64",
  //         "icon_url": null,
  //         "name": "Lumi Finance USD",
  //         "symbol": "LUAUSD",
  //         "total_supply": "8984062996134723989789",
  //         "type": "ERC-20"
  //       },
  //       "token_id": null,
  //       "token_instance": null,
  //       "value": "16247414979260000000"
  //     }
  //   ],
  //   "next_page_params": null
  // }
  // https://scan-api.layerlumi.com/api/v2/addresses/0xa225f7262a654f1fe2518ab8933f1b9d8023d6df/tokens?type=ERC-20
  const result = await fetch(`https://scan-api.layerlumi.com/api/v2/addresses/${walletAddress}/tokens?type=ERC-20`);
  if (result.status != 200) {
    throw new Error(`Unexpected response: ${result.status} ${result.statusText}`);
  }

  const response: {
    items: {
      token: {
        address: string,
        circulating_market_cap: string,
        decimals: string,
        exchange_rate: string,
        holders: string,
        icon_url: string,
        name: string,
        symbol: string,
        total_supply: string,
        type: string,
      },
      token_id: string,
      token_instance: string,
      value: string,
    }[],
    next_page_params: unknown,
  } = await result.json();

  return response.items.filter(t => t.value != "0").map(t => {
    return {
      tokenAddress: t.token.address,
      balance: t.value,
    }
  });
}