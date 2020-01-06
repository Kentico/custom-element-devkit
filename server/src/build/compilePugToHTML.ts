import fs from 'fs';
import pug from 'pug';
import { CustomElementInformation } from './customElementInfo';
import { ICompilationArgs } from './ICompilationArgs';
import { IPugTemplateRenderArgs } from './IPugTemplateRenderArgs';

const safeRequire = (modulePath) => {
  try {
    /* eslint-disable */
    return require(modulePath);
    /* eslint-enable */
  }
  catch (e) {
    if (!(e instanceof Error && (e as any).code === 'MODULE_NOT_FOUND')) {
      // If module is not present, it's alright. It's optional
      throw e;
    }
    return null;
  }
};

export const getRenderArgs = (elementInfo: CustomElementInformation, buildArgs: ICompilationArgs, mockCustomElementApi: boolean = false): IPugTemplateRenderArgs => {
  const renderArgs: IPugTemplateRenderArgs = {
    customElementApiScriptSrc: mockCustomElementApi ? '/custom-elements/custom-element-api-mock/bundle.js' : 'https://app.kenticocloud.com/js-api/custom-element/v1/custom-element.min.js',
  };
  if (buildArgs.inlineJs) {
    const script = fs.readFileSync(elementInfo.scriptFilePath).toString();
    renderArgs.inlineScript = script;
  }
  else {
    renderArgs.scriptSrc = elementInfo.scriptSrc;
  }
  if (buildArgs.inlineStyles) {
    const stylesheet = fs.readFileSync(elementInfo.stylesheetFilePath).toString();
    renderArgs.inlineStylesheet = stylesheet;
  }
  else {
    renderArgs.stylesheetSrc = elementInfo.stylesheetSrc;
  }

  if (mockCustomElementApi) {
    const config = safeRequire(elementInfo.configPath);
    const initialValue = safeRequire(elementInfo.initialValuePath);

    if (config) {
      renderArgs.config = config;
    }
    if (initialValue) {
      renderArgs.initialValue = initialValue;
    }
  }

  return renderArgs;
};

export const compilePugToHTML = async (customElementsInformation: ReadonlyArray<CustomElementInformation>, buildArgs: ICompilationArgs) => {
  return customElementsInformation.reduce((compilationResults, elementInfo) => {
    try {
      const renderHTML = pug.compileFile(elementInfo.viewFilePath);
      const html = renderHTML(getRenderArgs(elementInfo, buildArgs));
      fs.writeFileSync(elementInfo.htmlFilePath, Buffer.from(html));
      compilationResults[elementInfo.name] = 'Success';
    }
    catch (e) {
      compilationResults[elementInfo.name] = {
        result: 'Failure!',
        error: e,
      };
    }
    return compilationResults;
  }, {});
};
