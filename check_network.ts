import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Cluster } from '@solana/web3.js';

import config from './config.json';
import bs58 from 'bs58';
const CONFIRMATION_LEVEL = 'confirmed';

(async () => {
    const bufferPrivateKey = Buffer.from(bs58.decode(config.privateKey));
    const payer            = Keypair.fromSecretKey(new Uint8Array(bufferPrivateKey));
    const connection       = new Connection(clusterApiUrl(config.network as Cluster), CONFIRMATION_LEVEL);
    const solanaBalance    = await connection.getBalance(payer.publicKey);

    console.log(
        '##################### Your Network:', config.network
    );

    console.log(
        "##################### Current wallet", getCurrentAddressByPayer(payer)
    )

    console.log(
        '##################### Your Solana Balance:', formatBalance(solanaBalance)
    );

    console.log(
        "##################### Current RPC", getCurrentRpcByNetwork(config.network)
    )
    

})();

function formatBalance(balance: number) {
    return balance / LAMPORTS_PER_SOL;
}

function getCurrentAddressByPayer(payer: Keypair) {
    return payer.publicKey.toBase58();
}

function getCurrentRpcByNetwork(network: string) {
    return clusterApiUrl(network as Cluster);
}