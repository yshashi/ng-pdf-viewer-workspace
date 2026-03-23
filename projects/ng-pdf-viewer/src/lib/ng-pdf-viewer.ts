import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NG_PDF_VIEWER_CONFIG, NgPdfThemeConfig, NgPdfViewerConfig } from './ng-pdf-viewer.config';
import { EmbedPdfContainer } from '@embedpdf/snippet';

@Component({
  selector: 'ng-pdf-viewer',
  imports: [],
  template: `<div #container [style.height]="height()"></div>`,
  styles: ``,
})
export class NgPdfViewer {
  private globalConfig = inject(NG_PDF_VIEWER_CONFIG, { optional: true });
  private platformId = inject(PLATFORM_ID);
  private doc = inject(DOCUMENT);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: MutationObserver | null = null;
  private destroyed = signal(false);
  private destroyRef = inject(DestroyRef);

  readonly src = input<string>(this.globalConfig?.src || '');
  readonly height = input<string>(this.globalConfig?.height || '650px');
  readonly theme = input<NgPdfThemeConfig | undefined>(this.globalConfig?.theme);
  readonly syncTheme = input<boolean>(this.globalConfig?.syncTheme ?? true);
  readonly themeStorageKey = input<string | undefined>(this.globalConfig?.themeStorageKey);
  readonly config = input<NgPdfViewerConfig | undefined>();

  onReady = output<EmbedPdfContainer>();
  onError = output<Error>();

  pdfContainer = signal<EmbedPdfContainer | undefined>(undefined);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.destroyed.set(true);
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.initViewer();
    });

    effect(() => {
      const newSrc = this.src();
      if (this.pdfContainer() && newSrc) {
        this.pdfContainer.update((container) => {
          if (container) {
            container.config = {
              ...container.config,
              src: newSrc,
            };
          }
          return container;
        });
      }
    });
  }

  private async initViewer() {
    const container = this.elementRef.nativeElement.querySelector('div');
    if (!container) {
      console.error('[NG_PDF_VIEWER] Container element not found for PDF viewer.');
      return;
    }

    let EmbedPDF: any;
    try {
      ({ default: EmbedPDF } = await import('@embedpdf/snippet'));
    } catch (importError) {
      const error = new Error(
        `[NG_PDF_VIEWER] Failed to import EmbedPDF library: ${importError instanceof Error ? importError.message : String(importError)}`
      );
      console.error(error.message);
      this.onError.emit(error);
      return;
    }

    if (this.destroyed()) {
      return;
    }
    const theme = this.resolveInitialTheme();
    const baseConfig = this.config() || this.globalConfig || {};

    this.pdfContainer.set(
      EmbedPDF.init({
        ...baseConfig,
        type: 'container',
        target: container,
        src: this.src(),
        theme: theme,
      }),
    );

    if (this.pdfContainer()) {
      this.onReady.emit(this.pdfContainer()!);
    }

    if (this.syncTheme()) {
      this.watchThemeChanges();
    }
  }

  private resolveInitialTheme(): NgPdfThemeConfig {
    if (this.globalConfig?.theme) {
      return this.globalConfig.theme;
    }
    if (this.syncTheme()) {
      const userStoredThemeKey = this.themeStorageKey();
      const storedThemeName = userStoredThemeKey ? localStorage.getItem(userStoredThemeKey) : null; //'light'

      if (storedThemeName) {
        const isDark = storedThemeName.toLocaleLowerCase().includes('dark');
        if (isDark) {
          return {
            preference: 'dark',
            light: this.theme()?.light,
            dark: this.theme()?.dark,
          };
        } else {
          return {
            preference: 'light',
            light: this.theme()?.light,
            dark: this.theme()?.dark,
          };
        }
      }
    }

    return { preference: 'system' };
  }

  private watchThemeChanges() {
    const html = this.doc.documentElement;

    this.observer = new MutationObserver(() => {
      const scheme = html.style.colorScheme as 'light' | 'dark' | 'no-preference';
      if ((scheme === 'light' || scheme === 'dark') && this.pdfContainer()) {
        const newTheme: NgPdfThemeConfig = {
          preference: scheme,
          light: this.theme()?.light,
          dark: this.theme()?.dark,
        };
        this.pdfContainer()?.setTheme(newTheme);
      }
    });

    this.observer.observe(html, { attributes: true, attributeFilter: ['style'] });

    const win = this.doc.defaultView;
    const mq = win?.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      if (this.pdfContainer()) {
        const newTheme: NgPdfThemeConfig = {
          preference: e.matches ? 'dark' : 'light',
          light: this.theme()?.light,
          dark: this.theme()?.dark,
        };
        this.pdfContainer()?.setTheme(newTheme);
      }
    };
    mq?.addEventListener('change', listener);

    // Cleanup function to remove listeners when component is destroyed
    this.destroyRef.onDestroy(() => mq?.removeEventListener('change', listener));
  }
}
