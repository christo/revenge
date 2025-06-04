import {DataView} from "./DataView.js";
import {DetailConfig} from "./DetailConfig.js";

/**
 * Front end type that holds data conveniently for interpretation in an output format. Stats relay generic summary
 * information about the view as key-value pairs. The {@link DataView} holds the data itself.
 */
class Detail {
  private readonly _classNames: string[];
  private readonly _stats: [string, string][];
  private readonly _detailConfig: DetailConfig | undefined;
  private readonly _name: string;
  private readonly _dataView: DataView;

  /**
   * Constructor with name, css class names and the contained view.
   * @param name
   * @param classNames to be applied on the whole view
   * @param dataView contents.
   * @param detailConfig to configure how the view is rendered.
   */
  constructor(name: string, classNames: string[], dataView: DataView, detailConfig: DetailConfig | undefined) {
    this._name = name;
    this._classNames = classNames;
    this._dataView = dataView;
    this._detailConfig = detailConfig;
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

  get detailConfig(): DetailConfig | undefined{
    return this._detailConfig;
  }
}

export {Detail};