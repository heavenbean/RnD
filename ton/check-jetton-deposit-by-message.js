import TonWeb from "tonweb";
import { Address, TonClient, Cell, JettonMaster } from "@ton/ton";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isMainnet = false;

const tonweb = isMainnet
  ? new TonWeb(
      new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
        apiKey: "YOUR_MAINNET_API_KEY",
      })
    )
  : new TonWeb(
      new TonWeb.HttpProvider("https://testnet.toncenter.com/api/v2/jsonRPC", {
        apiKey: "YOUR_TESTNET_API_KEY",
      })
    );

const MY_WALLET_ADDRESS = "0QAJkUiJ4RUtDSX-yxPQFnEda_2n_DJYTkgW4ow2ea9y-l18";

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

async function decodeBody(payload) {
  const rawMessage = Cell.fromBase64(payload).beginParse();
  const opcode = rawMessage.loadUint(32); // opcode jetton transfer
  if (opcode !== 0x178d4519) {
    // jetton internal transfer
    return;
  }

  rawMessage.loadUint(64); // query id
  const sentAmount = rawMessage.loadCoins(); // jetton amount
  const fromAddress = rawMessage.loadAddress(); // from address
  rawMessage.loadAddress(); // target notification
  rawMessage.loadCoins();
  const forwardPayloadRef = rawMessage.loadMaybeRef();
  rawMessage.endParse();

  if (!forwardPayloadRef) {
    return;
  }

  const forwardedPayload = forwardPayloadRef.beginParse();
  forwardedPayload.loadUint(32); // 0 opcode
  const forwardedMessage = forwardedPayload.loadStringTail();
  forwardedPayload.endParse();

  return {
    fromAddress,
    sentAmount,
    forwardedMessage,
  };
}

async function checkByMessage(address, message) {
  try {
    const transactions = await tonweb.getTransactions(address, 1000);
    const txs = [];
    for (const tx of transactions) {
      if (
        !tx.in_msg ||
        !tx.in_msg.msg_data ||
        tx.in_msg.msg_data["@type" != "msg.dataRaw"] ||
        !tx.in_msg.msg_data["body"]
      )
        continue;

      const decodedBody = await decodeBody(tx.in_msg.msg_data["body"]);

      if (decodedBody.forwardedMessage == message)
        return {
          hash: tx.transaction_id.hash,
          utime: tx.utime,
          ...decodedBody,
        };
    }

    return txs;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

async function getAllMessages(address) {
  try {
    const transactions = await tonweb.getTransactions(address, 1000);
    const txs = [];
    for (const tx of transactions) {
      if (
        !tx.in_msg ||
        !tx.in_msg.msg_data ||
        tx.in_msg.msg_data["@type" != "msg.dataRaw"] ||
        !tx.in_msg.msg_data["body"]
      )
        continue;

      const decodedBody = await decodeBody(tx.in_msg.msg_data["body"]);

      txs.push({
        hash: tx.transaction_id.hash,
        utime: tx.utime,
        ...decodedBody,
      });
    }

    return txs;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

async function main() {
  // get address to listen
  const listenAddr = await getUserJettonAddress(MY_WALLET_ADDRESS);

  // get all transactions
  const allTxs = await getAllMessages(listenAddr);

  // show them all
  console.log("Txs with message:", allTxs);

  // prevent api ratelimit
  await delay(1000);

  // // check by message
  const message = "Hello, I am Harry!";
  const result = await checkByMessage(listenAddr, message);

  // show the result
  console.log("Deposit tx:", result);
}

main();
