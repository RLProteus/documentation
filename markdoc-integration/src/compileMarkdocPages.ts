import fs from 'fs';
import path from 'path';
import { FileRenderer } from './FileRenderer';
import { GlobalVariableConfig, GlobalVariableConfigSchema } from './oldSchemas';
import yaml from 'js-yaml';

// Script -------------------------------------------------------------

const DOCS_CONTENT_DIR = path.resolve(__dirname, '../../content/docs');

// Load global variable config
const GLOBAL_VAR_CONFIG_PATH = path.resolve(__dirname, 'variables.config.yaml');
const GLOBAL_VARIABLE_CONFIG = GlobalVariableConfigSchema.parse(
    yaml.load(fs.readFileSync(GLOBAL_VAR_CONFIG_PATH, 'utf-8'))
);

// Compile all mdoc files to a corresponding HTML file
compileFiles(DOCS_CONTENT_DIR, GLOBAL_VARIABLE_CONFIG);

// Functions ----------------------------------------------------------

/**
 * For each mdoc file in the directory, build an html file with the same name.
 */
function compileFiles(dir: string, globalVariableConfig: GlobalVariableConfig) {
    const mdocFilePaths = getFiles(dir).filter((file) => file.endsWith('.mdoc'));
    mdocFilePaths.forEach((mdocFilePath) => {
        const htmlContent = renderMdocToStaticHtml(mdocFilePath, globalVariableConfig);
        const htmlPath = mdocFilePath.replace('.mdoc', '.html');
        fs.writeFileSync(htmlPath, htmlContent);
    });
}

function renderMdocToStaticHtml(mdocFilePath: string, globalVariableConfig: GlobalVariableConfig = {}) {
    const fileRenderer = new FileRenderer({
        path: mdocFilePath,
        config: globalVariableConfig
    });
    const shortFilePath = mdocFilePath.replace(DOCS_CONTENT_DIR, '');

    const html = `
    <!-- THIS FILE IS AUTOGENERATED. To update it, edit ${shortFilePath} in the content directory. -->
    <div id="chooser">${fileRenderer.chooser}</div>
    <div id="content" style="margin-top: -20px">${fileRenderer.content}</div>
    <style>
      pre {
        font-size: 0.85em;
      }

      .barkdoc__hidden {
        display: none;
      }
    </style>
    <script src="/barkdoc-client-renderer.js"></script>
    <script>
      const pageVarDefinitions = ${JSON.stringify(fileRenderer.pageVarDefinitions)};
      let pageVarValsById = ${JSON.stringify(fileRenderer.getPageDefaultValues())};
    </script>
    <script>
    const renderableTree = ${JSON.stringify(fileRenderer.renderableTree)};
    const contentDiv = document.getElementById('content');

    function handleValueChange(varName, newValue) {
      pageVarValsById[varName] = newValue;
      BarkdocClientRenderer(renderableTree, contentDiv, { variables: pageVarValsById });
    }
    </script>`;
    return html;
}

/**
 * Recursively get all filepaths in a directory.
 */
function getFiles(dir: string): string[] {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
        if (dirent.isDirectory()) {
            return getFiles(path.join(dir, dirent.name));
        }
        return path.join(dir, dirent.name);
    });
    return Array.prototype.concat(...files);
}
