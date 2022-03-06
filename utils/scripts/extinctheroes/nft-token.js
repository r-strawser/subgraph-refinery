const { providers } = require("near-api-js");
const provider = new providers.JsonRpcProvider("https://rpc.mainnet.near.org");

getState();

async function getState() {

  const raw_nft_token = await provider.query({
    request_type: "call_function",
    account_id: "extinctheroes.tenk.near",
    method_name: "nft_token",
    // {"token_id":"101"} base64 encoded
    args_base64: "eyJ0b2tlbl9pZCI6IjEifQ==",
    finality: "optimistic",
  });

  const res = JSON.parse(Buffer.from(raw_nft_token.result).toString());
  console.log(res);
}