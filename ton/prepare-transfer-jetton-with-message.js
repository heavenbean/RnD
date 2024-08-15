import { Address, beginCell, toNano } from "@ton/core";
import { TonClient, JettonMaster } from "@ton/ton";

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

  console.log("Transaction must send to:", userJettonAddress);

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
    .storeAddress(userJettonAddress) // target notification
    .storeBit(0) // no custom payload
    .storeCoins(0) // forward amount - if >0, will send notification message
    .storeBit(1) // we store forwardPayload as a reference
    .storeRef(forwardPayload)
    .endCell();

  console.log("Payload:", messageBody.toBoc().toString("base64"));
}

main(
  "0QDjWRYSZ3tp7kiB0-euniJlH_9jsTR7WYPwKjCEdT48GgCX",
  "0QAJkUiJ4RUtDSX-yxPQFnEda_2n_DJYTkgW4ow2ea9y-l18",
  toNano("0.2"),
  "Hello, I am Harry!"
);
