import { Observable } from 'rxjs/Observable';

export interface APIGateway {
  callAPI(url: string, query?: string): Observable<any[]>;
}