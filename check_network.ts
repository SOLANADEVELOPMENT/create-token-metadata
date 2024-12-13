import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Cluster } from '@solana/web3.js';

import config from './config.json';
import bs58 from 'bs58';

(async () => {
    const bufferprivateKey = Buffer.from(bs58.decode(config.privateKey));
    const payer = Keypair.fromSecretKey(new Uint8Array(bufferprivateKey));

    const connection = new Connection(clusterApiUrl(config.network as Cluster), 'confirmed');

    const solanaBalance = await connection.getBalance(payer.publicKey);
    console.log('##################### Your Solana Balance:', solanaBalance / LAMPORTS_PER_SOL);
    console.log('##################### Your Network:', config.network);

})();
