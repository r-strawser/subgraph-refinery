import { near, BigInt, log, json, JSONValueKind } from "@graphprotocol/graph-ts"
import { FunctionCallLog, TransferCallLog, DeployContractLog, TotalsLog } from "../generated/schema"

export function handleReceipt(
  receiptWithOutcome: near.ReceiptWithOutcome
): void {

  const receipt = receiptWithOutcome.receipt;
  const outcome = receiptWithOutcome.outcome;
  const block = receiptWithOutcome.block;

  if (block.header.height > 62118000) {
    return;
  }
  
  log.info("****************** Receipt ID {} Start ***********************", [receipt.id.toBase58()]);

  log.info("Receipt data -> id: {}, predecessorId: {}, receiverId: {}, signerId: {}", [
    receipt.id.toBase58(),
    receipt.predecessorId,
    receipt.receiverId,
    receipt.signerId
  ]);
  
  const actions = receipt.actions;
  for(let i = 0; i < actions.length; i++) {
    log.info("Receipt actions: kind: {}, data: {}", [actions[i].kind.toString(), actions[i].data.toString()]);
  }

  const inputDataIds = receipt.inputDataIds;
  for(let i = 0; i < inputDataIds.length; i++) {
    log.info("Receipt input data id: {}", [inputDataIds[i].toBase58()]);
  }

  const outputDataReceivers = receipt.outputDataReceivers;
  for(let i = 0; i < outputDataReceivers.length; i++) {
    log.info("Receipt output data receiver id: {}", [outputDataReceivers[i].receiverId]);
  }

  log.info("Outcome data -> blockHash: {}, id: {}, executorId: {}", [
    outcome.blockHash.toBase58(),
    outcome.id.toBase58(),
    outcome.executorId
  ]);

  const logs = outcome.logs;
  for(let i = 0; i < logs.length; i++) {
    log.info("Outcome logs: {}", [logs[i].toString()]);
  }

  const receiptIds = outcome.receiptIds;
  for(let i = 0; i < receiptIds.length; i++) {
    log.info("Outcome receiptIds: {}", [receiptIds[i].toBase58()]);
  }

  log.info("****************** Receipt ID {} End ***********************", [receipt.id.toBase58()]);

  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i],
      receipt,
      block,
      outcome
    );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {

  if (action.kind == near.ActionKind.CREATE_ACCOUNT) {
    // handler create account
    const newAction = action.toCreateAccount();
    handleCreateAccount(newAction, receipt, block, outcome);
  }

  if (action.kind == near.ActionKind.DEPLOY_CONTRACT) {
    // handler deploy contract
    const newAction = action.toDeployContract();
    handleDeployContract(newAction, receipt, block, outcome);
  }

  if (action.kind == near.ActionKind.TRANSFER) {
    const newAction = action.toTransfer();
    handleTransfer(newAction, receipt, block, outcome);
  }

  if (action.kind == near.ActionKind.FUNCTION_CALL) {
    // handler function call
    const newAction = action.toFunctionCall();
    handleFunctionCall(newAction, receipt, block, outcome);
    // let funcCall = new FunctionCallLog(`${receipt.id.toBase58()}`);
    // funcCall.methodName = newAction.methodName.toString();
    // funcCall.args = newAction.args.toString();newAction
    // funcCall.deposit = newAction.deposit.toHexString();
    // funcCall.blockHash = block.header.hash.toHexString();
    // funcCall.outcomeLogs = outcome.logs.toString();
  }
}

function handleCreateAccount(
  createAccount: near.CreateAccountAction,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {
  log.info("Receipt create account -> id: {}", [receipt.id.toBase58()]);
}

function handleDeployContract(
  deployContract: near.DeployContractAction,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {
  log.info("Receipt deploy contract -> id: {}", [receipt.id.toBase58()]);
  let depContract = new DeployContractLog(`${receipt.id.toBase58()}`);
  depContract.codeHash = deployContract.codeHash.toBase58()
  depContract.blockHash = block.header.hash.toHexString();
  depContract.outcomeLogs = outcome.logs.toString();
  depContract.save();
}

function handleTransfer(
  transfer: near.TransferAction,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {
  log.info("Receipt transfer -> id: {}, deposit: {}, hash: {}, outcome logs: {}", [
    receipt.id.toBase58(),
    transfer.deposit.toHexString(),
    block.header.hash.toHexString(),
    outcome.logs.toString()
  ]);
  let transferCall = new TransferCallLog(`${receipt.id.toBase58()}`);
  if(transferCall.deposit) {
    transferCall.deposit = transfer.deposit.toHexString();
  }
  transferCall.blockHash = block.header.hash.toHexString();
  transferCall.outcomeLogs = outcome.logs.toString();
  transferCall.save();
}

function handleFunctionCall(
  functionCall: near.FunctionCallAction,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {
  log.info("Receipt function call -> id: {}, method: {}, args: {}, deposit: {}, hash: {}, outcome logs: {}", [
    receipt.id.toBase58(),
    functionCall.methodName,
    functionCall.args.toString(),
    functionCall.deposit.toHexString(),
    block.header.hash.toHexString(),
    outcome.logs.toString()
  ]);

  let totals = TotalsLog.load("mrbrownproject-LOGS")
  if(!totals) {
    totals = new TotalsLog("mrbrownproject-LOGS");
    totals.total_addToWhitelistCalls = BigInt.zero();
    totals.total_claimsCalls = BigInt.zero();
    totals.total_createAccountAndClaimCalls = BigInt.zero();
    totals.total_createLinkdropCalls = BigInt.zero();
    totals.total_linkCallbackCalls = BigInt.zero();
    totals.total_nftMintCalls = BigInt.zero();
    totals.total_nftMintManyCalls = BigInt.zero();
    totals.total_nftMintOneCalls = BigInt.zero();
    totals.total_nftResolveTranser = BigInt.zero();
    totals.total_nftTransferCallCalls = BigInt.zero();
    totals.total_nftTransferCalls = BigInt.zero();
  }

  let funcCall = new FunctionCallLog(`${receipt.id.toBase58()}`);
  funcCall.methodName = functionCall.methodName;
  funcCall.args = functionCall.args.toString();
  funcCall.deposit = functionCall.deposit.toHexString();
  funcCall.blockHash = block.header.hash.toHexString();
  funcCall.outcomeLogs = outcome.logs.toString();

  if(functionCall.methodName == "add_whitelist_accounts"){
    if(totals.total_addToWhitelistCalls) {
      totals.total_addToWhitelistCalls = totals.total_addToWhitelistCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "claim"){
    if(totals.total_claimsCalls) {
      totals.total_claimsCalls = totals.total_claimsCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "create_account_and_claim"){
    if(totals.total_createAccountAndClaimCalls) {
      totals.total_createAccountAndClaimCalls = totals.total_createAccountAndClaimCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "create_linkdrop"){
    if(totals.total_createLinkdropCalls) {
      totals.total_createLinkdropCalls = totals.total_createLinkdropCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "link_callback"){
    if(totals.total_linkCallbackCalls) {
      totals.total_linkCallbackCalls = totals.total_linkCallbackCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "nft_mint"){
    if(totals.total_nftMintCalls) {
      totals.total_nftMintCalls = totals.total_nftMintCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "nft_mint_one"){
    if(totals.total_nftMintOneCalls) {
      totals.total_nftMintOneCalls = totals.total_nftMintOneCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "nft_mint_many"){
    if(totals.total_nftMintManyCalls) {
      totals.total_nftMintManyCalls = totals.total_nftMintManyCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "nft_transfer"){
    if(totals.total_nftTransferCalls) {
      totals.total_nftTransferCalls = totals.total_nftTransferCalls.plus(BigInt.fromI32(1));
    }
  }
  if(functionCall.methodName == "nft_transfer_call"){
    if(totals.total_nftTransferCallCalls) {
      totals.total_nftTransferCallCalls = totals.total_nftTransferCallCalls.plus(BigInt.fromI32(1));
    }
  }

  funcCall.save();
  totals.save();
}