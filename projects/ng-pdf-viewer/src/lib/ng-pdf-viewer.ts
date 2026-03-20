import {
  afterNextRender,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgPdfThemeConfig, NgPdfViewerThemePreference } from './ng-pdf-viewer.config';
import { EmbedPdfContainer } from '@embedpdf/snippet';

@Component({
  selector: 'ng-pdf-viewer',
  imports: [],
  template: `<div #container [style.height]="height()"></div>`,
  styles: ``,
})
export class NgPdfViewer {
  readonly src = input<string>('');
  readonly height = input<string>('650px');
  readonly themePreference = input<NgPdfThemeConfig>({ preference: 'system' });

  onReady = output<EmbedPdfContainer>();

  private platformId = inject(PLATFORM_ID);
  private doc = inject(DOCUMENT);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  pdfContainer?: EmbedPdfContainer;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.initViewer();
    });
  }

  private async initViewer() {
    const { default: EmbedPDF } = await import('@embedpdf/snippet');
    const container = this.elementRef.nativeElement.querySelector('div')!;

    this.pdfContainer = EmbedPDF.init({
      type: 'container',
      target: container,
      src: this.src(),
      theme: this.themePreference(),
    });

    if (this.pdfContainer) {
      this.onReady.emit(this.pdfContainer);
    }

    this.pdfContainer?.setTheme;
  }
}
