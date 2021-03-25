
import {
    DigitalaxPodePortalMetadataAdded
} from "../generated/DigitalaxPodePortal/DigitalaxPodePortal";

import { DigitalaxPodePortalMetadata } from "../generated/schema";


export function handleMetadataAdded(event: DigitalaxPodePortalMetadataAdded): void {
    let metadata = new DigitalaxPodePortalMetadata(event.params.index.toString());
    metadata.tokenUri = event.params.tokenUri;
    metadata.save();
}
