import {Authority} from "./Authority.js";
import {Contributor} from "./Contributor.js";

/**
 * Represents a claimed piece of content like published software or other piece of media.
 */
export class ContentEntity {
  names: string[];
  contributors: Contributor[];
  description: string;
  tags: string[];
  authority: Authority;

  constructor(names: string[], contributors: Contributor[], description: string, tags: string[], authority: Authority) {
    this.names = names;
    this.contributors = contributors;
    this.description = description;
    this.tags = tags;
    this.authority = authority;
  }
}