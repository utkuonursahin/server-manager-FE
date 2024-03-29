import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ServerService} from "./service/server.service";
import {CustomResponse} from "./interface/custom-response";
import {AppState} from "./interface/app-state";
import {BehaviorSubject, catchError, map, Observable, of, startWith} from "rxjs";
import {DataState} from "./enums/data-state.enum";
import {Status} from "./enums/status.enum";
import {NgForm} from "@angular/forms";
import {Server} from "./interface/server";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush //this will only update the component when the input changes
})

export class AppComponent implements OnInit {
  appState$: Observable<AppState<CustomResponse>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  filterStatus$ = this.filterSubject.asObservable();

  private dataSubject = new BehaviorSubject<CustomResponse>(null);

  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoading.asObservable();

  constructor(private serverService: ServerService){}

  ngOnInit(): void {
    this.appState$ = this.serverService.servers$.pipe(
      map(response => {
        this.dataSubject.next(response);
        return {
          dataState: DataState.LOADED_STATE,
          appData: {...response,data:{servers: response.data.servers.reverse()}}
        }
      }),
      startWith({dataState: DataState.LOADING_STATE, appData: null}),
      catchError(error => of({dataState: DataState.ERROR_STATE, error}))
      );
  }

  pingServer(ipAddress:string): void {
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress).pipe(
      map(response => {
        const index = this.dataSubject.value.data.servers.findIndex(server => server.id === response.data.server.id);
        this.dataSubject.value.data.servers[index] = response.data.server;
        this.filterSubject.next('');
          return {
            dataState: DataState.LOADED_STATE,
            appData: this.dataSubject.value
          }
        }
      ),
      startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError(error => of({dataState: DataState.ERROR_STATE, error}))
    );
  }

  filterServers(status:Status): void {
    this.appState$ = this.serverService.filter$(status, this.dataSubject.value).pipe(
      map(response => {
        return {
          dataState: DataState.LOADED_STATE,
          appData: response
        }
      }),
      startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError(error => of({dataState: DataState.ERROR_STATE, error}))
    );
  }

  saveServer(serverForm:NgForm): void {
    this.isLoading.next(true)
    this.appState$ = this.serverService.save$(serverForm.value).pipe(
      map(response => {
        this.dataSubject.value.data.servers.push(response.data.server);
        //next() is equivalent to dataSubject.value
        document.getElementById('closeModal').click();
        serverForm.resetForm({status:this.Status.SERVER_DOWN});
        this.isLoading.next(false);
        return {
          dataState: DataState.LOADED_STATE,
          appData: this.dataSubject.value
        }
      }),
      startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error) => {
        this.isLoading.next(false);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  deleteServer(server: Server): void {
    this.isLoading.next(true);
    this.appState$ = this.serverService.delete$(server.id).pipe(
      map(response => {
        this.dataSubject.next({
          ...response,
          data: {servers: this.dataSubject.value.data.servers.filter(s => s.id !== server.id)}
        })
        return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
      }),
      startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error: string) => {
        this.isLoading.next(false);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  printReport(): void {
    //window.print();
    let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    let tableSelect = document.getElementById('servers');
    let tableHTML = tableSelect.outerHTML.replace(/ /g, '%20');
    let downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = 'data:' + dataType + ', ' + tableHTML;
    downloadLink.download = 'server-report.xls';
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  title = 'server-manager';
}
