import {
  TonClient,
  WalletContractV4,
  internal,
  Address,
  JettonMaster,
  beginCell,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

const client = new TonClient({
  endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  apiKey: process.env.TONCENTER_API_KEY,
});

// Convert mnemonics to private key
let mnemonics = process.env.MNEMONICS.split(" ");
let keyPair = await mnemonicToPrivateKey(mnemonics);

// Create wallet contract
let workchain = 0; // Usually you need a workchain 0
let wallet = WalletContractV4.create({
  workchain,
  publicKey: keyPair.publicKey,
});
let contract = client.open(wallet);

async function transferTon(outputs) {
  // get seqno
  let seqno = await contract.getSeqno();

  // create transfer messages
  const messages = [];
  for (let i = 0; i < outputs.length; i++) {
    messages.push(
      internal({
        ihr_disabled: true,
        bounce: false,
        to: outputs[i].address,
        value: outputs[i].amount,
        body: outputs[i].comment,
      })
    );
  }

  // sign and send
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages,
  });
}

// =========================================================================================================================================

async function getUserJettonAddress(address) {
  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  });

  const jettonMasterAddress = Address.parse(
    "kQATQIInvssYOg4_o5CFTL4hFYkQI-CR5Zij1f1y8J2GkHJM"
  ); // get from https://testnet.tonviewer.com (token / jetton master)
  const userAddress = Address.parse(address);

  const jettonMaster = client.open(JettonMaster.create(jettonMasterAddress));
  return await jettonMaster.getWalletAddress(userAddress);
}

async function main(fromAddr, toAddr, amount, message) {
  // input sender address
  const userJettonAddress = await getUserJettonAddress(fromAddr);
  const destinationAddress = Address.parse(toAddr);

  const forwardPayload = beginCell()
    .storeUint(0, 32) // 0 opcode means we have a comment
    .storeStringTail(message)
    .endCell();

  const messageBody = beginCell()
    .storeUint(0xf8a7ea5, 32) // opcode for jetton transfer
    .storeUint(0, 64) // query id
    .storeCoins(amount) // jetton amount, amount * 10^9
    .storeAddress(destinationAddress) // target address
    .storeAddress(Address.parse(fromAddr)) // target notification
    .storeBit(0) // no custom payload
    .storeCoins(1) // forward amount - if >0, will send notification message
    .storeBit(1) // we store forwardPayload as a reference
    .storeRef(forwardPayload)
    .endCell();

  return {
    target: userJettonAddress,
    payload: messageBody,
  };
}

// =========================================================================================================================================

async function transferJetton(outputs) {
  // get seqno
  let seqno = await contract.getSeqno();

  // create transfer messages
  const messages = [];
  for (let i = 0; i < outputs.length; i++) {
    const body = await main(
      contract.address.toString(),
      outputs[i].address.toString(),
      outputs[i].amount,
      outputs[i].comment
    );

    messages.push(
      internal({
        ihr_disabled: true,
        bounce: false,
        to: body.target,
        value: "0.1",
        body: body.payload,
      })
    );
  }

  // sign and send
  await contract.sendTransfer({
    seqno: seqno,
    secretKey: keyPair.secretKey,
    messages,
  });
}

// sample transfer jetton to multiple addresses
transferJetton([
  {
    address: Address.parse("0QDjWRYSZ3tp7kiB0-euniJlH_9jsTR7WYPwKjCEdT48GgCX"),
    amount: "1",
    comment: "Mess 1",
  },
  {
    address: Address.parse("0QAJkUiJ4RUtDSX-yxPQFnEda_2n_DJYTkgW4ow2ea9y-l18"),
    amount: "2",
    comment: "Mess 2",
  },
]);

// sample transfer TON to multiple addresses
transferTon([
  {
    address: Address.parse("0QDjWRYSZ3tp7kiB0-euniJlH_9jsTR7WYPwKjCEdT48GgCX"),
    amount: 1,
    comment: "Transfer message 1",
  },
  {
    address: Address.parse("0QAJkUiJ4RUtDSX-yxPQFnEda_2n_DJYTkgW4ow2ea9y-l18"),
    amount: 2,
    comment: "Transfer message 2",
  },
]);
