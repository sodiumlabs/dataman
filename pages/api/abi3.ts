// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from 'next'
import { get } from '@vercel/edge-config';
import { JsonFragment } from '@ethersproject/abi';
import cors from '../../xcors';

export const config = {
    runtime: "edge",
}

type ContractABI = JsonFragment;

type Contract = {
    ContractName: string;
    ABI: ContractABI[];
    Implementation: string;
}

type ContractSerialized = {
    ContractName: string;
    ABI: string;
    Implementation: string;
}

export default async function handler(req: NextApiRequest) {
    const { searchParams } = new URL(req.url!)
    const chainId = searchParams.get("chainId");
    const contractAddress = searchParams.get("contractAddress");

    if (!chainId || !contractAddress) {
        return cors(req, new Response(
            JSON.stringify({
                error: 'Missing chainId or contractAddress',
            }),
            {
                status: 400,
                headers: {
                    // cache for 24 hour
                    'cache-control': 's-maxage=86400',
                    'content-type': 'application/json',
                },
            }
        ))
    }

    const queue = [
        getContractSourceCode
    ];

    let result: Contract | null = null;
    let latestError: unknown;
    let success = false;
    for (const fallback of queue) {
        try {
            result = await fallback(chainId, contractAddress);
            success = true;
            break;
        } catch (e) {
            latestError = e;
        }
    }

    if (!success) {
        // send error to sentry
        console.error(latestError);
    }

    if (result === null) {
        return cors(req, new Response(
            JSON.stringify({
                error: 'Contract not found',
            }),
            {
                status: 200,
                headers: {
                    // cache for 1 hour
                    'cache-control': 's-maxage=3600',
                    'content-type': 'application/json',
                },
            }
        ))
    } 

    return cors(req, new Response(
        JSON.stringify(result),
        {
            status: 200,
            headers: {
                // cache for 24 hour
                // stale-while-revalidate: 25 hour
                'cache-control': 's-maxage=86400, stale-while-revalidate=90000',
                'content-type': 'application/json',
            },
        }
    ))
}

async function getBlockchainScanSourceCodeRequestURLByChainId(chainId: string, contractAddress: string): Promise<string> {
    let apiKey: string | undefined = undefined;
    if (chainId === '137' || chainId === '80001') {
        apiKey = await get('POLYGONSCAN_API_KEY');
    } else {
        throw new Error(`Unsupported chainId: ${chainId}, not supported by getBlockchainScanSourceCodeRequestURLByChainId`);
    }
    console.debug("get", apiKey);
    if (apiKey === undefined) {
        throw new Error(`Missing API KEY, chainId: ${chainId}`);
    }
    switch (chainId) {
        case '137':
            return `https://api.polygonscan.com/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
        case '80001':
            return `https://api.polygonscan.com/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
        default:
            throw new Error(`Unsupported chainId: ${chainId}, not supported by getBlockchainScanSourceCodeRequestURLByChainId`);
    }
}

// Get Contract Source Code for Verified Contract Source Codes
async function getContractSourceCode(chainId: string, contractAddress: string, contractName?: string): Promise<Contract | null> {
    const url = await getBlockchainScanSourceCodeRequestURLByChainId(chainId, contractAddress);
    const response = await fetch(url);

    const json = await response.json();

    if (json.status == '0') {
        throw new Error(`Failed to get contract source code, chainId: ${chainId}, contractAddress: ${contractAddress}, status: ${json.status}, message: ${json.message}, result: ${json.result}`);
    }

    const result: ContractSerialized | undefined = json.result[0];
    if (!result) {
        return null;
    }

    if (result.Implementation !== "" 
        && result.Implementation.toLowerCase() !== contractAddress.toLowerCase()
    ) {
        // proxy contract
        return getContractSourceCode(chainId, result.Implementation, result.ContractName);
    }

    let abi: ContractABI[] = JSON.parse(result.ABI);

    return {
        ContractName: contractName ?? result.ContractName,
        ABI: abi,
        Implementation: result.Implementation,
    };
}