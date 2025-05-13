/**
 * A url with a label and optionally an image url to use for rendering.
 */
export class LabelledLink {
  /**
   * Shown to user,
   */
  label: string;

  /**
   * Full URL
   */
  url: string;

  /**
   * Optional image URL for the link.
   */
  imageUrl?: string;

  category?: string;

  constructor(label: string, url: string, imageUrl?: string, category?: string) {
    this.label = label;
    this.url = url;
    this.imageUrl = imageUrl;
    this.category = category;
  }
}