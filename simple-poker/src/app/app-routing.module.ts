import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LoginComponent } from 'src/app/login/login.component';
import { LobbyComponent } from 'src/app/lobby/lobby.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: '',   redirectTo: '/lobby', pathMatch: 'full' }, // redirect to the lobby screen
  { path: '**', component: LobbyComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
