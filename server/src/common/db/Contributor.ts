import {LabelledLink} from "./LabelledLink.js";

/**
 * Represents a named entity such as a person, group, company, etc. that has a relationship to a piece of
 * content.
 */
export class Contributor {
  id: string;
  /**
   * Primary display identifier (does not have to be unique)
   */
  name: string;
  /**
   * Optional blurb about the
   */
  description?: string;
  /**
   * Role, capacity, relationship (e.g. programmer, publisher, author, musician, rights holder etc.)
   */
  relation: string[];

  /**
   * Probably refers to a website for the contributor or could be a wikipedia entry etc.
   */
  links: LabelledLink[];

  constructor(id: string, name: string, relation: string[], links: LabelledLink[], description?: string) {
    this.id = id;
    this.name = name;
    this.relation = relation;
    this.links = links;
    this.description = description;
  }
}