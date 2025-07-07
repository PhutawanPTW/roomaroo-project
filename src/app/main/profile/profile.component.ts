import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private subscription: any;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.subscription = this.authService.currentUser$
      .pipe(
        filter((user): user is UserProfile | null => user !== undefined)
      )
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
