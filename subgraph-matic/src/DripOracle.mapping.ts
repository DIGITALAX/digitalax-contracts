import { ProviderReportsPushed } from "../generated/DripOracle/DripOracle";
import { PayableTokenReport } from "../generated/schema";

export function handleProviderReportsPushed(event: ProviderReportsPushed): void {
    const tokens = event.params.payableTokens;
    const paylaods = event.params.payloads;
    const timestamp = event.params.timestamp;

    for (let i = 0; i < tokens.length; i += 1) {
        const tokenReport = new PayableTokenReport(tokens[i].toHexString());
        tokenReport.payload = paylaods[i];
        tokenReport.timestamp = timestamp;
        tokenReport.save();
    }
}
