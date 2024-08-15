import TonWeb from "tonweb";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isMainnet = false;
const COUNT = 10;

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

/**
 * Fetch transaction of a specific address
 * @param {string} address Address to fetch transactions for
 * @param {number} limit Number of record to retrieve
 * @param {number} lt Last transaction lt
 * @param {string} lh Last transaction hash
 * @returns {Promise<Object[]>} Array of transactions
 */
async function getTransactions(address, limit, lt, lh) {
  try {
    if (lt) {
      const transactions = await tonweb.getTransactions(address, limit, lt, lh);
      return transactions;
    } else {
      const transactions = await tonweb.getTransactions(address, limit);
      return transactions;
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

async function main() {
  // get latest 3 transactions
  const lastTxs = await getTransactions(MY_WALLET_ADDRESS, 3);

  // show them all
  for (const tx of lastTxs) {
    console.log(tx.transaction_id.hash, tx.utime);
  }

  // prevent api ratelimit
  await delay(1000);

  // prepare next page parameters
  const lt = lastTxs[lastTxs.length - 1].transaction_id.lt;
  const lh = lastTxs[lastTxs.length - 1].transaction_id.hash;

  // get next transactions (or loop following lines)
  // count number should be added 1, because of the last transaction duplication
  const nextTxs = await getTransactions(MY_WALLET_ADDRESS, 4, lt, lh);

  // remove the first transaction (duplicate of the last transaction)
  delete nextTxs[Object.keys(nextTxs)[0]];

  // show them all
  for (const tx of nextTxs) {
    if (tx && tx.transaction_id) console.log(tx.transaction_id.hash, tx.utime);
  }
}

main();
