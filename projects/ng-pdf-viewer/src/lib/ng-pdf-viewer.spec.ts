import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgPdfViewer } from './ng-pdf-viewer';

describe('NgPdfViewer', () => {
  let component: NgPdfViewer;
  let fixture: ComponentFixture<NgPdfViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgPdfViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(NgPdfViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
