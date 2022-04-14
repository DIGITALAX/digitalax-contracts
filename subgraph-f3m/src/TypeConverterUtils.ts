import {BigInt} from "@graphprotocol/graph-ts/index";

export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer)
}