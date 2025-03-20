import {DataView} from "../machine/DataView.ts";

/**
 * Data interpretation output form. Tags represent top level "folksonomy". Stats relay generic summary information.
 * The {@link DataView} holds the data itself.
 */
class Detail {
  private readonly _tags: string[];
  private readonly _stats: [string, string][];
  private readonly _name: string;
  private readonly _dataView: DataView;

  constructor(name: string, tags: string[], dataView: DataView) {
    this._name = name;
    this._tags = tags;
    this._dataView = dataView;
    this._stats = [];
  }

  get name(): string {
    return this._name;
  }

  get tags(): string[] {
    return this._tags;
  }

  get stats(): [string, string][] {
    return this._stats;
  }

  get dataView(): DataView {
    return this._dataView;
  }
}

export {Detail};