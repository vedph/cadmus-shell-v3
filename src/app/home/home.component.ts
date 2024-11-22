import { Component } from '@angular/core';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

@Component({
  selector: 'cadmus-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false,
})
export class HomeComponent {
  public logged: boolean;
  public lastDate = new Date(2022, 2, 28);

  constructor(authService: AuthJwtService) {
    this.logged = authService.currentUserValue !== null;
  }
}
