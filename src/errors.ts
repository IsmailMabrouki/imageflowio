export class ImageFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigValidationError extends ImageFlowError {}
export class PipelineError extends ImageFlowError {}
export class BackendLoadError extends ImageFlowError {}
export class InferenceError extends ImageFlowError {}
export class SaveError extends ImageFlowError {}
