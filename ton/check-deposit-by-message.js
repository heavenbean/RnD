import TonWeb from "tonweb";
import { Address } from "@ton/ton";

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

const MY_WALLET_ADDRESS = "0QDjWRYSZ3tp7kiB0-euniJlH_9jsTR7WYPwKjCEdT48GgCX";

async function checkByMessage(address, message) {
  try {
    const transactions = await tonweb.getTransactions(address, 1000);
    for (const tx of transactions) {
      if (
        tx.in_msg &&
        tx.in_msg.destination == Address.parse(address) &&
        tx.in_msg.message.length
      ) {
        if (tx.in_msg.message === message) {
          return {
            message: tx.in_msg.message,
            utime: tx.utime,
            hash: tx.transaction_id.hash,
            value: tx.in_msg.value,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return null;
  }
}

async function getAllMessages(address) {
  try {
    const transactions = await tonweb.getTransactions(address, 1000);
    const txs = [];
    for (const tx of transactions) {
      if (
        tx.in_msg &&
        tx.in_msg.destination == Address.parse(address) &&
        tx.in_msg.message.length
      ) {
        txs.push({
          message: tx.in_msg.message,
          utime: tx.utime,
          hash: tx.transaction_id.hash,
          value: tx.in_msg.value,
        });
      }
    }

    return txs;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

async function main() {
  // get all transactions
  const allTxs = await getAllMessages(MY_WALLET_ADDRESS);

  // show them all
  console.log("Txs with message:", allTxs);

  // prevent api ratelimit
  await delay(1000);

  // // check by message
  const message = "Hello, TON!";
  const result = await checkByMessage(MY_WALLET_ADDRESS, message);

  // show the result
  console.log("Deposit tx:", result);
}

main();
