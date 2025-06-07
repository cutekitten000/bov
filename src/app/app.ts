import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Removidos os módulos de Ícone e Botão
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'tlv-bov';
  // Todo o código do themeService e toggleTheme foi removido.
}