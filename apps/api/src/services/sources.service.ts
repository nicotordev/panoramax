import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";

class SourcesService {
  public async getSources() {
    return sourceKeys;
  }

  public async getSourceEvents(
    sourceKey: SourceKey,
    region: string | undefined,
    page: number,
    limit: number | undefined,
  ) {
    return await sourceRegistry[sourceKey]({
      page,
      limit,
      persist: false,
      region,
    });
  }
}

const sourcesService = new SourcesService();

export default sourcesService;
