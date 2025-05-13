import {LabelledLink} from "./LabelledLink.js";

export interface Authority {
  name: string;
  /**
   * Internal id
   */
  id: string;
  urls: LabelledLink[];
}