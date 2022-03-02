const { providers } = require("near-api-js");
const provider = new providers.JsonRpcProvider("https://rpc.mainnet.near.org");

getState();

async function getState() {

  const raw_nft_token = await provider.query({
    request_type: "call_function",
    account_id: "tenk.sputnik-dao.near",
    method_name: "get_policy",
    args_base64: "e30=",
    finality: "optimistic",
  });

  const res = JSON.parse(Buffer.from(raw_nft_token.result).toString());
  console.log(res);
  //console.log(res.roles)
  //console.log(res.roles[0].kind.Group[0])
}