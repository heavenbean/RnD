import { Address, beginCell } from "@ton/ton";

const body = beginCell()
  .storeUint(0, 32) // write 32 zero bits to indicate that a text comment will follow
  .storeStringTail("Hello, TON!") // invoice id as a comment
  .endCell();

const transaction = {
  validUntil: Date.now() + 600,
  network: -3, // or import CHAIN from @tonconnect/ui-react
  messages: [
    {
      address: "0QDjWRYSZ3tp7kiB0-euniJlH_9jsTR7WYPwKjCEdT48GgCX",
      amount: "20000000", //Toncoin in nanotons
      payload: body.toBoc().toString("base64"),
    },
  ],
};

console.log(transaction);
