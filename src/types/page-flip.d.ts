declare module "page-flip" {
  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
  }

  export class PageFlip {
    constructor(htmlParentElement: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: HTMLElement[] | HTMLCollection): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(pageNum: number): void;
    destroy(): void;
    on(eventName: string, callback: (event: { data: number }) => void): void;
  }
}
