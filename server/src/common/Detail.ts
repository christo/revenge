import {DataView} from "./DataView.js";

/**
 * Data interpretation output form. Tags represent top level "folksonomy". Stats relay generic summary information.
 * The {@link DataView} holds the data itself.
 */
class Detail {
  private readonly _classNames: string[];
  private readonly _stats: [string, string][];
  private readonly _name: string;
  private readonly _dataView: DataView;

  /**
   * Constructor with name, css class names and the contained view.
   * @param name
   * @param classNames to be applied on the whole view
   * @param dataView contents.
   */
  constructor(name: string, classNames: string[], dataView: DataView) {
    this._name = name;
    this._classNames = classNames;
    this._dataView = dataView;
    this._stats = [];
  }

  get name(): string {
    return this._name;
  }

  get classNames(): string[] {
    return this._classNames;
  }

  get stats(): [string, string][] {
    return this._stats;
  }

  get dataView(): DataView {
    return this._dataView;
  }
}

export {Detail};