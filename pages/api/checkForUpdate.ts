import type { NextApiRequest } from 'next'
import cors from '../../xcors';

export const config = {
    runtime: "edge",
}

export default async function handler(req: NextApiRequest) {
    return cors(req, new Response(
        "1.0.0",
        {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        }
    ))
}