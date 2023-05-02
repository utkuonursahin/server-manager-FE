import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {catchError, Observable, tap, throwError} from "rxjs";
import {CustomResponse} from "../interface/custom-response";
import {Server} from "../interface/server";
import {Status} from "../enums/status.enum";

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  private readonly apiUrl: string = `http://localhost:8080/api/server/`;

  constructor(private http: HttpClient) { }

  //Procedural Approach
  // getServers(): Observable<CustomResponse>{
  //   return this.http.get<CustomResponse>(`http://localhost:8080/api/server`);
  // }

  //Defining an observable
  servers$:Observable<CustomResponse> =
    this.http.get<CustomResponse>(`${this.apiUrl}`)
    .pipe(
      tap(console.log),
      catchError(this.handleError)
    );

  save$ =  (server: Server)  =>
    <Observable<CustomResponse>>
      this.http.post<CustomResponse>(`${this.apiUrl}`,server)
        .pipe(
          tap(console.log),
          catchError(this.handleError)
        );

  ping$ =  (ipAddress:string)  =>
    <Observable<CustomResponse>>
      this.http.get<CustomResponse>(`${this.apiUrl}ping/${ipAddress}`)
        .pipe(
          tap(console.log),
          catchError(this.handleError)
        );

  filter$ =  (status: Status, response: CustomResponse)  =>
    <Observable<CustomResponse>>
      new Observable<CustomResponse>(subscriber => {
        subscriber.next(
          status === Status.ALL ? {...response,message: `Servers filtered by ${status} status`} :
            {...response,
              message: response.data.servers
              .filter(server => server.status === status).length > 0 ? `Servers filtered by ${status === Status.SERVER_UP ? 'SERVER UP' : 'SERVER DOWN'} status` :
              `No servers of ${status} found`,
              data: {
                servers: response.data.servers.filter(server => server.status === status)
              }
            }
        );
        subscriber.complete();
      }).pipe(
          tap(console.log),
          catchError(this.handleError)
        );

  delete$ =  (serverId:number)  =>
    <Observable<CustomResponse>>
      this.http.delete<CustomResponse>(`${this.apiUrl}${serverId}`)
        .pipe(
          tap(console.log),
          catchError(this.handleError)
        );

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.log(error)
    return throwError (`An error occurred - Error code ${error.status}`);
  }
}
