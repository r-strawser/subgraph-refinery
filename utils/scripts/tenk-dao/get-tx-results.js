const { providers } = require("near-api-js");

//network config (replace testnet with mainnet or betanet)
const provider = new providers.JsonRpcProvider(
  "https://archival-rpc.mainnet.near.org"
);

const TX_HASH = "3HcPCmtQJJFVLjKph8HDEwheyCZFVy8p2DdwJRFjQ5YF";
// account ID associated with the transaction
const ACCOUNT_ID = "mrbrownproject.near";

getState(TX_HASH, ACCOUNT_ID);

async function getState(txHash, accountId) {
  const result = await provider.txStatus(txHash, accountId);
  //console.log("Result: ", result);
  //console.log("transaction outcome: ", result.transaction_outcome)
  //console.log("receipts outcome: ", result.receipts_outcome)
  //console.log("receipts proofs 0: ", result.receipts_outcome[0].proof)

  for(let i = 0; i < result.receipts_outcome.length; i++) {
    console.log(`receipt ID ${i}: `, result.receipts_outcome[i].id)
    console.log(`receipt proof ${i}: `, result.receipts_outcome[i].proof)
    console.log(`receipt outcome ids ${i}: `, result.receipts_outcome[i].outcome.receipt_ids)
    console.log(`receipts outcome logs ${i}: `, result.receipts_outcome[i].outcome.logs)
    console.log(`receipts outcome status ${i}: `, result.receipts_outcome[i].outcome.status)
  }
}