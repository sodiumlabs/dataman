// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from 'next'
import mumbaiTokenList from '../../tokenlist/mumbai.json';
import polygonTokenList from '../../tokenlist/polygon.json';
import { get } from '@vercel/edge-config';
import { defaultAbiCoder } from '@ethersproject/abi';
import cors from '../../xcors';

export const config = {
    runtime: "edge",
}

type TokenMetadata = {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
    centerData: {
        logoURI?: string;
        website?: string;
        description?: string;
    }
}

type TokenInfo = {
    chainId: number;
    name: string;
    symbol: string;
    address: string;
    logoURI: string;
    extensions: {
        description?: string;
    }
}

export default async function handler(req: NextApiRequest) {
    const { searchParams } = new URL(req.url!)
    // const { chainId, walletAddress } = req.query;
    const chainId = searchParams.get("chainId");
    const tokenAddress = searchParams.get("tokenAddress");

    if (!chainId || !tokenAddress) {
        return cors(req, new Response(
            JSON.stringify({
                error: 'Missing chainId or tokenAddress',
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

    const queue = [
        fallbackSodiumTokenList,
        fallbackThirdPartyTokenList,
        fallbackRpc
    ];

    let result: TokenMetadata | null = null;
    let latestError: unknown;
    let success = false;
    for (const fallback of queue) {
        try {
            result = await fallback(chainId, tokenAddress);
            success = true;
            break;
        } catch (e) {
            latestError = e;
        }
    }

    if (!success) {
        throw latestError;
    }

    return cors(req, new Response(
        JSON.stringify(result),
        {
            status: 200,
            headers: {
                // cache for 1 hour
                // stale-while-revalidate: 1.5 hour
                'cache-control': 's-maxage=3600, stale-while-revalidate=5400',
                'content-type': 'application/json',
            },
        }
    ))
}


async function fallbackSodiumTokenList(chainId: string, tokenAddress: string): Promise<TokenMetadata> {
    const getTokenList = (chainId: string) => {
        switch (chainId) {
            case "137":
                return polygonTokenList;
            case "80001":
                return mumbaiTokenList;
            default:
                throw new Error(`Unsupported chainId ${chainId}`);
        }
    }
    const tokenList = getTokenList(chainId);
    const tokenInfo = tokenList.tokens.find((tokenInfo: TokenInfo) => tokenInfo.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!tokenInfo) {
        throw new Error(`Token ${tokenAddress} not found in token list`);
    }
    const { name, symbol, address, decimals, logoURI, extensions } = tokenInfo;
    return {
        name,
        symbol,
        address,
        decimals,
        centerData: {
            logoURI,

            // @ts-ignore
            description: extensions?.description,
        }
    }
}


// Third Party Sources
const thirdParySources: {
    [chainId: string]: string[];
} = {
    "80001": [
        "https://api-polygon-tokens.polygon.technology/tokenlists/testnet.tokenlist.json"
    ],
    "137": [
        "https://api-polygon-tokens.polygon.technology/tokenlists/polygonTokens.tokenlist.json"
    ]
};

const thirdParySourcesCache: {
    [chainId: string]: {
        [key: number]: Promise<Response>;
    }
} = {}

async function fallbackThirdPartyTokenList(chainId: string, tokenAddress: string): Promise<TokenMetadata> {
    const sources = thirdParySources[chainId];
    if (!sources) {
        throw new Error(`Unsupported chainId ${chainId}`);
    }
    for (const sourceIndex in sources) {
        let response: Promise<Response>;
        if (thirdParySourcesCache[chainId] && !!thirdParySourcesCache[chainId][sourceIndex]) {
            response = thirdParySourcesCache[chainId][sourceIndex];
        } else {
            const source = sources[sourceIndex];
            response = fetch(source);
            thirdParySourcesCache[chainId][sourceIndex] = response;
        }
        const tokenList = await (await response).json();
        const tokenInfo = tokenList.tokens.find((tokenInfo: TokenInfo) => tokenInfo.address.toLowerCase() === tokenAddress.toLowerCase());
        if (!tokenInfo) {
            continue;
        }
        const { name, symbol, decimals, address, logoURI, extensions } = tokenInfo;
        return {
            name,
            symbol,
            decimals,
            address,
            centerData: {
                logoURI,
                description: extensions?.description,
            }
        }
    }
    throw new Error(`Token ${tokenAddress} not found in token list`);
}

export async function getRpcUrl(chainId: string): Promise<string> {
    const rpcMap = await get("rpcMap");
    if (rpcMap[chainId]) {
        return rpcMap[chainId];
    }
    throw new Error(`Unsupported chainId ${chainId}, no rpc url found`);
}

// fallback to rpc
async function fallbackRpc(chainId: string, tokenAddress: string): Promise<TokenMetadata> {
    const rpcURL = await getRpcUrl(chainId);

    // name: contract.name(),
    // symbol: contract.symbol(),
    // decimals: contract.decimals(),
    const nameABIencoded = "0x06fdde03";
    const symbolABIencoded = "0x95d89b41";
    const decimalsABIencoded = "0x313ce567";

    const sendERC20Call = async <T>(abiEncoded: string, decode: (result: string) => T) => {
        const response = await fetch(rpcURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [
                    {
                        to: tokenAddress,
                        data: abiEncoded,
                    },
                    "latest",
                ],
            }),
        });
        const json = await response.json();
        const result = json.result;
        // abi decode
        return decode(result);
    }

    // send eth_call 
    // get erc20 name
    // get erc20 symbol
    // get erc20 decimals
    const namePromise = sendERC20Call(nameABIencoded, (result: string) => {
        return defaultAbiCoder.decode(['string'], result)[0];
    });
    const symbolPromise = sendERC20Call(symbolABIencoded, (result: string) => {
        return defaultAbiCoder.decode(['string'], result)[0];
    });
    const decimalsPromise = sendERC20Call(decimalsABIencoded, (result: string) => parseInt(result, 16));

    let [name, symbol, decimals] = await Promise.all([namePromise, symbolPromise, decimalsPromise]);

    if (!decimals) {
        decimals = 18;
    }

    return {
        name,
        symbol,
        decimals: decimals,
        address: tokenAddress,
        centerData: {}
    }
}