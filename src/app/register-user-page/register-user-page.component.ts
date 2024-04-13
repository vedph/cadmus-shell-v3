import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserListRepository } from '@myrmidon/auth-jwt-admin';

@Component({
  selector: 'app-register-user-page',
  templateUrl: './register-user-page.component.html',
  styleUrls: ['./register-user-page.component.css'],
})
export class RegisterUserPageComponent implements OnInit {
  constructor(
    private _router: Router,
    private _repository: UserListRepository
  ) {}

  ngOnInit(): void {}

  public onRegistered(): void {
    this._repository.reset();
    this._router.navigate(['/home']);
  }
}
