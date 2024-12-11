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
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction
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
        name: 'Bitcoin DeFi Solana',
        symbol: 'BTCPT',
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
    const balance = await connection.getBalance(payer.publicKey); // Fetch the balance
    console.log('##################### Your Solana Balance:', balance / LAMPORTS_PER_SOL);

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


    // Create account and mint tokens to account
    const tokenSupply = 21_000_000;
    const amount = tokenSupply * 10 ** decimals;
    const recipient = Keypair.generate();

      // Sender token account address
    const sourceTokenAccount = getAssociatedTokenAddressSync(
        mint.publicKey,
        payer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const destinationTokenAccount = getAssociatedTokenAddressSync(
        mint.publicKey,
        recipient.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
        payer.publicKey,
        sourceTokenAccount,
        payer.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destinationTokenAccount,
        recipient.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mint.publicKey,
        sourceTokenAccount,
        payer.publicKey,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const txSig = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { skipPreflight: true }
    );
})();
