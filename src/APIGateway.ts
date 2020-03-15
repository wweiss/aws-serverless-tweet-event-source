export interface APIGateway {
  callAPI(url: string, query?: string): Promise<any[] | undefined>;
}
