import {
    AdminRoleGranted,
    AdminRoleRemoved,
    MinterRoleGranted,
    MinterRoleRemoved,
    SmartContractRoleGranted,
    SmartContractRoleRemoved,
    VerifiedMinterRoleGranted,
    VerifiedMinterRoleRemoved,
} from "../generated/DigitalaxAccessControls/DigitalaxAccessControls";

import {createAccessControlsHistory} from "./factory/DigitalaxAccessControls.factory";


export function handleAdminRoleGranted(event: AdminRoleGranted): void {
    createAccessControlsHistory(event, "AdminRoleGranted");
}

export function handleAdminRoleRemoved(event: AdminRoleRemoved): void {
    createAccessControlsHistory(event, "AdminRoleRemoved");
}

export function handleMinterRoleGranted(event: MinterRoleGranted): void {
    createAccessControlsHistory(event, "MinterRoleGranted");
}

export function handleMinterRoleRemoved(event: MinterRoleRemoved): void {
    createAccessControlsHistory(event, "MinterRoleRemoved");
}

export function handleSmartContractRoleGranted(event: SmartContractRoleGranted): void {
    createAccessControlsHistory(event, "SmartContractRoleGranted");
}

export function handleSmartContractRoleRemoved(event: SmartContractRoleRemoved): void {
    createAccessControlsHistory(event, "SmartContractRoleRemoved");
}

export function handleVerifiedMinterRoleGranted(event: VerifiedMinterRoleGranted): void {
    createAccessControlsHistory(event, "VerifiedMinterRoleGranted");
}

export function handleVerifiedMinterRoleRemoved(event: VerifiedMinterRoleRemoved): void {
    createAccessControlsHistory(event, "VerifiedMinterRoleRemoved");
}
