import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';
import {
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    ExtensionType,
    getMintLen,
    LENGTH_SIZE,
    TOKEN_2022_PROGRAM_ID,
    TYPE_SIZE,
} from '@solana/spl-token';
import type { TokenMetadata } from '@solana/spl-token-metadata';
import {
    createInitializeInstruction,
    pack,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
} from '@solana/spl-token-metadata';
import config from './config.json';
import bs58 from 'bs58';

(async () => {
    const bufferprivateKey = Buffer.from(bs58.decode(config.privateKey));
    const payer = Keypair.fromSecretKey(new Uint8Array(bufferprivateKey));
    const mint = Keypair.generate();
    const decimals = 9;

    const metadata: TokenMetadata = {
        mint: mint.publicKey,
        name: 'Bitcoin Solana OK',
        symbol: 'BTCSOLOK',
        uri: 'https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json',
        additionalMetadata: [['new-field', 'new-value']],
    };

    const mintLen = getMintLen([ExtensionType.MetadataPointer]);

    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // const airdropSignature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    // await connection.confirmTransaction({
    //     signature: airdropSignature,
    //     ...(await connection.getLatestBlockhash()),
    // });

    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
    const mintTransaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint.publicKey,
            space: mintLen,
            lamports: mintLamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
            mint.publicKey,
            payer.publicKey,
            mint.publicKey,
            TOKEN_2022_PROGRAM_ID,
        ),
        createInitializeMintInstruction(mint.publicKey, decimals, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            mint: mint.publicKey,
            metadata: mint.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            mintAuthority: payer.publicKey,
            updateAuthority: payer.publicKey,
        }),

        // add a custom field
        createUpdateFieldInstruction({
            metadata: mint.publicKey,
            updateAuthority: payer.publicKey,
            programId: TOKEN_2022_PROGRAM_ID,
            field: metadata.additionalMetadata[0][0],
            value: metadata.additionalMetadata[0][1],
        }),

        // update a field
        createUpdateFieldInstruction({
            metadata: mint.publicKey,
            updateAuthority: payer.publicKey,
            programId: TOKEN_2022_PROGRAM_ID,
            field: 'name',
            value: metadata.name,
        }),

        // remove a field
        createRemoveKeyInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint.publicKey,
            updateAuthority: payer.publicKey,
            key: 'new-field',
            idempotent: true, // If false the operation will fail if the field does not exist in the metadata
        }),
    );
    const sig = await sendAndConfirmTransaction(connection, mintTransaction, [payer, mint]);
    console.log('Signature:', sig);

    console.log('##################### Mint Address:', mint.publicKey.toBase58());
    console.log('##################### View Mint Address:', `https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`);
})();
