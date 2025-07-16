import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SentimentResponse {
  text: string;
  sentiment: number;
  sentiment_text: string;
}

@Injectable({
  providedIn: 'root'
})
export class SentimentService {
  private apiUrl = 'http://localhost:8000'; // URL ของ FastAPI

  constructor(private http: HttpClient) { }

  analyzeSentiment(text: string): Observable<SentimentResponse> {
    return this.http.post<SentimentResponse>(`${this.apiUrl}/analyze`, { text });
  }
} 