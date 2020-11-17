import {BigInt} from "@graphprotocol/graph-ts/index";

export function isChildInList(childId: string, ids: Array<BigInt>): boolean {
    for (let i = 0; i < ids.length; i++) {
        let id: BigInt = ids.pop();
        if (id.toString() === childId.toString()) {
            return true;
        }
    }
    return false;
}

