import { ProviderReportsPushed } from "../generated/DripOracle/DripOracle";
import { PayableTokenReport } from "../generated/schema";

export function handleProviderReportsPushed(event: ProviderReportsPushed): void {
    const tokens = event.params.payableTokens;
    const payloads = event.params.payloads;
    const timestamp = event.params.timestamp;

    for (let i = 0; i < tokens.length; i += 1) {
        const tokenReport = new PayableTokenReport(tokens[i].toHexString());
        tokenReport.payload = payloads[i];
        tokenReport.timestamp = timestamp;
        tokenReport.save();
    }
}
